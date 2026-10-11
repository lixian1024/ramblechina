import { googleFixtureFetch } from './fixtures/google-provider';
/** Controlled production POST regression; not live API, UI or Eval evidence.
 * Reproduces categories from Runner's 2026-10-09T10-28-47-644Z baseline output.
 */
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { POST } from '../src/app/api/trip-concierge/route';
import { shanghaiQualityIssues } from '../src/lib/travel/shanghai-quality';
import type { ConciergeEvent, DraftTrip } from '../src/lib/travel/concierge-types';

process.env.TRIP_LLM_API_KEY = 'controlled-only';
process.env.TRIP_LLM_BASE_URL = 'https://model.example/compatible-mode/v1';
process.env.TRIP_LLM_MODEL = 'qwen-plus';
process.env.AMAP_WEB_SERVICE_KEY = 'controlled-only';
process.env.GOOGLE_MAPS_SERVER_API_KEY = 'controlled-only';
const brief = 'First time in Shanghai. 3 days. I love food and architecture.';
const points: Record<string, [number, number, string]> = {
  '豫园': [121.492, 31.228, '310101'], '外滩': [121.492, 31.237, '310101'],
  '武康大楼': [121.438, 31.205, '310104'], '思南公馆': [121.467, 31.217, '310101'],
  '陆家嘴中心绿地': [121.506, 31.238, '310115'], '上海中心大厦': [121.505, 31.233, '310115'],
};
const draft: DraftTrip = { title: 'Controlled architecture trip', summary: 'Synthetic fixture only.', days: [
  ['豫园', '外滩'], ['武康大楼', '思南公馆'], ['陆家嘴中心绿地', '上海中心大厦'],
].map(names => ({ city: '上海', title: `Architecture near ${names[0]}`, note: 'Compare nearby architecture.',
  stops: names.map((name, index) => ({ name, search: name, category: 'sight', at: index ? '14:00' : '09:30',
    durationMinutes: 90, why: 'Compare architecture without a cross-district detour.' })) })) };
// These names/types reproduce the prior observed failure; the rest of each POI is synthetic.
const rejected = [
  ['GELATO DINATURA帝娜朵拉', '餐饮服务;餐饮相关场所;餐饮相关'],
  ['野人先生Gelato(上海豫园店)', '餐饮服务;休闲餐饮场所;休闲餐饮场所'],
  ['上海诏安甜汤(武康大楼店)', '餐饮服务;餐饮相关场所;餐饮相关'],
  ['D2Food第二食品(武康大楼店)', '餐饮服务;糕饼店;糕饼店'],
  ['伊洛斋艺术茶道(外滩一号店)', '餐饮服务;茶艺馆;茶艺馆'],
  ['禧果源·混果汁', '餐饮服务;冷饮店;冷饮店'],
  // Even a plausible name cannot establish a restaurant category.
  ['露台餐厅', '餐饮服务;餐饮相关场所;餐饮相关'],
  ['Unclassified Restaurant', '餐饮服务'],
  ['受控商店', '购物服务;中餐厅;上海菜'],
  // Explicit meal categories do not override a contradictory dessert listing.
  ['Gelato fixture', '餐饮服务;快餐厅;快餐厅'],
  ['受控甜汤店', '餐饮服务;中餐厅;中餐厅'],
  ['受控糕饼店', '餐饮服务;中餐厅;糕饼店'],
];
let mode: 'mixed' | 'unknown-only' | 'outage' = 'mixed';
const realNow = Date.now;
let clockOffset = 0;
Date.now = () => realNow() + clockOffset;
globalThis.fetch = googleFixtureFetch(async input => {
  const url = new URL(String(input));
  if (url.pathname.endsWith('/chat/completions')) return Response.json({ choices: [{ message: { content: JSON.stringify(draft) } }] });
  if (url.pathname.endsWith('/api/v1/services/aigc/text-generation/generation')) return Response.json({ output: {
    choices: [{ message: { content: 'Controlled architecture source [1].' } }],
    search_info: { search_results: [{ index: 1, title: 'Controlled fixture', url: 'https://example.invalid/architecture' }] },
  } });
  if (url.pathname.endsWith('/v5/place/text')) {
    const name = url.searchParams.get('keywords')!, point = points[name];
    return Response.json({ status: '1', pois: point ? [{ id: `CONTROLLED-${name}`, name,
      type: '风景名胜;风景名胜;景点', location: `${point[0]},${point[1]}`, adcode: point[2], citycode: '021' }] : [] });
  }
  if (url.pathname.endsWith('/v5/place/around')) {
    if (mode === 'outage') throw Error('Controlled meal-provider outage');
    const location = url.searchParams.get('location')!, [lng, lat] = location.split(',').map(Number);
    const area = Object.values(points).find(p => p[0] === lng && p[1] === lat)!;
    const fixture = (name: string, type: string, index: number) => ({ id: `MEAL-${index}-${location}`, name, type,
      address: 'Controlled nearby address', location: `${lng + .001},${lat}`, adcode: area[2], distance: '100' });
    const pois = rejected.map(([name, type], index) => fixture(name, type, index));
    if (mode === 'mixed') {
      pois.push(fixture('受控上海菜餐厅', '餐饮服务;中餐厅;上海菜', 20));
      // Exercise both other allowed categories across the route's anchors.
      pois.push(fixture('受控正餐店', area[2] === '310115' ? '餐饮服务;外国餐厅;日本料理' : '餐饮服务;快餐厅;快餐厅', 21));
    }
    return Response.json({ status: '1', pois });
  }
  if (url.pathname.includes('/direction/')) return Response.json({ status: '1', route: { paths: [{ cost: { duration: '1200' }, distance: '1200' }] } });
  throw Error(`Unexpected controlled request: ${url.pathname}`);
});

async function main() {
  for (const scenario of ['mixed', 'unknown-only', 'outage'] as const) {
    mode = scenario; clockOffset += 31 * 60_000;
    const request = { locale: 'en', messages: [{ role: 'user' as const, text: brief }] };
    const response = await POST(new Request('http://controlled.invalid/api/trip-concierge', { method: 'POST', body: JSON.stringify(request) }));
    const body = await response.text();
    const evidence = process.env.T001_CONTROLLED_EVIDENCE;
    if (evidence) {
      await mkdir(evidence, { recursive: true });
      await writeFile(`${evidence}/meal-categories-${scenario}-controlled-request.json`, JSON.stringify(request, null, 2));
      await writeFile(`${evidence}/meal-categories-${scenario}-controlled-response.ndjson`, body);
    }
    const events = body.trim().split('\n').map(line => JSON.parse(line) as ConciergeEvent);
    assert(!events.some(event => event.type === 'error'), body);
    const result = events.find(event => event.type === 'result');
    assert(result?.type === 'result', body);
    assert.equal(result.plan.days.length, 3);
    assert.deepEqual(shanghaiQualityIssues(result.plan, request.messages, null), []);
    for (const day of result.plan.days) {
      assert(day.note?.includes('Lunch 12:00–13:00') && day.note.includes('Dinner 18:00–19:00'));
      assert.equal(day.dining?.length, 2);
      for (const meal of day.dining!) {
        assert(day.stops.some(stop => stop.id === meal.nearStopId));
        assert.equal(meal.status, scenario === 'mixed' ? 'map-listed' : 'unavailable');
        assert.equal(meal.options.length, scenario === 'mixed' ? 2 : 0);
        for (const option of meal.options) {
          assert(!rejected.some(([name]) => name === option.name));
          assert.notEqual(option.cuisine, 'Restaurant');
          assert.equal(option.hoursStatus, 'unverified');
          assert.equal(new URL(option.sourceUrl).searchParams.get('query'), option.name);
        }
      }
      if (scenario !== 'mixed') assert(day.checks.some(check => /dining lookup unavailable/.test(check)));
    }
    console.log(`PASS: controlled production POST meal categories — ${scenario}`);
  }
}
void main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => { Date.now = realNow; });
