import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { guideRequestSchema, type GuideRequest } from '../src/lib/travel/guide-request';
import { GuideRequestConflict, saveGuideRequest } from '../src/lib/travel/guide-request-store';
import { receiveGuideRequest } from '../src/lib/travel/guide-request-handler';
import { formatGuideDestinations } from '../src/lib/travel/guide-request-options';

async function main() {
const directory = await mkdtemp(path.join(os.tmpdir(), 'ramble-guide-test-'));
const input = {
  requestId: randomUUID(), name: 'QA Traveler', email: 'qa@example.invalid', destinations: 'Shanghai',
  startDate: '', endDate: '', travelers: 2, guideLanguage: 'English', budget: '', notes: 'Architecture and food', consent: true as const, website: '',
};
function request(body: unknown, origin = 'http://localhost:3001') {
  return new Request('http://localhost:3001/api/local-guide-requests', { method: 'POST', headers: { origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
}
try {
  const save = (data: GuideRequest) => saveGuideRequest(data, directory);
  const response = await receiveGuideRequest(request(input), save);
  assert.equal(response.status, 201);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  const receipt = await response.json();
  const stored = JSON.parse(await readFile(path.join(directory, `${input.requestId}.json`), 'utf8'));
  assert.deepEqual(stored.request, input);
  assert.equal(stored.reference, receipt.reference);
  assert.equal(stored.status, 'new');
  assert.equal((await stat(path.join(directory, `${input.requestId}.json`))).mode & 0o777, 0o600);
  assert.equal('request' in receipt, false, 'The response must not echo contact details');

  const preferences = { ...input, requestId: randomUUID(), destinations: formatGuideDestinations(['Shenzhen', 'Chengdu'], ' Jiuzhaigou '), guideLanguage: 'French', budget: 'USD 1,000–3,000' };
  const preferenceResponse = await receiveGuideRequest(request(preferences), save);
  assert.equal(preferenceResponse.status, 201);
  const preferenceRecord = JSON.parse(await readFile(path.join(directory, `${preferences.requestId}.json`), 'utf8'));
  assert.equal(preferenceRecord.request.destinations, 'Shenzhen, Chengdu, Jiuzhaigou');
  assert.equal(preferenceRecord.request.guideLanguage, 'French');
  assert.equal(preferenceRecord.request.budget, 'USD 1,000–3,000');
  // Clear this separate synthetic fixture before checking retry file counts.
  await rm(path.join(directory, `${preferences.requestId}.json`));

  const retries = await Promise.all(Array.from({ length: 6 }, () => saveGuideRequest(input, directory)));
  retries.forEach(result => assert.deepEqual(result, receipt));
  assert.deepEqual(await readdir(directory), [`${input.requestId}.json`]);
  const concurrent = { ...input, requestId: randomUUID() };
  const concurrentResults = await Promise.all(Array.from({ length: 5 }, () => saveGuideRequest(concurrent, directory)));
  concurrentResults.forEach(result => assert.deepEqual(result, concurrentResults[0]));
  await assert.rejects(() => saveGuideRequest({ ...input, notes: 'Changed request' }, directory), GuideRequestConflict);
  const conflict = await receiveGuideRequest(request({ ...input, notes: 'Changed request' }), save);
  assert.equal(conflict.status, 409);
  assert.equal((await conflict.json()).retryWithNewId, true);

  let writes = 0;
  const shouldNotSave = async () => { writes++; throw new Error('Should not save'); };
  for (const patch of [
    { email: 'invalid' }, { destinations: '  ' }, { travelers: 0 }, { travelers: 1.5 },
    { consent: false }, { notes: 'a'.repeat(2001) }, { website: 'bot.example' },
    { startDate: '2027-02-30' }, { startDate: '2027-99-99' },
    { endDate: '2027-10-11' }, { startDate: '2027-10-12', endDate: '2027-10-11' },
    { requestId: '../../outside' },
  ]) {
    const invalid = await receiveGuideRequest(request({ ...input, ...patch }), shouldNotSave);
    assert.equal(invalid.status, 400, JSON.stringify(patch));
  }
  assert.equal(writes, 0);
  assert.equal((await receiveGuideRequest(request(input, 'https://other.example'), shouldNotSave)).status, 403);
  assert.equal((await receiveGuideRequest(request({ ...input, notes: 'x'.repeat(13000) }), shouldNotSave)).status, 413);
  const malformed = new Request('http://localhost:3001/api/local-guide-requests', { method: 'POST', headers: { origin: 'http://localhost:3001', 'Content-Type': 'application/json' }, body: '{' });
  assert.equal((await receiveGuideRequest(malformed, shouldNotSave)).status, 400);
  assert(guideRequestSchema.safeParse({ ...input, startDate: '2027-10-11', endDate: '2027-10-11' }).success);

  const broken = path.join(directory, 'not-a-directory'); await writeFile(broken, 'QA');
  const failed = await receiveGuideRequest(request(input), value => saveGuideRequest(value, broken));
  assert.equal(failed.status, 503, 'Storage failures must not return success');
  assert.equal((await failed.json()).error.includes('could not be saved'), true);
  console.log('PASS: durable private guide request, receipt, validation, date conflicts, retry deduplication, concurrent writes and storage failure.');
} finally { await rm(directory, { recursive: true, force: true }); }
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
