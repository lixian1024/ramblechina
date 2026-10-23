import {controlledTravel} from './fixtures/admitted-travel-routes';
import {admittedTripPOST as POST} from './fixtures/admitted-travel-routes';
import { googleFixtureFetch } from './fixtures/google-provider';
import assert from 'node:assert/strict';
import { routeConversation } from '../src/lib/travel/concierge';
import type { ConciergeEvent, TripMessage } from '../src/lib/travel/concierge-types';

process.env.DASHSCOPE_API_KEY = 'sk-paygo-test';
process.env.DASHSCOPE_BASE_URL = 'https://model.example/compatible-mode/v1';
process.env.QWEN_MODEL = 'qwen-plus';
process.env.AMAMP_API_KEY = 'test-only';
process.env.GOOGLE_MAPS_SERVER_API_KEY = 'controlled-test-only';

const calls: string[] = [];
const draft = {
  title: 'A Shanghai day', summary: 'A relaxed day at Yu Garden.', days: [
    { city: '上海', cityEnglish: 'Shanghai', title: 'Yu Garden day', stops: [{ name: 'Yu Garden', search: '豫园', durationMinutes: 90 }] },
  ],
};

globalThis.fetch = googleFixtureFetch(async (input, init) => {
  const url = new URL(String(input));
  calls.push(url.pathname);
  if (url.pathname.endsWith('/chat/completions')) {
    const body = JSON.parse(String(init?.body)) as { messages: { content: string }[] };
    if (body.messages[0].content.startsWith('Classify the user')) {
      const request = JSON.parse(body.messages[1].content) as { latestRequest: string };
      assert(!body.messages[1].content.includes('private-hotel-marker'));
      const intent = /famous places|dinner|餐厅|Grand Central Hotel Shanghai/i.test(request.latestRequest) ? 'travel-assistant'
        : /Day 1/i.test(request.latestRequest) ? 'route-concierge' : 'out-of-scope';
      return Response.json({ choices: [{ message: { content: JSON.stringify({ intent }) } }] });
    }
    return Response.json({ choices: [{ message: { content: JSON.stringify(draft) } }] });
  }
  if (url.pathname.endsWith('/api/v1/services/aigc/text-generation/generation')) {
    const body = JSON.parse(String(init?.body)) as { input: { messages: { content: string }[] }; parameters: { enable_search: boolean; search_options: { forced_search: boolean } } };
    assert.equal(body.parameters.enable_search, true);
    assert.equal(body.parameters.search_options.forced_search, true);
    const travelAnswer = body.input.messages[0].content.includes('Travel Assistant');
    return Response.json({ output: {
      choices: [{ message: { content: travelAnswer ? 'Consider Yu Garden for classical gardens and the Bund for riverfront views [1]. Pick the places that appeal to you.' : 'Yu Garden is a suitable Shanghai stop [1].' } }],
      search_info: { search_results: [{ index: 1, title: 'Shanghai visitor guide', url: 'https://example.org/shanghai', site_name: 'Visitor guide' }] },
    } });
  }
  if (url.pathname.endsWith('/v5/place/text')) {
    if (url.searchParams.get('keywords') === 'Grand Central Hotel Shanghai') return Response.json({ status: '1', pois: [{ id: 'HOTEL', name: 'Grand Central Hotel Shanghai', address: '九江路505号', location: '121.481423,31.235092', adcode: '310101', citycode: '021', type: '住宿服务;宾馆酒店;五星级宾馆' }] });
    return Response.json({ status: '1', pois: [{ id: 'YU', name: '豫园', address: '豫园路', location: '121.492497,31.227714', adcode: '310101', citycode: '021', type: '风景名胜;风景名胜;国家级景点' }] });
  }
  if (url.pathname.endsWith('/v5/place/around')) return Response.json({ status: '1', pois: [
    { id: 'DINNER1', name: '宝粤轩(王宝和店)', address: '九江路505号', location: '121.481476,31.235019', distance: '9', type: '餐饮服务;中餐厅;广东菜(粤菜)' },
    { id: 'DINNER2', name: '囍火锅(U479商场店)', address: '南京东路479号', location: '121.481900,31.235200', distance: '55', type: '餐饮服务;中餐厅;火锅店' },
  ] });
  throw new Error(`Unexpected request: ${url.pathname}`);
});

async function ask(text: string, currentPlan?: unknown, previous: TripMessage[] = [], locale = 'en'): Promise<ConciergeEvent[]> {
  const response = await POST(new Request('http://localhost/api/trip-concierge', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ locale, messages: [...previous, { role: 'user', text }], currentPlan }),
  }));
  assert.equal(response.status, 200);
  return (await response.text()).trim().split('\n').map(line => JSON.parse(line) as ConciergeEvent);
}

async function main() {
  const savedPlan = { title: 'My saved route', days: [{ city: '上海', hotel: 'private-hotel-marker' }] };
  const before = JSON.stringify(savedPlan);
  const travel = await ask('Give me Shanghai famous places to visit. I will choose some from your output.', savedPlan);
  assert.equal(travel.find(event => event.type === 'intent')?.intent, 'travel-assistant');
  assert(travel.some(event => event.type === 'answer' && event.reply.includes('Yu Garden') && event.sources?.[0]?.url === 'https://example.org/shanghai'));
  assert(!travel.some(event => event.type === 'result'));
  assert.equal(JSON.stringify(savedPlan), before);
  assert(!calls.some(path => path.includes('/v5/place/text')));

  const searchesBeforeDinner = calls.filter(path => path.endsWith('/api/v1/services/aigc/text-generation/generation')).length;
  const dinner = await ask('这家酒店名是Grand Central Hotel Shanghai，用高德地点数据核对酒店和附近餐厅', savedPlan);
  assert.equal(dinner.find(event => event.type === 'intent')?.intent, 'travel-assistant');
  assert(dinner.some(event => event.type === 'answer' && event.reply.includes('Grand Central Hotel Shanghai') && event.reply.includes('宝粤轩') && event.sources?.length === 2));
  assert(!dinner.some(event => event.type === 'result'));
  assert.equal(calls.filter(path => path.endsWith('/api/v1/services/aigc/text-generation/generation')).length, searchesBeforeDinner);
  assert.equal(JSON.stringify(savedPlan), before);
  const dinnerFollowup = await ask('Grand Central Hotel Shanghai', savedPlan, [
    { role: 'user', text: 'Dinner near my hotel?', intent: 'travel-assistant' },
    { role: 'assistant', text: 'Which hotel?', agent: 'travel-assistant', intent: 'travel-assistant' },
  ]);
  assert(dinnerFollowup.some(event => event.type === 'answer' && event.reply.includes('宝粤轩')));

  const afterTravel = calls.length;
  const unrelated = await ask('Write a Python sorting function.', savedPlan);
  assert.equal(unrelated.find(event => event.type === 'intent')?.intent, 'out-of-scope');
  assert(unrelated.some(event => event.type === 'answer' && event.reply.includes('travel questions')));
  assert.equal(calls.length, afterTravel + 1);

  const route = await ask('Please add Yu Garden to Day 1 of my itinerary.', savedPlan);
  assert.equal(route.find(event => event.type === 'intent')?.intent, 'route-concierge');
  assert(route.some(event => event.type === 'result' && event.plan.days[0].stops[0].name === 'Yu Garden'));
  assert(calls.some(path => path.includes('/v5/place/text')));

  const filtered = routeConversation([
    { role: 'user', text: 'Plan one day', intent: 'route-concierge' },
    { role: 'assistant', text: 'Done', agent: 'route-concierge' },
    { role: 'user', text: 'Which sights?', intent: 'travel-assistant' },
    { role: 'assistant', text: 'Some suggestions', agent: 'travel-assistant' },
    { role: 'user', text: 'Write Python', intent: 'out-of-scope' },
    { role: 'assistant', text: 'Travel only', agent: 'travel-assistant', intent: 'out-of-scope' },
    { role: 'user', text: 'Add Yu Garden to Day 1' },
  ]);
  assert.deepEqual(filtered.map(message => message.text), ['Plan one day', 'Done', 'Which sights?', 'Some suggestions', 'Add Yu Garden to Day 1']);
  const invalidChinese = await POST(new Request('http://localhost/api/trip-concierge', {
    method: 'POST', body: JSON.stringify({ locale: 'zh', messages: [] }),
  }));
  assert.equal(invalidChinese.status, 400);
  assert.match((await invalidChinese.json()).error, /请填写/);
  const chineseScope = await ask('Write a Python sorting function.', undefined, [], 'zh');
  assert(chineseScope.some(event => event.type === 'answer' && /旅行/.test(event.reply)));
  const oldBase = process.env.DASHSCOPE_BASE_URL;
  process.env.DASHSCOPE_BASE_URL = 'http://model.example/compatible-mode/v1';
  const chineseFailure = await ask('Please add Yu Garden to Day 1.', undefined, [], 'zh');
  assert(chineseFailure.some(event => event.type === 'error' && /服务配置/.test(event.message)));
  assert(!chineseFailure.some(event => event.type === 'result'));
  process.env.DASHSCOPE_BASE_URL = oldBase;
  console.log('PASS: travel questions do not build a route, unrelated questions stop at scope reply, itinerary changes reach Route Concierge.');
}

void controlledTravel(main).catch(error => { console.error(error); process.exitCode = 1; });
