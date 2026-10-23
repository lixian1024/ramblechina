import {admittedTripPOST as POST} from './fixtures/admitted-travel-routes';
import { googleFixtureFetch } from './fixtures/google-provider';
/** Controlled regressions through the production POST handler. NOT live product/Eval evidence. */
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { compactShanghaiRepair, groundShanghaiPlanning, removeShanghaiTransportStops, shanghaiResearchFocus } from '../src/lib/travel/shanghai-grounding';
import { shanghaiQualityIssues } from '../src/lib/travel/shanghai-quality';
import type { ConciergeEvent, DraftTrip, TripMessage, VerifiedTrip } from '../src/lib/travel/concierge-types';

process.env.TRIP_LLM_API_KEY = 'controlled-test-only';
process.env.TRIP_LLM_BASE_URL = 'https://model.example/compatible-mode/v1';
process.env.TRIP_LLM_MODEL = 'qwen-plus';
process.env.AMAP_WEB_SERVICE_KEY = 'controlled-test-only';
process.env.GOOGLE_MAPS_SERVER_API_KEY = 'controlled-test-only';

const brief: TripMessage[] = [{ role: 'user', text: 'First time in Shanghai. 3 days. I love food and architecture.' }];
// Synthetic provider coordinates: these are test inputs, not saved live POI evidence.
const coordinates: Record<string, [number, number, string]> = {
  '豫园': [121.4925, 31.2277, '310101'], '外滩': [121.4921, 31.2335, '310101'],
  '武康大楼': [121.438, 31.205, '310104'], '思南公馆': [121.468, 31.217, '310101'],
  '陆家嘴中心绿地': [121.5063, 31.238, '310115'], '上海中心大厦': [121.505, 31.233, '310115'],
  '受控餐厅': [121.5055, 31.235, '310115'],
};
const stop = (search: string, at: string) => ({
  search, name: search, nameChinese: search, nameEnglish: `Controlled architecture ${search}`,
  category: 'sight' as const, at, durationMinutes: 90,
  why: 'Controlled architecture preference fixture; not a live recommendation.',
  description: 'Controlled fixture only. Source facts must be confirmed.',
});
const badDraft: DraftTrip = {
  title: 'Controlled repeated repair failure', summary: 'Controlled fixture only', days: [
    { city: '上海', title: 'Mixed west bank', stops: [stop('豫园', '09:30'), stop('外滩', '14:00'), stop('武康大楼', '16:00')] },
    { city: '上海', title: 'Repeated Old City', stops: [stop('思南公馆', '09:30'), stop('豫园', '14:00')] },
    { city: '上海', title: 'Pudong plus mistaken transfer', stops: [stop('陆家嘴中心绿地', '09:30'), stop('上海中心大厦', '14:00'), stop('金陵东路渡口', '16:00')] },
  ],
};
let draftCalls = 0, researchMissing = false, omitResidential = false, booking = false, dining = false;
const feedback: string[][] = [];
globalThis.fetch = googleFixtureFetch(async (input, init) => {
  const url = new URL(String(input));
  if (url.pathname.endsWith('/chat/completions')) {
    const body = JSON.parse(String(init?.body));
    if (body.messages[0].content.startsWith('Classify')) return Response.json({ choices: [{ message: { content: '{"intent":"route-concierge"}' } }] });
    draftCalls++;
    const data = JSON.parse(body.messages[1].content);
    assert.equal(data.planningClusters.clusters.length, 3);
    assert(data.planningClusters.clusters.every((cluster: { candidates: unknown[] }) => cluster.candidates.length === 2));
    assert(body.messages[0].content.includes('Do not move a candidate'));
    if (data.validationFeedback) feedback.push(data.validationFeedback.issues);
    const draft = structuredClone(badDraft);
    if (dining) draft.days[2].stops.push({ ...stop('受控餐厅', '12:00'), category: 'food' });
    if (omitResidential) {
      draft.days[0].stops = draft.days[0].stops.filter(s => s.search !== '武康大楼');
      draft.days[1].stops = [stop('未匹配街区', '09:30')];
    }
    if (booking) Object.assign(draft.days[0].stops[2], { booked: true });
    return Response.json({ choices: [{ message: { content: JSON.stringify(draft) } }] });
  }
  if (url.pathname.endsWith('/api/v1/services/aigc/text-generation/generation')) {
    const data = JSON.parse(JSON.parse(String(init?.body)).input.messages[1].content);
    assert(data.researchFocus.includes('思南公馆'));
    return Response.json({ output: {
      choices: [{ message: { content: 'Controlled research fixture [1], not a live source.' } }],
      search_info: { search_results: researchMissing ? [] : [{ title: 'Controlled source', url: 'https://example.invalid/controlled-source' }] },
    } });
  }
  if (url.pathname.endsWith('/v5/place/text')) {
    assert.equal(url.searchParams.get('city_limit'), 'true');
    const search = url.searchParams.get('keywords')!;
    const location = coordinates[search];
    return Response.json({ status: '1', pois: location ? [{
      id: `CONTROLLED-${search}`, name: search, location: `${location[0]},${location[1]}`,
      address: 'Synthetic test address', adcode: location[2], citycode: '021', type: '风景名胜;风景名胜;景点',
    }] : [] });
  }
  if (url.pathname.includes('/direction/')) return Response.json({ status: '1', route: { paths: [{ cost: { duration: '1800' }, distance: '2000' }] } });
  throw new Error(`Unexpected controlled request: ${url.pathname}`);
});

async function ask(id: string, text = brief[0].text) {
  draftCalls = 0; feedback.length = 0;
  const payload = { locale: 'en', messages: [{ role: 'user', text }] };
  const response = await POST(new Request('http://controlled.invalid/api/trip-concierge', { method: 'POST', body: JSON.stringify(payload) }));
  const body = await response.text();
  if (process.env.T001_CONTROLLED_EVIDENCE) {
    await mkdir(process.env.T001_CONTROLLED_EVIDENCE, { recursive: true });
    await writeFile(`${process.env.T001_CONTROLLED_EVIDENCE}/${id}-controlled-request.json`, JSON.stringify(payload, null, 2));
    await writeFile(`${process.env.T001_CONTROLLED_EVIDENCE}/${id}-controlled-response.ndjson`, body);
  }
  return body.trim().split('\n').map(line => JSON.parse(line) as ConciergeEvent);
}
const noResult = (events: ConciergeEvent[]) => {
  assert(events.some(e => e.type === 'error'), 'Unrecoverable constraint/data failure must be exposed');
  assert(!events.some(e => e.type === 'result'), 'Do not emit a false success');
};
const minute = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));

async function main() {
  const events = await ask('repeated-spatial-and-ferry-failure');
  const event = events.find(e => e.type === 'result');
  assert(event?.type === 'result', JSON.stringify(events.filter(e => e.type === 'error')));
  const plan = event.plan;
  assert.equal(draftCalls, 2, 'Exactly one model repair, even when it repeats all failures');
  assert(feedback[0].some(issue => /span/.test(issue)));
  assert(feedback[0].some(issue => /already appears/.test(issue)));
  assert(feedback[0].some(issue => /transport, not/.test(issue)));
  assert.deepEqual(shanghaiQualityIssues(plan, brief, null), []);
  assert.equal(plan.days.length, 3);
  assert.deepEqual(plan.days.map(day => day.stops.map(s => s.search).sort()), [
    ['外滩', '豫园'].sort(), ['思南公馆', '武康大楼'].sort(), ['上海中心大厦', '陆家嘴中心绿地'].sort(),
  ]);
  assert.equal(new Set(plan.days.flatMap(day => day.stops.map(s => s.place!.id))).size, 6);
  for (const day of plan.days) {
    assert(day.note?.includes('within this area'));
    assert(day.checks.some(check => /opening hours are unverified/.test(check)));
    assert.equal(day.meals?.length, 2);
    assert.equal(day.legs.length, day.stops.length - 1);
    for (const meal of day.meals!) {
      assert.equal(meal.status, 'planning');
      assert(day.stops.some(s => s.id === meal.nearStopId));
      for (const [i, s] of day.stops.entries()) {
        const start = minute(s.scheduledAt!), end = start + s.durationMinutes;
        assert(start >= minute(meal.end) || end <= minute(meal.start), 'Meal cannot overlap visit');
        if (i) assert(start - day.legs[i - 1].minutes! - 10 >= minute(meal.end) || start <= minute(meal.start), 'Meal cannot overlap travel');
        assert.equal(s.place?.openingHours, undefined, 'No fabricated hours after repair');
      }
    }
  }
  dining = true;
  const diningEvent = (await ask('regional-food-preserved')).find(e => e.type === 'result');
  assert(diningEvent?.type === 'result');
  const foodDay = diningEvent.plan.days[2];
  const restaurant = foodDay.stops.find(s => s.category === 'food');
  assert(restaurant);
  assert.equal(restaurant.search, '受控餐厅');
  assert.equal(restaurant.scheduledAt, '12:00');
  assert.equal(foodDay.meals?.find(m => m.kind === 'lunch')?.foodStopId, restaurant.id);
  assert(foodDay.stops.every(s => s.place?.adcode === '310115'));
  assert.deepEqual(shanghaiQualityIssues(diningEvent.plan, brief, null), []);
  dining = false;
  noResult(await ask('must-visit-preserved', `${brief[0].text} Must include all the named stops.`));
  assert.equal(draftCalls, 2);
  booking = true;
  noResult(await ask('booking-conflict-preserved'));
  booking = false;
  omitResidential = true;
  noResult(await ask('missing-cluster-not-fabricated'));
  omitResidential = false;
  researchMissing = true;
  noResult(await ask('missing-research-not-fabricated'));
  assert.equal(draftCalls, 0, 'No itinerary should be drafted without sourced research');
  researchMissing = false;
  const planning = await groundShanghaiPlanning(brief, null);
  assert(planning);
  assert.equal(await groundShanghaiPlanning(brief, plan), undefined, 'This task must not change existing-plan replanning');
  assert.equal(shanghaiResearchFocus(brief, plan), undefined);
  const transferDraft = structuredClone(badDraft);
  transferDraft.summary = 'Take the ferry to connect two banks. Compare architecture.';
  transferDraft.days[2].note = 'Take the ferry to Pudong. Compare the skyline locally.';
  const stripped = removeShanghaiTransportStops(transferDraft);
  assert(!/ferry/i.test(stripped.summary));
  assert.equal(stripped.days[2].note, 'Compare the skyline locally.');
  assert.equal(stripped.days[2].stops.length, 2);
  const missing = structuredClone(planning);
  missing.clusters[1].candidates = [];
  assert.equal(compactShanghaiRepair(plan, missing, brief, null, false), undefined, 'Missing candidates cannot become static locations');
  const booked: VerifiedTrip = structuredClone(plan);
  booked.days[0].stops[0].booked = true;
  assert.equal(compactShanghaiRepair(booked, planning, brief, null, false), undefined);
  console.log('PASS: production POST controlled replays recover repeated spatial/cluster/ferry failures, retain meals and unknown hours, preserve must-visits/bookings, and reject missing clusters/research. NOT live product/Eval evidence.');
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
