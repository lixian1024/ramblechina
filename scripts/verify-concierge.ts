import {controlledTravel} from './fixtures/admitted-travel-routes';
import { googleFixtureFetch, testPlaceId } from './fixtures/google-provider';
import assert from 'node:assert/strict';
import { planTrip } from '../src/lib/travel/concierge';
import { findAmapPlace } from '../src/lib/travel/concierge-amap';

process.env.DASHSCOPE_API_KEY = 'sk-paygo-test';
process.env.DASHSCOPE_BASE_URL = 'https://model.example/compatible-mode/v1';
process.env.QWEN_MODEL = 'qwen3.6-plus';
process.env.AMAMP_API_KEY = 'test-only';
process.env.GOOGLE_MAPS_SERVER_API_KEY = 'controlled-test-only';

const first = {
  title: 'Shanghai with parents', summary: 'An easy three-day route.', startDate: '2026-10-01', travelStyle: 'easy with parents',
  days: [{ city: '上海', date: '2026-10-01', title: 'Old City and Bund', hotel: '和平饭店', stops: [
    { name: 'Yu Garden', search: '上海豫园', nameChinese: '豫园', nameEnglish: 'Yu Garden', pinyin: 'Yùyuán', category: 'culture', bestTime: 'Morning, before the busiest hours', admission: { text: 'Test-only ¥40 reference', sourceUrl: 'https://example.com/official-guide' }, at: '10:00', durationMinutes: 90, booked: true, bookingNote: 'Ticket at 10:00' },
    { name: 'The Bund', search: '外滩', category: 'invented-category', admission: { text: 'Unsubstantiated free entry', sourceUrl: 'https://invented.example/price' }, at: '16:00', durationMinutes: 45, booked: false },
  ] },
  { city: '上海', date: '2026-10-02', title: 'Local food', stops: [{ name: '绿波廊', search: '绿波廊', at: '12:00', durationMinutes: 60 }] },
  { city: '上海', date: '2026-10-03', title: 'A quieter culture day', stops: [{ name: '上海博物馆', search: '上海博物馆', at: '10:00', durationMinutes: 90 }] }], questions: [],
};
const revision = {
  ...first, days: [{ ...first.days[0], title: 'A gentler afternoon', stops: [first.days[0].stops[1]] }, ...first.days.slice(1)],
};
const intercity = {
  title: 'Shanghai to Hangzhou', summary: 'A slower city change.', startDate: '2026-10-01', travelStyle: 'easy with parents',
  days: [
    { city: '上海', date: '2026-10-01', title: 'Shanghai', hotel: '和平饭店', stops: [{ name: 'The Bund', search: '外滩', durationMinutes: 60 }] },
    { city: '杭州', date: '2026-10-02', title: 'Hangzhou', intercityMode: 'rail', intercityNote: 'Check available services before booking', hotel: '杭州君悦酒店', stops: [{ name: 'West Lake', search: '西湖景区', at: '09:00', durationMinutes: 120 }] },
  ], questions: [],
};
const messy = {
  ...first, days: [{ ...first.days[0], stops: [
    { name: '和平饭店', search: '和平饭店南楼', at: '09:15', durationMinutes: 20 },
    first.days[0].stops[0],
    { name: 'Lunch at Green Wave Pavilion or Nanxiang', search: '绿波廊或南翔馒头店', at: '12:00', durationMinutes: 60 },
    { name: 'Go to the Bund', search: '外滩', at: '15:00', durationMinutes: 60 },
  ] }],
};
let draftOverride: unknown;
let modelCalls = 0;
let researchCalls = 0;
let researchAvailable = true;
const calls: string[] = [];
const modelRequests: { host: string; model: string; thinking: unknown }[] = [];
const pois: Record<string, { id: string; name: string; location: string }> = {
  和平饭店: { id: 'H', name: '和平饭店', location: '121.486000,31.240000' },
  和平饭店南楼: { id: 'H2', name: '和平饭店南楼', location: '121.486100,31.240100' },
  上海豫园: { id: 'Y', name: '上海豫园', location: '121.492497,31.227714' },
  外滩: { id: 'B', name: '外滩', location: '121.490000,31.236000' },
  绿波廊: { id: 'R', name: '绿波廊', location: '121.492600,31.227600' },
  杭州君悦酒店: { id: 'HH', name: '杭州君悦酒店', location: '120.151500,30.251800' },
  西湖景区: { id: 'L', name: '西湖景区', location: '120.142000,30.250000' },
};
globalThis.fetch = googleFixtureFetch(async (input, init) => {
  const url = new URL(String(input));
  calls.push(url.pathname);
  if (url.pathname.endsWith('/api/v1/services/aigc/text-generation/generation')) {
    const body = JSON.parse(String(init?.body)) as { model: string; parameters: { enable_search: boolean; search_options: { forced_search: boolean; enable_source: boolean } } };
    assert.equal(body.model, 'qwen-plus');
    if (draftOverride) assert.match(String(init?.body), /Simplified Chinese/);
    assert.equal(body.parameters.enable_search, true);
    assert.equal(body.parameters.search_options.forced_search, true);
    assert.equal(body.parameters.search_options.enable_source, true);
    researchCalls++;
    return Response.json({ output: { choices: [{ message: { content: 'Yu Garden and the Bund are useful Shanghai stops [1].' } }], search_info: { search_results: researchAvailable ? [{ title: 'Official visitor guide', url: 'https://example.com/official-guide', site_name: 'Example' }] : [] } } });
  }
  if (url.pathname.endsWith('/chat/completions')) {
    const body = JSON.parse(String(init?.body)) as { model: string; enable_thinking?: boolean };
    modelRequests.push({ host: url.host, model: body.model, thinking: body.enable_thinking });
    if (draftOverride) assert.match(String(init?.body), /Simplified Chinese/);
    return Response.json({ choices: [{ message: { content: JSON.stringify(draftOverride || [first, revision, intercity, messy][modelCalls++] || intercity) } }] });
  }
  if (url.pathname.endsWith('/v5/place/text')) {
    const keyword = url.searchParams.get('keywords') || '';
    if (keyword === '豫园') return Response.json({ status: '1', pois: [
      { id: 'S', name: '豫园(地铁站)', type: '交通设施服务;地铁站;地铁站', location: '121.491000,31.230000', adcode: '310101', citycode: '021' },
      { id: 'I', name: '豫园-内园', type: '风景名胜;风景名胜相关;旅游景点', location: '121.493000,31.227000', adcode: '310101', citycode: '021' },
      { ...pois.上海豫园, type: '风景名胜;风景名胜;国家级景点', adcode: '310101', citycode: '021' },
    ] });
    if (keyword === '绿波廊(豫园路店)') return Response.json({ status: '1', pois: [
      { id: 'R', name: '绿波廊酒楼(豫园总店)', type: '餐饮服务;中餐厅;综合酒楼', location: '121.492600,31.227600', adcode: '310101', citycode: '021' },
    ] });
    const poi = pois[keyword];
    const hangzhou = poi?.id === 'HH' || poi?.id === 'L';
    return Response.json({ status: '1', pois: poi ? [{ ...poi, adcode: hangzhou ? '330106' : '310101', citycode: hangzhou ? '0571' : '021', address: hangzhou ? 'Hangzhou' : 'Shanghai' }] : [] });
  }
  if (url.pathname.endsWith('/v5/direction/walking')) return Response.json({ status: '1', route: { paths: [{ distance: '1300', cost: { duration: '1200' } }] } });
  if (url.pathname.endsWith('/v5/direction/driving')) return Response.json({ status: '1', route: { paths: [{ distance: '1900', cost: { duration: '720' } }] } });
  if (url.pathname.endsWith('/v5/direction/transit/integrated')) return Response.json({ status: '1', route: { transits: [{ distance: url.searchParams.get('city1') !== url.searchParams.get('city2') ? '180000' : '1900', cost: { duration: url.searchParams.get('city1') !== url.searchParams.get('city2') ? '7200' : '1000' }, segments: [] }] } });
  if (url.pathname.endsWith('/v3/weather/weatherInfo')) return Response.json({ status: '1', forecasts: [{ reporttime: '2026-10-01 08:00:00', casts: [{ date: '2026-10-01', dayweather: '多云', nightweather: '晴', daytemp: '24', nighttemp: '18' }] }] });
  throw new Error(`Unexpected request to ${url.pathname}`);
});

async function main() {
  assert.equal((await findAmapPlace('豫园', '上海'))?.id, testPlaceId('Y'));
  assert.equal((await findAmapPlace('绿波廊(豫园路店)', '上海'))?.id, testPlaceId('R'));
  const phases: string[] = [];
  const initial = await planTrip([{ role: 'user', text: 'Three days in Shanghai with parents. Yu Garden booked at 10:00.' }], null, phase => phases.push(phase));
  assert.deepEqual(phases, ['understanding', 'research', 'drafting', 'places', 'routes', 'weather', 'review']);
  assert.equal(initial.plan.research?.sources[0]?.url, 'https://example.com/official-guide');
  assert.equal(initial.plan.days.length, 3);
  assert.equal(initial.plan.days[0].stops[0].booked, true);
  assert.equal(initial.plan.days[0].stops[0].nameChinese, '豫园');
  assert.equal(initial.plan.days[0].stops[0].nameEnglish, 'Yu Garden');
  assert.equal(initial.plan.days[0].stops[0].pinyin, 'Yùyuán');
  assert.equal(initial.plan.days[0].stops[0].category, 'culture');
  assert.equal(initial.plan.days[0].stops[0].admission?.sourceUrl, 'https://example.com/official-guide');
  assert.equal(initial.plan.days[0].stops[1].admission, undefined, 'Reject price references outside current research');
  assert.equal(initial.plan.days[0].stops[1].category, undefined, 'Reject unknown categories');
  assert.equal(initial.plan.days[0].stops[0].scheduledAt, '10:00');
  assert.equal(initial.plan.days[0].weather.status, 'forecast');
  assert.equal(initial.plan.days[0].legs.length, 2);
  assert(initial.plan.days[0].legs.every(leg => typeof leg.minutes === 'number'));
  assert(calls.some(path => path.includes('/v5/place/text')));
  assert(!calls.some(path => path.includes('/v3/place/detail')));
  assert(calls.some(path => path.includes('/v5/direction/')));

  const updated = await planTrip([{ role: 'user', text: 'Make Day 1 easier while keeping my tickets.' }], initial.plan, () => {});
  assert(updated.plan.days[0].stops.some(stop => stop.name === 'Yu Garden' && stop.booked && stop.at === '10:00'));
  assert.equal(updated.plan.days.length, 3, 'A Day 1 edit must retain the full trip length');
  const crossCity = await planTrip([{ role: 'user', text: 'Two easy days between Shanghai and Hangzhou.' }], null, () => {});
  const secondDay = crossCity.plan.days[1];
  assert.equal(secondDay.intercityMode, 'rail');
  assert.equal(secondDay.intercityNote, 'Check available services before booking');
  assert.equal(secondDay.transfer?.fromName, '和平饭店');
  assert.equal(secondDay.transfer?.toName, '杭州君悦酒店');
  assert.equal(secondDay.transfer?.leg.minutes, 120);
  assert(secondDay.legs.some(leg => leg.from === 'hotel' && leg.to === secondDay.stops[0].id));
  assert(secondDay.stops[0].scheduledAt && secondDay.stops[0].scheduledAt >= '10:45');
  const cleaned = await planTrip([{ role: 'user', text: 'An easy Shanghai day with a booked garden ticket.' }], null, () => {});
  assert.deepEqual(cleaned.plan.days[0].stops.map(stop => stop.name), ['Yu Garden', '绿波廊', '外滩']);
  assert(cleaned.plan.days[0].stops.every(stop => stop.placeStatus === 'matched'));

  process.env.DASHSCOPE_API_KEY = 'sk-paygo-test';
  process.env.DASHSCOPE_BASE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1';
  process.env.QWEN_MODEL = 'qwen3.6-plus';
  await planTrip([{ role: 'user', text: 'Plan Shanghai and Hangzhou.' }], null, () => {});
  assert.deepEqual(modelRequests.at(-1), { host: 'dashscope.aliyuncs.com', model: 'qwen3.6-plus', thinking: false });
  assert.equal(researchCalls, modelCalls);

  draftOverride = {
    title: '', summary: '上海与杭州的中文行程', travelStyle: '带父母，少走路',
    days: [
      { city: '上海', title: '', date: '2030-10-01', hotel: '和平饭店', stops: [
        { name: '豫园', search: '上海豫园', at: '10:00', durationMinutes: 90, booked: true },
        { name: '外滩', search: '外滩', at: '10:30', durationMinutes: 60, booked: true },
        { name: '待确认地点', search: '未匹配的地点', at: '09:00', durationMinutes: 60 },
        { name: '绿波廊', search: '绿波廊', at: '21:30', durationMinutes: 60 },
      ] },
      { city: '杭州', title: '西湖慢游', date: '2030-10-02', hotel: '杭州君悦酒店', stops: [
        { name: '西湖', search: '西湖景区', at: '09:00', durationMinutes: 120 },
      ] },
    ], questions: ['住哪家酒店？'],
  };
  const chinese = await planTrip([{ role: 'user', text: '安排上海与杭州两天，保留已预约的豫园和外滩时间。' }], null, () => {}, 'zh');
  assert.equal(chinese.plan.title, '你的中国旅程');
  assert.equal(chinese.plan.days[0].title, '第 1 天');
  assert.match(chinese.reply, /天行程/);
  const chineseChecks = [...chinese.plan.checks, ...chinese.plan.days.flatMap(day => day.checks)];
  assert(chineseChecks.some(check => check.includes('预约') && check.includes('冲突')));
  assert(chineseChecks.some(check => check.includes('建议开始时间调整')));
  assert(chineseChecks.some(check => check.includes('21:00')));
  assert(chineseChecks.some(check => check.includes('位置待确认')));
  assert(chineseChecks.some(check => check.includes('尚未核实')));
  assert(chineseChecks.some(check => check.includes('天气预报')));
  assert(chineseChecks.every(check => !/[A-Za-z]/.test(check)), 'Chinese checks must not leak hard-coded English');
  assert.equal(chinese.plan.checks[0], '请补充：住哪家酒店？');
  assert.match(chinese.plan.days[1].transfer!.leg.note!, /起终点交通估时/);
  assert(chinese.plan.days.every(day => day.legs.every(leg => /[\u3400-\u9fff]/u.test(leg.note || ''))));
  assert.equal(chinese.plan.days[0].stops[1].scheduledAt, '10:30', 'Chinese locale must preserve booked times');
  draftOverride = undefined;

  // Transport failures must not look like an empty model plan or disclose raw errors.
  const healthyFetch = globalThis.fetch;
  const originalLog = console.error;
  const diagnostics: unknown[][] = [];
  console.error = (...values: unknown[]) => { diagnostics.push(values); };
  try {
    let failure: () => Promise<Response> = async () => { throw new DOMException('test timeout', 'TimeoutError'); };
    globalThis.fetch = async (input, init) => String(input).endsWith('/chat/completions') ? failure() : healthyFetch(input, init);
    const request = () => planTrip([{ role: 'user', text: 'Plan Shanghai and Hangzhou.' }], null, () => {});
    await assert.rejects(request(), /model took too long.*existing trip is unchanged/);
    failure = async () => { throw new TypeError('Bearer secret-test-key; private request', { cause: { code: 'ECONNRESET' } }); };
    await assert.rejects(request(), /connection.*interrupted.*existing trip is unchanged/i);
    failure = async () => new Response(new ReadableStream({ start(controller) { controller.error(new DOMException('body timeout', 'TimeoutError')); } }));
    await assert.rejects(request(), /model took too long/);
    failure = async () => new Response('not json');
    await assert.rejects(request(), /valid itinerary data/);
    assert.equal(diagnostics.length, 3);
    assert.equal((diagnostics[0][1] as { kind: string }).kind, 'timeout');
    assert.equal((diagnostics[1][1] as { code: string }).code, 'ECONNRESET');
    assert(!JSON.stringify(diagnostics).includes('secret-test-key'));
    assert(!JSON.stringify(diagnostics).includes('private request'));
  } finally { globalThis.fetch = healthyFetch; console.error = originalLog; }

  researchAvailable = false;
  const modelCallsBeforeMissingResearch = modelCalls;
  await assert.rejects(planTrip([{ role: 'user', text: 'Plan Shanghai.' }], null, () => {}), /no usable sources/);
  assert.equal(modelCalls, modelCallsBeforeMissingResearch);
  researchAvailable = true;

  const requestsBeforeRestricted = modelRequests.length;
  process.env.DASHSCOPE_API_KEY = 'sk-sp-test-token-plan';
  process.env.DASHSCOPE_BASE_URL = 'https://token-plan.cn-beijing.maas.aliyuncs.com/compatible-mode/v1';
  await assert.rejects(planTrip([{ role: 'user', text: 'Plan a trip.' }], null, () => {}), /Token\/Coding Plan credential/);
  assert.equal(modelRequests.length, requestsBeforeRestricted);
  console.log('Route Concierge: forced web research on every plan, source display data, Google places/roads and Amap transit/weather checks, Chinese output and scheduling checks, intercity transfer and Token Plan guard verified.');
}
void controlledTravel(main).catch(error => { console.error(error); process.exitCode = 1; });
