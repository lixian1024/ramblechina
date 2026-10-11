/** Execute the actual /api/trip-concierge flow. No canned AI itinerary or model mock. */
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { ConciergeEvent, TripMessage, VerifiedDay, VerifiedTrip } from '../src/lib/travel/concierge-types';

async function main() {
const args = process.argv.slice(2);
const task = args[args.indexOf('--task') + 1];
assert(['T-001', 'T-002', 'T-003', 'T-004'].includes(task), 'Supply --task T-001..T-004');
const origin = process.env.TEST_ORIGIN || 'http://127.0.0.1:3001';
const run = path.resolve('.loop/product-evals', `${new Date().toISOString().replace(/[:.]/g, '-')}-${task}`);
const first: TripMessage = { role: 'user', text: 'First time in Shanghai. 3 days. I love food and architecture.' };
const results: { id: string; status: string; evidence: string; error?: string }[] = [];
await mkdir(run, { recursive: true });

async function request(id: string, messages: TripMessage[], currentPlan: VerifiedTrip | null = null) {
  const payload = { locale: 'en', messages, currentPlan };
  await writeFile(path.join(run, `${id}-request.json`), JSON.stringify(payload, null, 2));
  const response = await fetch(`${origin}/api/trip-concierge`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    signal: AbortSignal.timeout(240_000),
  });
  const body = await response.text();
  await writeFile(path.join(run, `${id}-response.ndjson`), body);
  assert(response.ok, `${id}: API status ${response.status}`);
  const events = body.trim().split('\n').map(line => JSON.parse(line) as ConciergeEvent);
  const error = events.find(event => event.type === 'error');
  assert(!error, `${id}: ${error?.type === 'error' ? error.message : 'API error'}`);
  const result = events.find(event => event.type === 'result');
  assert(result?.type === 'result', `${id}: no actual itinerary result`);
  await writeFile(path.join(run, `${id}-plan.json`), JSON.stringify(result.plan, null, 2));
  return result;
}

const uncertain = /unverified|not (?:yet )?(?:verified|checked|confirmed)|needs? (?:a live check|confirmation)|confirm|recheck|check (?:current|opening|the|with)/i;
const stopText = (stop: VerifiedDay['stops'][number]) => [stop.name, stop.nameEnglish, stop.nameChinese, stop.search, stop.place?.name].join(' ');
const museum = (stop: VerifiedDay['stops'][number]) => /museum|博物馆/i.test(stopText(stop));
const food = (stop: VerifiedDay['stops'][number]) => stop.category === 'food' || /restaurant|dining|dumpling|餐厅|酒楼|馒头|小笼/i.test(stopText(stop));
const architecture = (stop: VerifiedDay['stops'][number]) => /bund|外滩|architecture|建筑|concession|武康|思南|天际线|skyline|tower|大厦|中心|陆家嘴|l[uù]ji[aā]zu[iǐ]|wukang|sip[ia]n|lane|historical street/i.test([stopText(stop), stop.why, stop.description].join(' '));
const modernArchitecture = (stop: VerifiedDay['stops'][number]) => architecture(stop)
  && !/wukang|武康|yuyuan|yu garden|豫园|xintiandi|新天地|concession|法租界|historic residential|历史住宅/i.test(stopText(stop))
  && /modern|contemporary|skyline|skyscraper|supertall|现代|当代|天际线/i.test([stopText(stop), stop.why, stop.description].join(' '));
const minutes = (value: string | undefined) => {
  assert(value && /^([01]\d|2[0-3]):[0-5]\d$/.test(value), 'Stop lacks a valid suggested time');
  const [hour, minute] = value.split(':').map(Number); return hour * 60 + minute;
};
function basics(plan: VerifiedTrip, count: number) {
  assert.equal(plan.days.length, count, 'Requested trip length must be respected');
  assert(plan.research?.sources.length, 'Actual sourced research is required');
  for (const day of plan.days) {
    assert(/上海|shanghai/i.test(`${day.city} ${day.cityEnglish}`), 'Unexpected city in Shanghai itinerary');
    assert(day.stops.length >= 1 && day.stops.length <= 4, 'One to four primary stops per day');
    assert(day.stops.some(stop => stop.why?.trim()), 'Each day needs an arrangement reason');
    let finish = 0;
    for (const stop of day.stops) {
      if (stop.place) {
        assert(stop.place.adcode.startsWith('31'), 'Matched stop is outside Shanghai');
        assert(stop.place.point.lat >= 30.6 && stop.place.point.lat <= 31.9 && stop.place.point.lng >= 120.8 && stop.place.point.lng <= 122.1, 'Shanghai coordinate guard');
      } else assert(day.checks.some(check => uncertain.test(check)), 'Unresolved geography must be disclosed');
      const opening = stop.place?.openingHours;
      if (!opening) assert(uncertain.test([stop.visitTip, ...day.checks, ...plan.checks].join(' ')) && /open|hours|营业|开放/i.test([stop.visitTip, ...day.checks, ...plan.checks].join(' ')), 'Missing opening hours must have an explicit confirmation instruction');
      const start = minutes(stop.scheduledAt || stop.at);
      assert(start >= finish, 'Stops overlap');
      finish = start + stop.durationMinutes;
      assert(finish <= 21 * 60, 'Day runs past 21:00');
    }
    for (const leg of day.legs) {
      if (leg.mode === 'unverified') assert(leg.minutes === undefined && uncertain.test(leg.note || day.checks.join(' ')), 'Unknown route cannot invent travel minutes');
    }
  }
}
function meals(plan: VerifiedTrip) {
  for (const day of plan.days) {
    for (const [label, min, max] of [['lunch', 11 * 60, 14 * 60 + 30], ['dinner', 17 * 60, 20 * 60 + 30]] as const) {
      const scheduled = day.stops.some(stop => food(stop) && minutes(stop.scheduledAt || stop.at) >= min && minutes(stop.scheduledAt || stop.at) <= max);
      // A flexible regional meal break is acceptable, but it must include a time window.
      const note = day.note || '';
      const window = new RegExp(`${label}[^.\\n]*\\b(?:${label === 'lunch' ? '11|12|13|14' : '17|18|19|20'}):[0-5]\\d`, 'i');
      assert(scheduled || window.test(note), `${day.title}: ${label} needs a regional stop or explicit meal window`);
      const range = note.match(new RegExp(`${label}[^.\\n]*?\\b(\\d{2}:[0-5]\\d)\\s*[–—-]\\s*(\\d{2}:[0-5]\\d)`, 'i'));
      if (range) {
        const begin = minutes(range[1]), end = minutes(range[2]);
        assert(end > begin, `${label}: reversed meal window`);
        for (const stop of day.stops.filter(stop => !food(stop))) {
          const start = minutes(stop.scheduledAt || stop.at);
          assert(start >= end || start + stop.durationMinutes <= begin, `${day.title}: ${label} overlaps ${stop.name}`);
        }
      }
    }
    assert(day.stops.some(architecture), `${day.title}: architecture preference has no visible evidence`);
  }
}
async function check(id: string, work: () => Promise<void>) {
  try { await work(); results.push({ id, status: 'pass', evidence: run }); }
  catch (error) { results.push({ id, status: 'fail', evidence: run, error: error instanceof Error ? error.message : String(error) }); }
}
let baseline: Awaited<ReturnType<typeof request>> | undefined;
async function original() { return baseline ||= await request('baseline', [first]); }

if (task === 'T-001') {
  await check('E-001', async () => { const { plan } = await original(); basics(plan, 3); meals(plan); });
  await check('E-002', async () => {
    const { plan } = await request('E-002', [{ role: 'user', text: 'One day in Shanghai. I only care about modern architecture. No museums, no theme parks.' }]);
    basics(plan, 1);
    assert(plan.days[0].stops.every(stop => !museum(stop) && !/disney|theme park|迪士尼|主题公园/i.test(stopText(stop)) && modernArchitecture(stop)), 'Excluded or unrelated major stop in modern-architecture-only request');
  });
  await check('E-014', async () => { basics((await request('E-014', [{ role: 'user', text: 'Plan one relaxed day in Shanghai.' }])).plan, 1); });
} else if (task === 'T-002') {
  await check('E-003', async () => {
    const before = await original();
    const after = await request('E-003', [first, { role: 'assistant', text: before.reply }, { role: 'user', text: 'No museums on day 2.' }], before.plan);
    basics(after.plan, 3); meals(after.plan);
    assert(!after.plan.days[1].stops.some(museum), 'Day 2 still contains a museum');
    for (const index of [0, 2]) assert.deepEqual(after.plan.days[index], before.plan.days[index], 'Unaffected day changed');
    assert(/day 2|second day/i.test(after.reply) && /remov|replac|chang|no museum/i.test(after.reply), 'Missing specific edit summary');
  });
  await check('E-004', async () => {
    const before = await original();
    assert(before.plan.days[0].stops.some(stop => /yu garden|豫园/i.test(stopText(stop))), 'Original lacks Yu Garden; capture a valid precondition');
    const { plan } = await request('E-004', [first, { role: 'user', text: 'Remove Yu Garden from day 1 and make the day less rushed.' }], before.plan);
    basics(plan, 3);
    assert(!plan.days[0].stops.some(stop => /yu garden|豫园/i.test(stopText(stop))));
    assert(plan.days[0].stops.length < before.plan.days[0].stops.length, 'Removed stop was silently filled back in');
    for (const index of [1, 2]) assert.deepEqual(plan.days[index], before.plan.days[index]);
  });
  await check('E-009', async () => {
    const before = await original();
    const { plan } = await request('E-009', [first, { role: 'user', text: 'Replace the afternoon on day 2.' }], before.plan);
    basics(plan, 3);
    assert(plan.days[1].stops.some(stop => architecture(stop) && minutes(stop.scheduledAt || stop.at) >= 12 * 60), 'Architecture preference lost in replacement afternoon');
    for (const index of [0, 2]) assert.deepEqual(plan.days[index], before.plan.days[index]);
  });
} else if (task === 'T-003') {
  await check('E-001', async () => { const { plan } = await original(); basics(plan, 3); meals(plan); });
  await check('E-003', async () => {
    const before = await original();
    const { plan } = await request('E-003', [first, { role: 'user', text: 'No museums on day 2.' }], before.plan);
    basics(plan, 3);
    assert(!plan.days[1].stops.some(museum));
    for (const index of [0, 2]) assert.deepEqual(plan.days[index], before.plan.days[index]);
    for (const day of plan.days) assert(day.legs.length >= day.stops.length - 1, 'Missing adjacent transport explanation');
  });
  await check('E-005', async () => {
    const { plan } = await request('E-005', [{ role: 'user', text: 'Plan Monday in Shanghai and include a museum if possible.' }]);
    basics(plan, 1);
    for (const stop of plan.days[0].stops.filter(museum)) assert(/monday|unverified|confirm/i.test([stop.visitTip, stop.place?.openingHours, ...plan.days[0].checks].join(' ')), 'Museum opening status is not checked/disclosed for Monday');
  });
} else {
  // Fault-injection behavior must use the actual fact resolver, never an invented live output.
  const modulePath = '../src/lib/travel/core-facts';
  await check('E-007', async () => {
    const mod = await import(modulePath);
    const fact = await mod.resolveOpeningFact([{ sourceUrl: 'https://example.org/test-fixture', load: async () => { throw Error('Injected timeout'); } }]);
    assert.equal(fact.status, 'unverified'); assert(!fact.value); assert(fact.nextAction);
  });
  await check('E-008', async () => {
    const mod = await import(modulePath);
    const fact = await mod.resolveOpeningFact([
      { sourceUrl: 'https://example.org/test-fixture-a', load: async () => ({ state: 'open', hours: '09:00–17:00' }) },
      { sourceUrl: 'https://example.org/test-fixture-b', load: async () => ({ state: 'closed' }) },
    ]);
    assert.equal(fact.status, 'conflict'); assert(!fact.value); assert(fact.nextAction);
  });
}
await writeFile(path.join(run, 'report.json'), JSON.stringify({ task, testedAt: new Date().toISOString(), origin, mode: task === 'T-004' ? 'controlled-fault-injection' : 'live-app-api', results, limits: 'Deterministic assertions are partial checks. Geography, suitability, facts and UI require independent review; no human product hypothesis is validated.' }, null, 2));
for (const result of results) console.log(`${result.id}: ${result.status}${result.error ? ` — ${result.error}` : ''}`);
console.log(`Evidence: ${run}`);
process.exitCode = results.every(result => result.status === 'pass') ? 0 : 1;

}
main().catch(error => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
