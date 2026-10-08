import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateSuite, makeReport, gate } from './product-evals.mjs';
const suite = JSON.parse(readFileSync(new URL('../evals/ramble-china/cases.json', import.meta.url), 'utf8'));
function passing() {
  const report = makeReport(suite);
  Object.assign(report, { testedAt: new Date().toISOString(), tester: 'Infrastructure fixture', build: 'fixture-only', environment: 'unit-test', model: 'n/a: fixture', promptVersion: 'n/a: fixture' });
  for (const row of report.results) for (const check of [...row.checks, ...row.coverage]) Object.assign(check, { status: 'pass', evidence: 'Synthetic evidence for gate unit test only' });
  return report;
}
test('definitions valid; duplicate and empty suites rejected', () => {
  assert.equal(validateSuite(suite), suite);
  assert.throws(() => validateSuite({ ...suite, cases: [] }));
  assert.throws(() => validateSuite({ ...suite, cases: [...suite.cases, suite.cases[0]] }));
});
test('fresh reports never pass; complete recorded checks pass', () => {
  assert.ok(gate(suite, makeReport(suite)).length);
  assert.deepEqual(gate(suite, passing()), []);
});
test('every failure, blocker, missing evidence and unknown status fails', () => {
  for (const status of ['fail', 'blocked', 'not-run', 'unknown']) {
    const report = passing(); report.results[0].checks[0].status = status;
    assert.ok(gate(suite, report).length);
  }
  const report = passing(); report.results[0].checks[0].evidence = ' ';
  assert.ok(gate(suite, report).length);
});
test('missing, duplicate and extra cases/checks fail', () => {
  for (const mutate of [r => r.results.pop(), r => r.results.push(r.results[0]), r => r.results[1] = r.results[0], r => r.results[0].checks.pop(), r => r.results[0].checks.push(r.results[0].checks[0]), r => r.results[0].checks[1] = r.results[0].checks[0]]) {
    const report = passing(); mutate(report); assert.ok(gate(suite, report).length);
  }
});
test('changed suite contents or version invalidate report', () => {
  const changed = structuredClone(suite); changed.cases[0].checks[0].expect += ' changed';
  assert.ok(gate(changed, passing()).length);
  assert.ok(gate({ ...suite, suiteVersion: suite.suiteVersion + 1 }, passing()).length);
});

test('locale/module coverage cannot be omitted or marked untested', () => {
  for (const mutate of [r => r.results.at(-1).coverage.pop(), r => r.results.at(-1).coverage[0].status = 'not-run', r => r.results.at(-1).coverage[0].evidence = '', r => r.results.at(-1).coverage[1] = r.results.at(-1).coverage[0]]) {
    const report = passing(); mutate(report); assert.ok(gate(suite, report).length);
  }
});
