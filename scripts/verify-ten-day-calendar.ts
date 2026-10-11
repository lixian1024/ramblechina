/** Live replay of the reported bug through the app; no provider mocks or credentials. */
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { ConciergeEvent } from '../src/lib/travel/concierge-types';
import { tripDate, tripRequirements } from '../src/lib/travel/trip-requirements';

async function main() {
  const text = "10 days, chongqing, xi'an, chengdu, jiuzhaigou, 2 people, food & culture travel. start from 20 oct.";
  const payload = { locale: 'en', messages: [{ role: 'user' as const, text }], currentPlan: null };
  const requirements = tripRequirements(payload.messages, null);
  const run = path.resolve('.loop/trip-calendar', `${new Date().toISOString().replace(/[:.]/g, '-')}-ten-day-live`);
  await mkdir(run, { recursive: true });
  await writeFile(path.join(run, 'request.json'), JSON.stringify(payload, null, 2));
  console.log(`Evidence: ${run}`);
  const started = Date.now();
  const response = await fetch(`${process.env.TEST_ORIGIN || 'http://127.0.0.1:3001'}/api/trip-concierge`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: AbortSignal.timeout(600_000),
  });
  assert(response.ok && response.body, `HTTP ${response.status}`);
  let body = '', pending = '';
  const decoder = new TextDecoder();
  const reader = response.body.getReader();
  while (true) {
    const { value: chunk, done } = await reader.read();
    if (done) break;
    const value = decoder.decode(chunk, { stream: true }); body += value; pending += value;
    let newline: number;
    while ((newline = pending.indexOf('\n')) >= 0) {
      const event = JSON.parse(pending.slice(0, newline)) as ConciergeEvent;
      if (event.type === 'phase') console.log(`${Math.round((Date.now() - started) / 1000)}s: ${event.phase}`);
      pending = pending.slice(newline + 1);
    }
    await writeFile(path.join(run, 'response.ndjson'), body);
  }
  const events = body.trim().split('\n').map(line => JSON.parse(line) as ConciergeEvent);
  const result = events.find(e => e.type === 'result');
  const failure = events.find(e => e.type === 'error');
  const report = { mode: 'live-app-api', elapsedMs: Date.now() - started, requested: requirements,
    modelDraftAttempts: events.filter(e => e.type === 'phase' && e.phase === 'drafting').length,
    status: result?.type === 'result' ? 'returned' : 'error', error: failure?.type === 'error' ? failure.message : undefined,
    days: result?.type === 'result' ? result.plan.days.map(d => ({ date: d.date, city: d.city, kind: d.kind, stops: d.stops.length })) : undefined,
    limits: 'Calendar/coverage replay only; not a certification of intercity schedules, access rules or product feasibility.' };
  await writeFile(path.join(run, 'report.json'), JSON.stringify(report, null, 2));
  assert(result?.type === 'result', failure?.type === 'error' ? failure.message : 'No result');
  await writeFile(path.join(run, 'plan.json'), JSON.stringify(result.plan, null, 2));
  assert.equal(result.plan.days.length, 10);
  assert.equal(result.plan.startDate, requirements.startDate);
  assert.deepEqual(result.plan.days.map(d => d.date), Array.from({ length: 10 }, (_, i) => tripDate(requirements.startDate!, i)));
  for (const city of ['重庆', '西安', '成都', '九寨沟']) assert(result.plan.days.some(d => d.city.includes(city)), `Missing ${city}`);
  console.log(`PASS calendar/coverage: 10 consecutive days, ${result.plan.days[0].date}–${result.plan.days[9].date}, all four destinations. Inspect plan.json for feasibility and unresolved facts.`);
}
void main().catch(error => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
