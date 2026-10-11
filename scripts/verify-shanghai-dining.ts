import { googleFixtureFetch } from './fixtures/google-provider';
/** Controlled production POST regressions. Not live API, UI or Eval evidence. */
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { POST } from '../src/app/api/trip-concierge/route';
import { checkedResearchSummary } from '../src/lib/travel/research-integrity';
import { shanghaiQualityIssues } from '../src/lib/travel/shanghai-quality';
import type { ConciergeEvent, DraftTrip, VerifiedTrip } from '../src/lib/travel/concierge-types';

process.env.TRIP_LLM_API_KEY = 'controlled-only';
process.env.TRIP_LLM_BASE_URL = 'https://model.example/compatible-mode/v1';
process.env.TRIP_LLM_MODEL = 'qwen-plus';
process.env.AMAP_WEB_SERVICE_KEY = 'controlled-only';
process.env.GOOGLE_MAPS_SERVER_API_KEY = 'controlled-only';
const brief = 'First time in Shanghai. 3 days. I love food and architecture.';
const modernBrief = 'One day in Shanghai. I only care about modern architecture. No museums, no theme parks.';
const points: Record<string, [number, number, string]> = {
  '豫园': [121.492, 31.228, '310101'], '外滩': [121.492, 31.237, '310101'],
  '武康大楼': [121.438, 31.205, '310104'], '思南公馆': [121.467, 31.217, '310101'],
  '陆家嘴中心绿地': [121.506, 31.238, '310115'], '上海中心大厦': [121.505, 31.233, '310115'],
  '东方明珠广播电视塔': [121.499, 31.24, '310115'],
};
const stop = (name: string, at: string) => ({ name, search: name, nameChinese: name,
  nameEnglish: `Controlled architecture ${name}`, at, durationMinutes: 90, category: 'sight' as const,
  why: 'Compare architecture within the requested district.', description: 'Controlled description only.' });
let draft: DraftTrip = { title: 'Controlled itinerary', summary: 'Synthetic fixture. 8 Restaurant is a source-supported option [9].', days: [
  ['豫园', '外滩'], ['武康大楼', '思南公馆'], ['陆家嘴中心绿地', '上海中心大厦'],
].map((names, index) => ({ city: '上海', cityEnglish: 'Shanghai', title: `Controlled district ${index}`,
  note: 'Compare the architecture. Lunch 12:00–13:00 nearby. Dinner 18:00–19:00 nearby. Many towers have dining rooms with skyline views. 8 Restaurant is a source-supported option [9].',
  stops: names.map((name, i) => stop(name, i ? '14:00' : '09:30')) })) };
let research = { summary: 'Architecture research fixture [1].\n\nNo dining information is available for districts two or three.\n\nOld Shanghai No. 8 Restaurant is source-confirmed [9].',
  sources: [{ index: 1, title: 'Controlled source only', url: 'https://example.invalid/fixture' }] };
let diningMode: 'normal' | 'timeout' | 'poisoned' = 'normal';
const modelInputs: { webResearch: { summary: string } }[] = [];
const aroundAnchors: string[] = [];
const realNow = Date.now;
let cacheClock = 0;
Date.now = () => realNow() + cacheClock;
globalThis.fetch = googleFixtureFetch(async (input, init) => {
  const url = new URL(String(input));
  if (url.pathname.endsWith('/chat/completions')) {
    const body = JSON.parse(String(init?.body));
    if (body.messages[0].content.startsWith('Classify')) return Response.json({ choices: [{ message: { content: '{"intent":"route-concierge"}' } }] });
    modelInputs.push(JSON.parse(body.messages[1].content));
    return Response.json({ choices: [{ message: { content: JSON.stringify(draft) } }] });
  }
  if (url.pathname.endsWith('/api/v1/services/aigc/text-generation/generation')) return Response.json({ output: {
    choices: [{ message: { content: research.summary } }], search_info: { search_results: research.sources },
  } });
  if (url.pathname.endsWith('/v5/place/text')) {
    const name = url.searchParams.get('keywords')!, coords = points[name];
    return Response.json({ status: '1', pois: coords ? [{ id: `CONTROLLED-${name}`, name, address: 'Fixture address',
      type: '风景名胜;风景名胜;景点', location: `${coords[0]},${coords[1]}`, adcode: coords[2], citycode: '021' }] : [] });
  }
  if (url.pathname.endsWith('/v5/place/around')) {
    if (diningMode === 'timeout') throw Error('Controlled dining outage');
    assert.equal(url.searchParams.get('types'), '050000');
    const location = url.searchParams.get('location')!;
    aroundAnchors.push(location);
    const [lng, lat] = location.split(',').map(Number);
    const area = Object.entries(points).find(([, coords]) => coords[0] === lng && coords[1] === lat)!;
    const good = { id: `MEAL-${location}`, name: `受控餐厅-${area[0]}`, address: `受控地址-${area[0]}`,
      type: '餐饮服务;中餐厅;上海菜', location: `${lng + .001},${lat}`, adcode: area[1][2], distance: '100' };
    return Response.json({ status: '1', pois: diningMode === 'poisoned' ? [
      { ...good, id: 'WRONG-CITY', adcode: '330106' },
      { ...good, id: 'FAR-COORDINATE', location: '120.15,30.25', distance: '10' },
      { ...good, id: 'CROSS-BANK', adcode: area[1][2] === '310115' ? '310101' : '310115' },
      { ...good, id: 'CANDY', type: '餐饮服务;甜品店;蛋糕店' },
      { ...good, id: '', location: `${lng + .001},${lat}` },
      { ...good, id: 'MISSING-LOCATION', location: null },
      { ...good, id: 'EMPTY-LOCATION', location: '' },
    ] : [good, good, { ...good, id: 'SOUVENIR', type: '购物服务' }] });
  }
  if (url.pathname.includes('/direction/')) return Response.json({ status: '1', route: { paths: [{ cost: { duration: '1200' }, distance: '1200' }] } });
  throw Error(`Unexpected controlled request: ${url.pathname}`);
});
const evidence = process.env.T001_CONTROLLED_EVIDENCE;
async function save(name: string, contents: string) {
  if (!evidence) return;
  await mkdir(evidence, { recursive: true }); await writeFile(`${evidence}/${name}`, contents);
}
async function ask(id: string, input = brief) {
  cacheClock += 31 * 60_000; modelInputs.length = 0; aroundAnchors.length = 0;
  const payload = { locale: 'en', messages: [{ role: 'user', text: input }] };
  const response = await POST(new Request('http://controlled.invalid/api/trip-concierge', { method: 'POST', body: JSON.stringify(payload) }));
  const body = await response.text();
  await save(`${id}-controlled-request.json`, JSON.stringify(payload, null, 2));
  await save(`${id}-controlled-response.ndjson`, body);
  const result = body.trim().split('\n').map(line => JSON.parse(line) as ConciergeEvent).find(event => event.type === 'result');
  assert(result?.type === 'result', body);
  return result.plan;
}
function sourcedMeals(plan: VerifiedTrip, input = brief) {
  assert.deepEqual(shanghaiQualityIssues(plan, [{ role: 'user', text: input }], null), []);
  for (const day of plan.days) {
    assert(day.stops.length <= 4);
    assert(!/8 Restaurant|many towers have|cafes and bistros|food courts/i.test(day.note!));
    assert(day.note?.includes('Lunch 12:00–13:00') && day.note.includes('Dinner 18:00–19:00'));
    assert.equal(day.dining?.length, 2);
    for (const meal of day.dining!) {
      assert.equal(meal.status, 'map-listed'); assert.equal(meal.options.length, 1);
      const anchor = day.stops.find(stop => stop.id === meal.nearStopId)!;
      const candidate = meal.options[0];
      assert(candidate.name.includes(anchor.search), 'Dining must match the final meal anchor, not a generic citywide list');
      assert.equal(candidate.cuisine, 'Chinese restaurant');
      assert.equal(candidate.hoursStatus, 'unverified');
      assert(candidate.checkedAt && candidate.id && candidate.adcode.startsWith('31'));
      const source = new URL(candidate.sourceUrl);
      assert.equal(source.hostname, 'www.google.com');
      assert.equal(source.searchParams.get('query'), candidate.name);
      assert.equal(source.searchParams.get('query_place_id'), candidate.id);
      assert(!day.stops.some(stop => stop.place?.id === candidate.id), 'Meal suggestions must not add unrelated major stops');
    }
    const lunch = day.dining!.find(meal => meal.kind === 'lunch')!;
    assert.equal(lunch.nearStopId, day.stops[0].id, 'Lunch between visits must stay at the morning stop');
  }
}
async function main() {
  const plan = await ask('three-district-dining'); sourcedMeals(plan);
  assert(!plan.summary.includes('8 Restaurant'), 'Trip summary must not retain an unsupported citation either');
  assert(!modelInputs[0].webResearch.summary.includes('Old Shanghai No. 8'));
  assert(!modelInputs[0].webResearch.summary.includes('[9]'));
  assert(plan.research?.citationWarnings?.length);
  assert(!plan.research?.summary.includes('[9]'));
  // Ambiguous indices and non-numeric invented titles cannot masquerade as returned sources.
  const bad = checkedResearchSummary('Keep this [1].\n\nInvented [9].\n\nInvented [Unknown title].', research.sources);
  assert.equal(bad.summary, 'Keep this [1].'); assert.equal(bad.warnings.length, 2);
  assert.equal(checkedResearchSummary('Ambiguous [1].', [...research.sources, { index: 1, title: 'Other', url: 'https://example.invalid/other' }]).summary, '');
  diningMode = 'timeout';
  const missing = await ask('dining-outage');
  assert(missing.days.every(day => day.dining?.every(meal => meal.status === 'unavailable' && !meal.options.length)));
  assert(missing.days.every(day => /Dining ideas.*unverified/.test(day.note!) && day.checks.some(check => /lookup unavailable/.test(check))));
  assert(!missing.days.some(day => /8 Restaurant/.test(day.note!)), 'Unsupported dining claims must be removed even during an outage');
  diningMode = 'poisoned';
  const poisoned = await ask('dining-cross-city-and-coordinate-defense');
  assert(poisoned.days.every(day => day.dining?.every(meal => !meal.options.length)));
  diningMode = 'normal';
  if (process.env.T001_SAVED_EVIDENCE_DIR) {
    for (const [name, input] of [['baseline', brief], ['E-002', modernBrief]]) {
      const saved = JSON.parse(await readFile(`${process.env.T001_SAVED_EVIDENCE_DIR}/${name}-plan.json`, 'utf8')) as VerifiedTrip;
      draft = saved; research = saved.research!;
      const replay = await ask(`${name}-prior-runner-replay`, input); sourcedMeals(replay, input);
      if (name === 'E-002') {
        assert(!modelInputs[0].webResearch.summary.includes('[9]'));
        assert(!modelInputs[0].webResearch.summary.includes('Old Shanghai No. 8 Restaurant'));
        assert(replay.days[0].stops.every(stop => !/museum|theme park|博物馆|迪士尼/i.test(stop.name)));
      }
    }
  }
  const require = createRequire(import.meta.url); require.extensions['.css'] = module => { module.exports = {}; };
  const Overview = require('../src/components/travel/ItineraryOverview').default;
  const html = renderToStaticMarkup(createElement(Overview, { plan, zh: false, dayIndex: 0, selectedStop: 0,
    allDays: true, busy: false, onSelect() {}, onDay() {}, onEdit() {} }));
  assert(html.includes('Chinese restaurant') && html.includes('www.google.com/maps/search/'));
  assert(html.includes('Confirm hours, menus, reservations and dietary suitability'));
  assert(html.includes('Lunch 12:00–13:00') && html.includes('Dinner 18:00–19:00'));
  assert(!html.includes('8 Restaurant') && !html.includes('many towers have'));
  await save('dining-overview-controlled-render.html', html);
  console.log('PASS: controlled production POST covers route-anchored sourced meals, missing/ambiguous citations, stale dining claims, provider outages and cross-city/coordinate poisoning; actual component rendering shows sources and uncertainty. Saved Runner replay, when enabled, is controlled evidence only.');
}
void main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => { Date.now = realNow; });
