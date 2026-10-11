/** Controlled production API regressions. Fixtures are not live travel facts. */
import assert from 'node:assert/strict';
import { POST } from '../src/app/api/trip-concierge/route';
import { refreshTrip } from '../src/lib/travel/concierge';
import { tripRequirements, tripDate } from '../src/lib/travel/trip-requirements';
import type { ConciergeEvent, DraftTrip, TripMessage } from '../src/lib/travel/concierge-types';

process.env.TRIP_LLM_API_KEY = 'controlled-only';
process.env.TRIP_LLM_BASE_URL = 'https://model.example/compatible-mode/v1';
process.env.TRIP_LLM_MODEL = 'qwen-plus';
process.env.GOOGLE_MAPS_SERVER_API_KEY = 'controlled-only';
const brief = "10 days, chongqing, xi'an, chengdu, jiuzhaigou, 2 people, food & culture travel. start from 20 oct.";
const message = (text: string): TripMessage => ({ role: 'user', text });
const now = new Date('2026-10-11T00:00:00Z');
assert.deepEqual(tripRequirements([message(brief)], null, now), { days: 10, startDate: '2026-10-20' });
assert.equal(tripRequirements([message('Two easy days in Shanghai.')], null, now).days, 2);
assert.equal(tripRequirements([message('上海与杭州两天')], null, now).days, 2);
assert.equal(tripRequirements([message('10days in China')], null, now).days, 10);
assert.equal(tripRequirements([message('A 10-day China trip')], null, now).days, 10);
assert.throws(() => tripRequirements([message('十一天中国游')], null, now), /1–10/);
assert.deepEqual(tripRequirements([message(brief), message('Make day 2 easier; keep my 10:00 ticket.')], null, now), { days: 10, startDate: '2026-10-20' });
assert.equal(tripRequirements([message(brief), { role: 'assistant', text: 'Here are 8 days.' }], null, now).days, 10);
assert.deepEqual(tripRequirements([message(brief), message('Change to 9 days, starting Oct 21, 2026.')], null, now), { days: 9, startDate: '2026-10-21' });
assert.equal(tripRequirements([message('3 days, starting December 31, 2026.')], null, now).startDate, '2026-12-31');
assert.equal(tripRequirements([message('3 days. start from 2 oct.')], null, now).startDate, '2027-10-02');
assert.throws(() => tripRequirements([message('Start on 2026-02-30, 3 days.')], null, now), /invalid/);
assert.throws(() => tripRequirements([message('11 days in China')], null, now), /1–10/);

const full: DraftTrip = {
  title: 'Controlled calendar fixture', summary: 'Not a real recommendation.', startDate: '2026-10-20',
  days: Array.from({ length: 10 }, (_, i) => ({
    city: ['重庆', '重庆', '重庆', '西安', '西安', '成都', '成都', '成都', '九寨沟', '九寨沟'][i],
    title: `Controlled day ${i + 1}`, date: tripDate('2026-10-20', i),
    stops: [{ name: `Controlled unknown place ${i}`, search: `受控地点${i}`, durationMinutes: 60, at: '14:00' }],
  })),
};
for (const i of [3, 8]) Object.assign(full.days[i], { kind: 'transfer', stops: [], intercityMode: 'rail', intercityNote: 'Confirm services; no timetable evidence.', note: 'Dedicated transfer day; check service times and accommodation before booking.' });
let draftCalls = 0, researchCalls = 0, mapsCalls = 0;
let drafts: DraftTrip[] = [];
let expectedDays = 10;
const feedback: string[][] = [];
globalThis.fetch = async (input, init) => {
  const url = new URL(String(input));
  if (url.hostname === 'model.example') {
    const body = JSON.parse(String(init?.body));
    if (url.pathname.endsWith('/generation')) {
      researchCalls++;
      return Response.json({ output: { choices: [{ message: { content: 'Controlled source fixture [1].' } }], search_info: { search_results: [{ title: 'Controlled source', url: 'https://example.invalid/calendar' }] } } });
    }
    if (body.messages[0].content.startsWith('Classify')) return Response.json({ choices: [{ message: { content: '{"intent":"route-concierge"}' } }] });
    const data = JSON.parse(body.messages[1].content);
    assert.equal(data.requiredCalendar.days, expectedDays);
    if (data.validationFeedback) feedback.push(data.validationFeedback.issues);
    return Response.json({ choices: [{ message: { content: JSON.stringify(drafts[Math.min(draftCalls++, drafts.length - 1)]) } }] });
  }
  if (url.hostname === 'places.googleapis.com') { mapsCalls++; return Response.json({ places: [] }); }
  throw new Error(`Unexpected controlled call ${url.hostname}`);
};
async function ask(outputs: DraftTrip[], text = brief, previous: unknown = null, locale = 'en') {
  drafts = outputs; draftCalls = 0; mapsCalls = 0; researchCalls = 0; feedback.length = 0;
  const before = JSON.stringify(previous);
  const response = await POST(new Request('http://controlled.invalid/api/trip-concierge', { method: 'POST', body: JSON.stringify({ locale, messages: [message(text)], currentPlan: previous }) }));
  const events = (await response.text()).trim().split('\n').map(line => JSON.parse(line) as ConciergeEvent);
  assert.equal(JSON.stringify(previous), before, 'Failure or repair cannot mutate the previous plan');
  return events;
}
const result = (events: ConciergeEvent[]) => {
  const event = events.find(e => e.type === 'result');
  assert(event?.type === 'result', JSON.stringify(events.filter(e => e.type === 'error')));
  return event.plan;
};
const noResult = (events: ConciergeEvent[]) => {
  assert(!events.some(e => e.type === 'result'), 'Do not publish a shortened/incomplete trip');
  assert(events.some(e => e.type === 'error'));
};
async function main() {
  const short = { ...full, days: full.days.slice(0, 8) };
  const repaired = result(await ask([short, full]));
  assert.equal(repaired.days.length, 10);
  assert.equal(draftCalls, 2, 'Exactly one model repair');
  assert.equal(researchCalls, 1, 'Reuse the same research for repair');
  assert(feedback[0].some(issue => /exactly 10.*received 8/.test(issue)));
  assert.deepEqual(repaired.days.map(d => d.date), Array.from({ length: 10 }, (_, i) => tripDate('2026-10-20', i)));
  assert.deepEqual(repaired.days[3].stops, [], 'Retain transfer days without fake sightseeing');
  assert(repaired.days[3].checks.some(c => /services.*travel time/i.test(c)));
  assert(repaired.days[0].checks.some(c => /map location|place search/i.test(c)), 'Missing place data remains uncertain');
  assert.equal(repaired.days[0].stops[0].place, undefined);
  assert.equal(result(await ask([full])).days.length, 10);
  assert.equal(draftCalls, 1, 'Complete calendar must not incur a repair');
  const restored = await refreshTrip(repaired, 'en');
  assert.equal(restored.days.length, 10, 'Restore must retain transfer dates');
  assert.equal(restored.days[3].kind, 'transfer');
  noResult(await ask([short], brief, repaired));
  assert.equal(draftCalls, 2);
  assert.equal(mapsCalls, 0, 'Reject short drafts before place/route costs');
  const wrongDates = structuredClone(full); wrongDates.startDate = '2026-10-21'; wrongDates.days[4].date = '2026-10-20';
  assert.equal(result(await ask([wrongDates, full])).days.at(-1)?.date, '2026-10-29');
  assert(feedback[0].some(issue => /Day 5 must be dated 2026-10-24/.test(issue)));
  noResult(await ask([wrongDates]));
  const empty = structuredClone(full); empty.days[2].stops = [];
  noResult(await ask([empty]));
  assert(feedback[0].some(issue => /Day 3 is empty/.test(issue)));
  const rest = structuredClone(full); Object.assign(rest.days[2], { kind: 'rest', stops: [], note: 'Dedicated rest day; meals and any optional activities to confirm locally.' });
  assert.equal(result(await ask([rest])).days[2].kind, 'rest');
  const missingDate = structuredClone(full); missingDate.days[2].date = undefined;
  assert.equal(result(await ask([missingDate])).days[2].date, '2026-10-22', 'Derive an omitted date from the known start without removing the day');
  const chineseFailure = await ask([short], brief, repaired, 'zh');
  noResult(chineseFailure);
  assert(chineseFailure.some(e => e.type === 'error' && /天数或日期.*已有行程未改变/.test(e.message)));
  const long = { ...full, days: [...full.days, full.days[9]] };
  noResult(await ask([long]));
  // A previously shortened 8-day plan must be repaired to the explicit new 10-day request.
  assert.equal(result(await ask([full], brief, short)).days.length, 10);
  assert.equal(result(await ask([full], 'Make day 2 easier.', repaired)).days.length, 10);
  expectedDays = 9;
  const nine = { ...full, days: full.days.slice(0, 9) };
  assert.equal(result(await ask([nine], 'Change to 9 days.', repaired)).days.length, 9);
  noResult(await ask([full], '11 days in China'));
  assert.equal(draftCalls, 0); assert.equal(researchCalls, 0);
  console.log('PASS: exact day count, consecutive dates, one repair, persistent failure, prior-plan preservation, transfer-day restore and missing-data disclosure through production POST. Controlled fixtures only.');
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
