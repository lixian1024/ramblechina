import { googleFixtureFetch } from './fixtures/google-provider';
/** Controlled provider regression tests, NOT live product/Eval evidence. */
import assert from 'node:assert/strict';
import { POST } from '../src/app/api/trip-concierge/route';
import { findAmapPlace } from '../src/lib/travel/concierge-amap';
import type { ConciergeEvent } from '../src/lib/travel/concierge-types';

process.env.TRIP_LLM_API_KEY = 'test-only';
process.env.TRIP_LLM_BASE_URL = 'https://model.example/compatible-mode/v1';
process.env.TRIP_LLM_MODEL = 'qwen-plus';
process.env.AMAP_WEB_SERVICE_KEY = 'test-only';
process.env.GOOGLE_MAPS_SERVER_API_KEY = 'controlled-test-only';
let researchMissing = false;
let draftCalls = 0;
const mealNote = 'Keep the waterfront visits together, with long breaks between visits. '.repeat(4)
  + 'Lunch 12:00–13:00 near the waterfront. Dinner 18:00–19:00 near the final stop. Confirm restaurants locally.';
globalThis.fetch = googleFixtureFetch(async (input, init) => {
  const url = new URL(String(input));
  if (url.pathname.endsWith('/chat/completions')) {
    const body = JSON.parse(String(init?.body));
    if (body.messages[0].content.startsWith('Classify the user')) {
      const request = JSON.parse(body.messages[1].content).latestRequest;
      const intent = /write/i.test(request) ? 'out-of-scope' : /^plan/i.test(request) ? 'route-concierge' : 'travel-assistant';
      return Response.json({ choices: [{ message: { content: JSON.stringify({ intent }) } }] });
    }
    draftCalls++;
    const request = JSON.parse(body.messages[1].content).conversation.at(-1).text;
    const count = /3 days/i.test(request) ? 3 : 1;
    return Response.json({ choices: [{ message: { content: JSON.stringify({ title: 'Test draft', summary: 'Controlled fixture', days: Array.from({ length: count }, (_, i) => ({
      city: '上海', cityEnglish: 'Shanghai', title: `Test day ${i + 1}`, note: mealNote,
      stops: [{ name: 'Test waterfront', search: `测试滨水${i}`, at: '09:00', durationMinutes: 60, why: 'Test reason' }],
    })) }) } }] });
  }
  if (url.pathname.endsWith('/api/v1/services/aigc/text-generation/generation')) return Response.json({ output: {
    choices: [{ message: { content: 'Controlled research fixture [1]' } }],
    search_info: { search_results: researchMissing ? [] : [{ title: 'Test source', url: 'https://example.org/test-fixture' }] },
  } });
  if (url.pathname.endsWith('/v5/place/text')) {
    const name = url.searchParams.get('keywords');
    const wrongCoordinate = name === '测试错误坐标';
    const mismatch = name === '测试跨城';
    return Response.json({ status: '1', pois: [{ id: name, name, address: 'Test address', type: '风景名胜;风景名胜;景点',
      location: wrongCoordinate || mismatch ? '120.15,30.25' : '121.49,31.23', adcode: mismatch ? '330106' : '310101', citycode: mismatch ? '0571' : '021' }] });
  }
  throw new Error(`Unexpected test request: ${url.pathname}`);
});

async function ask(text: string) {
  const response = await POST(new Request('http://localhost/api/trip-concierge', {
    method: 'POST', body: JSON.stringify({ locale: 'en', messages: [{ role: 'user', text }] }),
  }));
  return (await response.text()).trim().split('\n').map(line => JSON.parse(line) as ConciergeEvent);
}

async function main() {
  for (const text of [
    'First time in Shanghai, 3 days, I love food and architecture.',
    'One day in Shanghai. I only care about modern architecture. No museums, no theme parks.',
    'Plan one relaxed day in Shanghai.',
  ]) {
    const events = await ask(text);
    assert(events.some(event => event.type === 'intent' && event.intent === 'route-concierge'));
    const result = events.find(event => event.type === 'result');
    assert(result?.type === 'result', 'The actual API handler must emit a structured plan');
    assert.equal(result.plan.days.length, /3 days/.test(text) ? 3 : 1);
    for (const day of result.plan.days) {
      assert(day.note?.includes('Dinner 18:00–19:00'), 'Long notes must retain regional dinner windows');
      assert(day.checks.some(check => /opening hours are unverified/i.test(check) && /confirm current hours/i.test(check)));
      assert.equal(day.stops[0].place?.openingHours, undefined, 'Missing hours cannot be invented');
    }
  }
  const before = draftCalls;
  for (const text of ['What food should I try during 3 days in Shanghai?', 'Write a poem about 3 days in Shanghai.']) {
    assert(!(await ask(text)).some(event => event.type === 'result'), 'Advice and unrelated requests must not create a plan');
  }
  assert.equal(draftCalls, before);
  assert.equal(await findAmapPlace('测试跨城', '上海'), undefined, 'A same-name result in Hangzhou must be rejected');
  assert.equal(await findAmapPlace('测试错误坐标', 'Shanghai'), undefined, 'Shanghai adcode cannot override out-of-city coordinates');
  assert((await findAmapPlace('测试本地', '上海市'))?.adcode.startsWith('31'));
  researchMissing = true;
  const failure = await ask('First time in Shanghai, 3 days, I love food and architecture.');
  assert(failure.some(event => event.type === 'error'));
  assert(!failure.some(event => event.type === 'result'), 'Research failure must not fabricate a plan');
  assert.equal(draftCalls, before);
  console.log('PASS: controlled API regressions for implicit itinerary requests, advice isolation, missing hours, note retention, cross-city POIs and missing research. This is not live product evidence.');
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
