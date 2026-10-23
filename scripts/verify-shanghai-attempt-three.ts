import {admittedTripPOST as POST} from './fixtures/admitted-travel-routes';
import { googleFixtureFetch } from './fixtures/google-provider';
/** Controlled production POST + component rendering. NOT live API, browser or Eval evidence. */
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { shanghaiQualityIssues, scheduleShanghaiMeals } from '../src/lib/travel/shanghai-quality';
import type { ConciergeEvent, DraftTrip, VerifiedTrip } from '../src/lib/travel/concierge-types';

// Synthetic credentials and provider data only; this script never reads .env.local.
process.env.TRIP_LLM_API_KEY = 'controlled-test-only';
process.env.TRIP_LLM_BASE_URL = 'https://model.example/compatible-mode/v1';
process.env.TRIP_LLM_MODEL = 'qwen-plus';
process.env.AMAP_WEB_SERVICE_KEY = 'controlled-test-only';
process.env.GOOGLE_MAPS_SERVER_API_KEY = 'controlled-test-only';
const relaxedBrief = 'Plan one relaxed day in Shanghai.';
const threeBrief = 'First time in Shanghai, 3 days, I love food and architecture.';
const modernBrief = 'One day in Shanghai. I only care about modern architecture. No museums, no theme parks.';
const points: Record<string, [number, number, string]> = {
  '豫园': [121.492, 31.228, '310101'], '外滩': [121.492, 31.237, '310101'],
  '武康大楼': [121.438, 31.205, '310104'], '思南公馆': [121.467, 31.217, '310101'],
  '陆家嘴中心绿地': [121.506, 31.238, '310115'], '上海中心大厦': [121.505, 31.233, '310115'],
};
const stop = (name: string, at: string, durationMinutes = 90) => ({
  name, search: name, nameChinese: name, nameEnglish: `Controlled modern architecture ${name}`,
  at, durationMinutes, category: 'sight' as const,
  why: 'Controlled architecture preference, not a researched recommendation.',
  description: 'Controlled architecture description. The promenade is open 24 hours.',
  visitTip: 'Security checks can be rigorous; bring your physical passport. Entry is open without reservation.',
});
const relaxed: DraftTrip = { title: 'Controlled relaxed replay', summary: 'Synthetic test only', days: [{
  city: '上海', cityEnglish: 'Shanghai', title: 'Controlled Old City',
  note: 'Compare architecture within one area. Lunch 12:00–13:00 near the garden: try controlled dumplings. Dinner 18:00–19:00 near the waterfront: consider controlled noodles.',
  stops: [stop('豫园', '19:45', 180), stop('外滩', '21:00', 180)],
}] };
const three: DraftTrip = { title: 'Controlled food replay', summary: 'Synthetic test only', days: [
  { ...relaxed.days[0], stops: [stop('豫园', '09:30'), stop('外滩', '14:00')] },
  { city: '上海', cityEnglish: 'Shanghai', title: 'Controlled residential area',
    note: 'Compare nearby residential architecture. Lunch 12:00–13:00 near 武康大楼: sample controlled buns. Dinner 18:00–19:00 near 思南公馆 for controlled Benbang dishes.',
    stops: [stop('武康大楼', '09:30'), stop('思南公馆', '14:00')] },
  { city: '上海', cityEnglish: 'Shanghai', title: 'Controlled modern skyline',
    note: 'Compare modern buildings in Pudong. Lunch 12:00–13:00 near the park: choose controlled noodle dishes. Dinner 18:00–19:00 near the tower: enjoy controlled cuisine.',
    stops: [stop('陆家嘴中心绿地', '09:30'), stop('上海中心大厦', '14:00')] },
] };
let draft: DraftTrip = relaxed, draftCalls = 0, searchMissing = false, wrongCity = false, routeMissing = false;
const feedback: string[][] = [];
globalThis.fetch = googleFixtureFetch(async (input, init) => {
  const url = new URL(String(input));
  if (url.pathname.endsWith('/chat/completions')) {
    const body = JSON.parse(String(init?.body));
    if (body.messages[0].content.startsWith('Classify')) return Response.json({ choices: [{ message: { content: '{"intent":"route-concierge"}' } }] });
    draftCalls++;
    const data = JSON.parse(body.messages[1].content);
    if (data.validationFeedback) feedback.push(data.validationFeedback.issues);
    return Response.json({ choices: [{ message: { content: JSON.stringify(draft) } }] });
  }
  if (url.pathname.endsWith('/api/v1/services/aigc/text-generation/generation')) return Response.json({ output: {
    choices: [{ message: { content: 'Controlled source fixture only [1], not actual travel facts.' } }],
    search_info: { search_results: searchMissing ? [] : [{ title: 'Synthetic source', url: 'https://example.invalid/controlled-fixture' }] },
  } });
  if (url.pathname.endsWith('/v5/place/text')) {
    assert.equal(url.searchParams.get('city_limit'), 'true');
    const name = url.searchParams.get('keywords')!, point = points[name];
    return Response.json({ status: '1', pois: point ? [{
      id: `CONTROLLED-${name}`, name, address: 'Synthetic test address', type: '风景名胜;风景名胜;景点',
      location: wrongCity ? '120.15,30.25' : `${point[0]},${point[1]}`,
      adcode: wrongCity ? '330106' : point[2], citycode: wrongCity ? '0571' : '021',
    }] : [] });
  }
  if (url.pathname.includes('/direction/')) {
    if (routeMissing) throw Error('Injected route outage');
    return Response.json({ status: '1', route: { paths: [{ cost: { duration: '1200' }, distance: '1200' }] } });
  }
  throw Error(`Unexpected controlled request: ${url.pathname}`);
});
const evidence = process.env.T001_CONTROLLED_EVIDENCE;
const realNow = Date.now;
let cacheClock = 0;
Date.now = () => realNow() + cacheClock;
async function save(name: string, value: string) {
  if (!evidence) return;
  await mkdir(evidence, { recursive: true });
  await writeFile(`${evidence}/${name}`, value);
}
async function ask(id: string, brief: string) {
  // Each scenario observes its injected provider response, not a previous scenario's cache.
  cacheClock += 31 * 60_000;
  draftCalls = 0; feedback.length = 0;
  const payload = { locale: 'en', messages: [{ role: 'user', text: brief }] };
  const response = await POST(new Request('http://controlled.invalid/api/trip-concierge', { method: 'POST', body: JSON.stringify(payload) }));
  const body = await response.text();
  await save(`${id}-controlled-request.json`, JSON.stringify(payload, null, 2));
  await save(`${id}-controlled-response.ndjson`, body);
  return body.trim().split('\n').map(line => JSON.parse(line) as ConciergeEvent);
}
function result(events: ConciergeEvent[]) {
  const event = events.find(e => e.type === 'result');
  assert(event?.type === 'result', JSON.stringify(events.filter(e => e.type === 'error')));
  return event.plan;
}
function rejected(events: ConciergeEvent[]) {
  assert(events.some(e => e.type === 'error'));
  assert(!events.some(e => e.type === 'result'), 'A constraint/data failure cannot become a fabricated success');
}
function coherent(plan: VerifiedTrip, brief: string) {
  assert.deepEqual(shanghaiQualityIssues(plan, [{ role: 'user', text: brief }], null), []);
  for (const day of plan.days) {
    assert(day.stops.every(s => s.place?.adcode.startsWith('31')));
    assert(day.stops.every(s => s.scheduledAt! < '20:00'));
    assert(day.stops.every(s => !s.place?.openingHours));
    assert(day.stops.every(s => /confirm|confirming/i.test(s.visitTip!)));
    assert(!/bring your physical passport|open 24 hours|entry is open/i.test(JSON.stringify(day)));
    assert.equal(day.meals?.length, 2);
    assert(day.note?.includes('Lunch 12:00–13:00') && day.note.includes('Dinner 18:00–19:00'));
    assert(/controlled (?:dumplings|buns|noodle)/i.test(day.note!));
    const before = day.note;
    scheduleShanghaiMeals(day, false);
    assert.equal(day.note, before, 'Rechecking the same day must not duplicate food or meal windows');
  }
}

async function main() {
  const repaired = result(await ask('relaxed-repeated-late-draft', relaxedBrief));
  assert.equal(draftCalls, 2, 'One model repair only, then bounded selection of mapped/researched stops');
  assert(feedback[0].some(issue => /past 21:00/.test(issue)));
  assert.equal(repaired.days.length, 1);
  assert.equal(repaired.days[0].stops.length, 2);
  assert.deepEqual(repaired.days[0].stops.map(s => s.scheduledAt), ['09:30', '14:00']);
  coherent(repaired, relaxedBrief);
  draft = structuredClone(relaxed); draft.days[0].stops[0].booked = true;
  rejected(await ask('late-booking-preserved', relaxedBrief));
  assert.equal(draftCalls, 2);
  draft = relaxed;
  rejected(await ask('must-visit-conflict-preserved', `${relaxedBrief} Must include all named stops.`));
  wrongCity = true;
  rejected(await ask('cross-city-matches-rejected', relaxedBrief));
  wrongCity = false;
  draft = structuredClone(relaxed); draft.days[0].stops = [stop('未匹配地点', '22:00')];
  rejected(await ask('missing-location-not-fabricated', relaxedBrief));
  searchMissing = true;
  rejected(await ask('missing-research-not-fabricated', relaxedBrief));
  assert.equal(draftCalls, 0);
  searchMissing = false;
  draft = relaxed; routeMissing = true;
  const outage = result(await ask('relaxed-route-outage', relaxedBrief));
  coherent(outage, relaxedBrief);
  assert(outage.days[0].legs.every(l => l.mode === 'unverified' && l.minutes === undefined));
  assert(outage.days[0].checks.some(c => /planning allowance, not a route estimate/.test(c)));
  routeMissing = false;
  draft = three;
  const food = result(await ask('three-day-inline-food-and-access-claims', threeBrief));
  assert.equal(draftCalls, 1);
  coherent(food, threeBrief);
  assert(food.days[1].note!.includes('controlled buns') && food.days[1].note!.includes('controlled Benbang dishes'));
  draft = structuredClone(three);
  draft.days[0].stops.push(stop('武康大楼', '16:00'));
  draft.days[1].stops.push(stop('豫园', '16:00'));
  const compactFood = result(await ask('three-day-compact-repair-preserves-food', threeBrief));
  assert.equal(draftCalls, 2);
  coherent(compactFood, threeBrief);
  draft = { ...three, days: [three.days[2]] };
  const modern = result(await ask('modern-access-claims-unverified', modernBrief));
  assert.equal(draftCalls, 1);
  assert(modern.days[0].stops.every(s => /Access requirements are unverified/.test(s.visitTip!)));
  assert(!/passport|open 24 hours/i.test(JSON.stringify(modern.days)));

  // Replay the previously saved REAL Runner draft through synthetic providers. The
  // original file is pre-change evidence; this replay remains a controlled regression.
  if (process.env.T001_SAVED_BASELINE) {
    const saved = JSON.parse(await readFile(process.env.T001_SAVED_BASELINE, 'utf8')) as VerifiedTrip;
    assert(saved.days.some(d => d.stops.some(s => /bring your physical passport/.test(s.visitTip || ''))));
    draft = saved;
    const savedReplay = result(await ask('prior-runner-baseline-controlled-replay', threeBrief));
    assert.equal(draftCalls, 1);
    assert(!/bring your physical passport|open 24 hours/i.test(JSON.stringify(savedReplay.days)));
    assert(savedReplay.days.every(d => d.stops.every(s => /Access requirements are unverified/.test(s.visitTip!))));
    assert(savedReplay.days[0].note!.includes('Nanxiang Steamed Buns'));
    assert(savedReplay.days[1].note!.includes('cafes and bistros'));
    console.log('PASS: saved pre-change Runner baseline replayed through controlled providers (not live evidence).');
  }

  // Render the SAME component imported by Planner, without a browser or CSS loader.
  // Saving HTML here is a controlled rendering assertion, not runtime product evidence.
  const require = createRequire(import.meta.url);
  require.extensions['.css'] = module => { module.exports = {}; };
  const Overview = require('../src/components/travel/ItineraryOverview').default;
  const PlaceCard = require('../src/components/travel/MapPlaceCard').default;
  food.days[1].note = 'Lunch near 武康大楼: try controlled buns. ' + food.days[1].note;
  const html = renderToStaticMarkup(createElement(Overview, {
    plan: food, zh: false, dayIndex: 0, selectedStop: 0, allDays: true, busy: false,
    onSelect() {}, onDay() {}, onEdit() {},
  }));
  assert(html.includes('controlled buns') && html.includes('controlled Benbang dishes'));
  // Access details moved to the map card in D-018. Keep the same truthfulness
  // assertion on the actual new rendering surface rather than removing it.
  const detailsHtml = renderToStaticMarkup(createElement(PlaceCard, {
    day: food.days[0], dayIndex: 0, stop: food.days[0].stops[0], stopIndex: 0, zh: false, onClose() {},
  }));
  assert(detailsHtml.includes('Access requirements are unverified'));
  assert(!html.includes('bring your physical passport') && !html.includes('open 24 hours'));
  assert(!detailsHtml.includes('bring your physical passport') && !detailsHtml.includes('open 24 hours'));
  await save('itinerary-overview-controlled-render.html', html);
  await save('map-place-card-controlled-render.html', detailsHtml);
  console.log('PASS: controlled production POST and actual overview component rendering cover late relaxed-day repair, inline food retention, compact repair food retention, mixed-language note visibility, unverified access, cross-city/missing data, route outages and fixed constraint failures. NOT live product/Eval/browser evidence.');
}
void main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => { Date.now = realNow; });
