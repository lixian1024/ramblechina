import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const nonempty = value => typeof value === 'string' && value.trim().length > 0;
export function validateSuite(suite) {
  if (!Number.isInteger(suite.suiteVersion) || suite.suiteVersion < 1 || suite.scope !== 'china-unfold/ramble-china' || !Array.isArray(suite.cases) || !suite.cases.length) throw Error('Invalid suite metadata');
  const ids = new Set();
  for (const item of suite.cases) {
    if (!nonempty(item.id) || ids.has(item.id) || !nonempty(item.title) || !nonempty(item.input) || !Array.isArray(item.steps) || !item.steps.length || !item.steps.every(nonempty) || !Array.isArray(item.checks) || !item.checks.length) throw Error('Invalid or duplicate case');
    if (!Array.isArray(item.variants) || !item.variants.length || !item.variants.every(nonempty) || new Set(item.variants).size !== item.variants.length) throw Error('Invalid variant coverage');
    ids.add(item.id);
    for (const check of item.checks) {
      if (!nonempty(check.id) || ids.has(check.id) || !nonempty(check.expect)) throw Error('Invalid or duplicate check');
      ids.add(check.id);
    }
  }
  return suite;
}
const fingerprint = suite => createHash('sha256').update(JSON.stringify(suite)).digest('hex');
export function makeReport(suite) {
  validateSuite(suite);
  return { suiteVersion: suite.suiteVersion, suiteFingerprint: fingerprint(suite), generatedAt: new Date().toISOString(), testedAt: '', tester: '', build: '', environment: '', model: '', promptVersion: '', results: suite.cases.map(item => ({ caseId: item.id, coverage: item.variants.map(variant => ({ variant, status: 'not-run', evidence: '' })), checks: item.checks.map(check => ({ checkId: check.id, status: 'not-run', evidence: '' })) })) };
}
export function gate(suite, report) {
  validateSuite(suite);
  const errors = [];
  if (report.suiteVersion !== suite.suiteVersion || report.suiteFingerprint !== fingerprint(suite)) errors.push('Suite changed: generate a new report and rerun');
  for (const field of ['testedAt', 'tester', 'build', 'environment', 'model', 'promptVersion']) if (!nonempty(report[field])) errors.push(`Missing ${field} (use n/a with reason if no model/prompt)`);
  if (!Number.isFinite(Date.parse(report.testedAt)) || Date.parse(report.testedAt) > Date.now()) errors.push('Invalid or future testedAt');
  if (!Array.isArray(report.results)) return [...errors, 'Missing results'];
  if (report.results.length !== suite.cases.length || new Set(report.results.map(item => item.caseId)).size !== suite.cases.length) errors.push('Missing, duplicate or extra cases');
  for (const item of suite.cases) {
    const result = report.results.find(row => row.caseId === item.id);
    if (!result || !Array.isArray(result.checks)) { errors.push(`${item.id}: missing checks`); continue; }
    if (!Array.isArray(result.coverage) || result.coverage.length !== item.variants.length || new Set(result.coverage.map(row => row.variant)).size !== item.variants.length) errors.push(`${item.id}: invalid variant coverage`);
    for (const variant of item.variants) {
      const actual = result.coverage?.find(row => row.variant === variant);
      if (!actual || actual.status !== 'pass' || !nonempty(actual.evidence)) errors.push(`${item.id}/${variant}: incomplete coverage or missing evidence`);
    }
    if (result.checks.length !== item.checks.length || new Set(result.checks.map(row => row.checkId)).size !== item.checks.length) errors.push(`${item.id}: missing, duplicate or extra checks`);
    for (const check of item.checks) {
      const actual = result.checks.find(row => row.checkId === check.id);
      if (!actual || actual.status !== 'pass' || !nonempty(actual.evidence)) errors.push(`${check.id}: ${actual?.status ?? 'missing'} or missing evidence`);
    }
  }
  return errors;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const suite = validateSuite(JSON.parse(readFileSync(new URL('../evals/ramble-china/cases.json', import.meta.url), 'utf8')));
    const [command, file] = process.argv.slice(2);
    if (command === 'validate') console.log(`Valid definitions: ${suite.cases.length} cases. Product tests have not run.`);
    else if (command === 'init' && file) {
      writeFileSync(resolve(file), JSON.stringify(makeReport(suite), null, 2) + '\n', { flag: 'wx' });
      console.log(`Created ${file}: all cases not-run.`);
    } else if (command === 'gate' && file) {
      const errors = gate(suite, JSON.parse(readFileSync(resolve(file), 'utf8')));
      if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
      else console.log('Recorded product checks passed. Evidence still requires review.');
    } else throw Error('Usage: node scripts/product-evals.mjs validate | init <report.json> | gate <report.json>');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
