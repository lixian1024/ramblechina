import { googleFixtureFetch } from './fixtures/google-provider';
/** Controlled provider replay of saved failures. NOT live product/Eval evidence. */
import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { POST } from '../src/app/api/trip-concierge/route';
import { findAmapPlace, routeBetween } from '../src/lib/travel/concierge-amap';
import { scheduleShanghaiMeals, shanghaiQualityIssues } from '../src/lib/travel/shanghai-quality';
import type { ConciergeEvent, DraftTrip, VerifiedDay, VerifiedStop, VerifiedTrip } from '../src/lib/travel/concierge-types';

process.env.TRIP_LLM_API_KEY = 'controlled-test-only';
process.env.TRIP_LLM_BASE_URL = 'https://model.example/compatible-mode/v1';
process.env.TRIP_LLM_MODEL = 'qwen-plus';
process.env.AMAP_WEB_SERVICE_KEY = 'controlled-test-only';
process.env.GOOGLE_MAPS_SERVER_API_KEY = 'controlled-test-only';
async function main() {
const fixtures: { modern: VerifiedTrip; three: VerifiedTrip } = JSON.parse(await readFile('scripts/fixtures/shanghai-prior-failures.json', 'utf8'));
const originalModern = fixtures.modern;
const originalThree = fixtures.three;
const evidence = process.env.T001_CONTROLLED_EVIDENCE;
const place = (id: string, name: string, lng: number, lat: number, pudong = false): NonNullable<VerifiedStop['place']> => ({
  id, name, point: { lng, lat }, adcode: pudong ? '310115' : '310101', citycode: '021', address: 'Controlled fixture', checkedAt: '2026-10-09T00:00:00Z',
});
const places = new Map<string, NonNullable<VerifiedStop['place']>>();
for (const plan of [originalModern, originalThree]) for (const day of plan.days) for (const stop of day.stops) if (stop.place) places.set(stop.search, stop.place);
places.set('武康大楼', place('TEST-WUKANG', '武康大楼', 121.438, 31.205));
places.set('上海中心大厦', place('TEST-TOWER', '上海中心大厦', 121.505, 31.233, true));
places.set('南京路步行街', place('TEST-NANJING', '南京路步行街', 121.486, 31.235));
const stop = (search: string, at: string, durationMinutes = 90) => ({
  name: search, search, nameEnglish: `Controlled architecture fixture ${search}`, at, durationMinutes,
  category: 'sight' as const, why: 'Controlled architecture reason; not a live researched recommendation.',
});
const repairedModern: DraftTrip = { title: 'Controlled modern repair', summary: 'Controlled fixture only', days: [{
  city: '上海', cityEnglish: 'Shanghai', title: 'Controlled Pudong cluster', note: 'Compare the modern skyline on one bank. Lunch 12:00–13:00 near Wukang Road. Dinner 18:00–19:00 in West Bund.',
  stops: [stop('陆家嘴中心绿地', '10:00'), stop('上海中心大厦', '14:00')],
}] };
const repairedThree: DraftTrip = { title: 'Controlled three-day repair', summary: 'Controlled fixture only', days: [
  { city: '上海', title: 'Controlled Old City cluster', note: 'Keep historic architecture near the waterfront together.', stops: [stop('上海豫园', '09:30', 120), stop('外滩', '16:00')] },
  { city: '上海', title: 'Controlled residential cluster', note: 'Follow residential architecture toward nearby lanes.', stops: [stop('武康大楼', '09:00'), stop('新天地', '16:00')] },
  repairedModern.days[0],
] };
// Resolve aliases from the saved actual response to fixture places, not invented runtime results.
for (const [query, matcher] of [['陆家嘴中心绿地', /陆家嘴/], ['上海豫园', /豫园/], ['外滩', /^外滩$/], ['新天地', /新天地/]] as const) {
  const found = [...places.values()].find(p => matcher.test(p.name));
  assert(found, query); places.set(query, found);
}
let modelSequence: unknown[] = [], draftCalls = 0, routeFailure = false, ferryWalking = false;
const feedback: string[][] = [];
const routePaths: string[] = [];
globalThis.fetch = googleFixtureFetch(async (input, init) => {
  const url = new URL(String(input));
  if (url.pathname.endsWith('/chat/completions')) {
    const body = JSON.parse(String(init?.body));
    if (body.messages[0].content.startsWith('Classify')) return Response.json({ choices: [{ message: { content: '{"intent":"route-concierge"}' } }] });
    const data = JSON.parse(body.messages[1].content);
    if (data.validationFeedback) feedback.push(data.validationFeedback.issues);
    draftCalls++;
    return Response.json({ choices: [{ message: { content: JSON.stringify(modelSequence.shift()) } }] });
  }
  if (url.pathname.endsWith('/api/v1/services/aigc/text-generation/generation')) return Response.json({ output: {
    choices: [{ message: { content: 'Controlled source fixture only [1].' } }],
    search_info: { search_results: [{ title: 'Controlled provider fixture, not live research', url: 'https://example.invalid/controlled-source' }] },
  } });
  if (url.pathname.endsWith('/v5/place/text')) {
    const query = url.searchParams.get('keywords') || '';
    const p = places.get(query);
    const pois = p ? [{ id: p.id, name: p.name, location: `${p.point.lng},${p.point.lat}`, adcode: p.adcode, citycode: p.citycode, type: '风景名胜;风景名胜;景点' }] : [];
    if (query === '武康大楼') pois.unshift({ ...pois[0], id: 'TEST-MANHOLE', name: '武康大楼-井盖(打卡点)' });
    return Response.json({ status: '1', pois });
  }
  if (url.pathname.includes('/direction/')) {
    routePaths.push(url.pathname);
    if (routeFailure) throw new Error('Injected route outage');
    const option = { distance: '1200', cost: { duration: '1200' }, steps: ferryWalking ? [{ walk_type: '30', instruction: '进入轮渡' }] : [] };
    return Response.json({ status: '1', route: url.pathname.includes('/transit/') ? { transits: [option] } : { paths: [option] } });
  }
  throw new Error(`Unexpected controlled provider path: ${url.pathname}`);
});

async function ask(id: string, text: string, drafts: unknown[]) {
  modelSequence = drafts; draftCalls = 0; feedback.length = 0;
  const payload = { locale: 'en', messages: [{ role: 'user', text }] };
  const response = await POST(new Request('http://controlled.invalid/api/trip-concierge', { method: 'POST', body: JSON.stringify(payload) }));
  const body = await response.text();
  if (evidence) {
    await mkdir(evidence, { recursive: true });
    await writeFile(`${evidence}/${id}-controlled-request.json`, JSON.stringify(payload, null, 2));
    await writeFile(`${evidence}/${id}-controlled-response.ndjson`, body);
  }
  return body.trim().split('\n').map(line => JSON.parse(line) as ConciergeEvent);
}
function result(events: ConciergeEvent[]) {
  const event = events.find(e => e.type === 'result');
  assert(event?.type === 'result', JSON.stringify(events.filter(e => e.type === 'error')));
  return event.plan;
}
function disjointMeals(day: VerifiedDay) {
  assert.equal(day.meals?.length, 2);
  for (const meal of day.meals!) {
    assert(day.stops.some(stop => stop.id === meal.nearStopId));
    assert.equal(meal.status, 'planning');
    const minute = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
    for (const [index, stop] of day.stops.entries()) {
      if (meal.foodStopId === stop.id) continue;
      const start = minute(stop.scheduledAt!);
      assert(start >= minute(meal.end) || start + stop.durationMinutes <= minute(meal.start), 'Meal overlaps a visit');
      const prior = day.stops[index - 1];
      const leg = day.legs.find(l => l.to === stop.id && (!prior || l.from === prior.id));
      if (leg) assert(start - (leg.minutes ?? 45) - 10 >= minute(meal.end) || start <= minute(meal.start), 'Meal overlaps incoming travel');
    }
  }
}
const modernBrief = 'One day in Shanghai. I only care about modern architecture. No museums, no theme parks.';
const threeBrief = 'First time in Shanghai, 3 days, I love food and architecture.';
const modern = result(await ask('modern-repair', modernBrief, [originalModern, repairedModern]));
assert.equal(draftCalls, 2, 'Actual API must repair the rejected model draft');
assert(feedback[0].some(issue => /modern-architecture-only/.test(issue)));
assert(feedback[0].some(issue => /compact neighbourhood/.test(issue)));
assert(modern.days[0].stops.every(s => s.place?.adcode === '310115'));
assert(!modern.days[0].note?.includes('Wukang') && !modern.days[0].note?.includes('West Bund'), 'Stale meal areas must be removed');
disjointMeals(modern.days[0]);
assert.equal((await findAmapPlace('武康大楼', '上海'))?.id, 'TEST-WUKANG', 'A manhole must not outrank the requested building');

const three = result(await ask('three-day-repair', threeBrief, [originalThree, repairedThree]));
assert.equal(draftCalls, 2);
assert(feedback[0].some(issue => /transport, not/.test(issue)));
assert(feedback[0].some(issue => /one side of the Huangpu/.test(issue)));
assert(feedback[0].some(issue => /no confirmed map location/.test(issue)));
assert.equal(three.days.length, 3);
three.days.forEach(disjointMeals);
assert(three.days.every(d => d.checks.some(c => /opening hours are unverified/.test(c))));
assert(three.days.flatMap(d => d.stops).every(s => !s.place?.openingHours));
const failed = await ask('unrepairable-modern', modernBrief, [originalModern, originalModern]);
assert.equal(draftCalls, 2, 'Repair must stop after one retry');
assert(failed.some(e => e.type === 'error'));
assert(!failed.some(e => e.type === 'result'), 'Do not emit an invalid plan as success');

// Regression for the actual UI's 18:50 visit against an 18:00–19:00 dinner window.
const dinnerDay = structuredClone(three.days[0]);
dinnerDay.stops[1] = { ...dinnerDay.stops[1], ...stop('南京路步行街', '18:50', 60), place: places.get('南京路步行街') };
scheduleShanghaiMeals(dinnerDay, false);
disjointMeals(dinnerDay);
assert(dinnerDay.stops[1].scheduledAt! >= '19:00');
const firstAfternoon = structuredClone(modern.days[0]);
firstAfternoon.stops = [firstAfternoon.stops[1]]; firstAfternoon.legs = [];
scheduleShanghaiMeals(firstAfternoon, false);
assert.equal(firstAfternoon.meals![0].nearStopId, firstAfternoon.stops[0].id);
const restaurantDay = structuredClone(three.days[0]);
restaurantDay.stops[0].category = 'food'; restaurantDay.stops[0].at = '12:00'; restaurantDay.stops[0].durationMinutes = 60;
scheduleShanghaiMeals(restaurantDay, false);
assert.equal(restaurantDay.meals![0].foodStopId, restaurantDay.stops[0].id, 'A lunch restaurant visit should serve as the meal, not a second overlapping break');
disjointMeals(restaurantDay);
const excludedMuseum = structuredClone(modern);
excludedMuseum.days[0].stops[0].name = 'Modern architecture museum';
assert(shanghaiQualityIssues(excludedMuseum, [{ role: 'user', text: modernBrief }], null).some(i => /violates no museums/.test(i)));
const unrelated = structuredClone(modern);
unrelated.days[0].stops[0] = { ...unrelated.days[0].stops[0], name: 'Zoo', search: 'Zoo', nameEnglish: 'Zoo', nameChinese: 'Zoo', place: { ...unrelated.days[0].stops[0].place!, name: 'Zoo' }, why: 'Popular with tourists' };
assert(shanghaiQualityIssues(unrelated, [{ role: 'user', text: modernBrief }], null).some(i => /no modern-building or skyline rationale/.test(i)));

const crossBankFrom = place('TEST-BANK-WEST', 'Controlled west bank', 121.492, 31.234);
const crossBankTo = place('TEST-BANK-EAST', 'Controlled east bank', 121.506, 31.238, true);
routePaths.length = 0;
assert.equal((await routeBetween(crossBankFrom, crossBankTo, false))?.mode, 'transit');
assert(!routePaths.some(p => p.endsWith('/walking')), 'Close cross-bank coordinates must not imply walking');
ferryWalking = true;
assert.equal((await routeBetween(place('TEST-FERRY-A', 'A', 121.44, 31.2), place('TEST-FERRY-B', 'B', 121.443, 31.2), false))?.mode, 'transit', 'Ferry steps returned by walking endpoint need a transport lookup');
routeFailure = true;
assert.equal(await routeBetween(place('TEST-OUTAGE-A', 'A', 121.42, 31.19), place('TEST-OUTAGE-B', 'B', 121.43, 31.19), false), undefined);
places.set('故障测试甲', place('TEST-API-OUTAGE-A', '故障测试甲', 121.47, 31.2));
places.set('故障测试乙', place('TEST-API-OUTAGE-B', '故障测试乙', 121.49, 31.22));
const outagePlan = result(await ask('route-outage', 'Plan one relaxed day in Shanghai.', [{
  title: 'Controlled route outage', summary: 'Controlled fixture only', days: [{
    city: '上海', title: 'Controlled missing route', stops: [stop('故障测试甲', '10:00'), stop('故障测试乙', '14:00')],
  }],
}]));
assert.equal(outagePlan.days[0].legs[0].mode, 'unverified');
assert.equal(outagePlan.days[0].legs[0].minutes, undefined);
assert(outagePlan.days[0].checks.some(c => /planning allowance, not a route estimate/.test(c)));
disjointMeals(outagePlan.days[0]);
const unknownTravel = structuredClone(dinnerDay);
unknownTravel.legs = unknownTravel.legs.map(l => ({ from: l.from, to: l.to, mode: 'unverified', note: 'Injected missing route' }));
scheduleShanghaiMeals(unknownTravel, false);
disjointMeals(unknownTravel);
assert(unknownTravel.checks.some(c => /planning allowance, not a route estimate/.test(c)));
assert(unknownTravel.legs.every(l => l.minutes === undefined), 'Missing provider data cannot become fabricated route duration');
const blockedBooking = structuredClone(dinnerDay);
blockedBooking.stops[1].booked = true; blockedBooking.stops[1].at = '18:50';
scheduleShanghaiMeals(blockedBooking, false);
assert(shanghaiQualityIssues({ ...three, days: [blockedBooking] }, [{ role: 'user', text: 'Plan one relaxed day in Shanghai.' }], null).some(i => /overlaps dinner/.test(i)), 'A fixed booking conflict cannot silently pass');
console.log('PASS: controlled production API replays repair historic/modern, geography, transport-stop and unmatched-POI failures; meal/visit/travel consistency, building match, mixed ferry route, outage, booked conflict and bounded failure regressions. NOT live product/Eval evidence.');
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
