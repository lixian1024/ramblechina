import assert from 'node:assert/strict';
import {recordGrowthEvent, type GrowthBrowser} from '../src/lib/growth/analytics';

const events: unknown[][] = [];
const browser: GrowthBrowser = {__rambleAnalyticsConsent:true, location: new URL('https://www.ramblechina.com/en/plan?trip=private-trip'),
  __rambleAnalytics: {measurementId: 'G-QBCYPGN6SB', lastPage: 'https://www.ramblechina.com/en/plan'},
  gtag: (...args: unknown[]) => {events.push(args);}};
const parameters = {locale: 'en', actor: 'guest', days: 3} as const;
recordGrowthEvent('planner_start', parameters, {browser:{...browser,__rambleAnalyticsConsent:false}});
assert.equal(events.length,0,'No consent means no growth events');
recordGrowthEvent('planner_start', parameters, {browser});
recordGrowthEvent('planner_error', {...parameters, operation: 'generate', failure: 'aborted'}, {browser});
assert.equal(events.length, 2);
assert.equal(events.filter(event => event[1] === 'itinerary_generated').length, 0, 'An abort cannot become a generation success');
recordGrowthEvent('itinerary_generated', parameters, {browser, dedupeKey: 'private-response-key'});
recordGrowthEvent('itinerary_generated', parameters, {browser, dedupeKey: 'private-response-key'});
assert.equal(events.filter(event => event[1] === 'itinerary_generated').length, 1, 'Repeated delivery of one confirmed result counts once');
recordGrowthEvent('itinerary_generated', parameters, {browser, dedupeKey: 'different-response'});
assert.equal(events.filter(event => event[1] === 'itinerary_generated').length, 2, 'A separate confirmed generation remains measurable');
recordGrowthEvent('planner_error', {operation: 'save', failure: 'storage'}, {browser});
assert.equal(events.filter(event => event[1] === 'itinerary_saved').length, 0, 'Save failure must not count as a save');
for (const name of ['sign_up','itinerary_first_edit','itinerary_saved','share_created','share_revoked','research_requested','pack_prepared','pack_checkout_started','pack_regenerated'] as const) {
  recordGrowthEvent(name, {locale: 'zh', actor: 'account'}, {browser, dedupeKey: 'confirmed-operation'});
  recordGrowthEvent(name, {locale: 'zh', actor: 'account'}, {browser, dedupeKey: 'confirmed-operation'});
  assert.equal(events.filter(event => event[1] === name).length, 1);
}
const before = events.length;
for (const bad of [{email: 'secret@example.com'}, {itinerary_id: 'private-trip'}, {locale: 'private-name'}, {days: 99}, {operation: 'raw prompt'}, {utm_source: 'person@example.com'}]) {
  recordGrowthEvent('itinerary_generated', bad as never, {browser});
}
recordGrowthEvent('raw private event' as never, {}, {browser});
assert.equal(events.length, before, 'Reject unapproved keys, values and events at runtime');
assert(!JSON.stringify(events).match(/private|secret|example\.com|confirmed-operation|different-response/));
for (const origin of ['http://localhost:3000', 'https://preview.vercel.app', 'https://www.ramblechina.com.evil.test']) {
  recordGrowthEvent('planner_start', {}, {browser: {...browser, location: new URL(origin)}});
}
assert.equal(events.length, before, 'Development and preview traffic must not enter production GA4');
assert.doesNotThrow(() => recordGrowthEvent('planner_start', {}, {browser: {...browser, gtag: () => {throw Error('blocked');}}}));
console.log('PASS: bounded growth events, confirmed-outcome deduplication, failure isolation, strict PII rejection and blocked analytics recovery.');
