import assert from 'node:assert/strict';
import React, {act, StrictMode} from 'react';
import {create, type ReactTestRenderer} from 'react-test-renderer';
import {PathnameContext} from 'next/dist/shared/lib/hooks-client-context.shared-runtime';
import {GoogleAnalytics} from '../src/components/analytics/GoogleAnalytics';
import {GoogleAnalyticsTracker} from '../src/components/analytics/GoogleAnalyticsTracker';
import {analyticsMeasurementId, DEFAULT_GA_MEASUREMENT_ID, recordPageView, type AnalyticsBrowser} from '../src/lib/analytics';

const id = 'G-TEST123456';
assert.equal(analyticsMeasurementId(id, 'production', 'production'), id);
assert.equal(analyticsMeasurementId(` ${id} `, 'production'), id);
for (const value of [undefined, '', 'UA-123-1', 'G-<script>', 'G-ABC?x=1']) {
  assert.equal(analyticsMeasurementId(value, 'production'), null);
}
assert.equal(analyticsMeasurementId(id, 'development'), null);
assert.equal(analyticsMeasurementId(id, 'production', 'preview'), null);
assert.equal(analyticsMeasurementId(id, 'production', 'development'), null);

function browser(url: string): AnalyticsBrowser {
  return {location: new URL(url), document: {referrer: 'https://search.example/search?q=private-email@example.com', title: 'Plan a trip'}};
}
const target = browser('https://www.ramblechina.com/en?utm_source=newsletter&utm_medium=email&utm_campaign=autumn&trip=private-id&code=secret#token');
recordPageView(target, id, '/en');
const commands = () => target.dataLayer!.map(value => Array.from(value));
assert.equal(commands().filter(value => value[0] === 'js').length, 1);
const config = commands().find(value => value[0] === 'config')!;
assert.equal(config[1], id);
assert.equal((config[2] as Record<string, unknown>).send_page_view, false);
assert.equal((config[2] as Record<string, unknown>).allow_google_signals, false);
assert.equal((config[2] as Record<string, unknown>).allow_ad_personalization_signals, false);
let views = commands().filter(value => value[0] === 'event');
assert.equal(views.length, 1);
const first = views[0][2] as Record<string, unknown>;
assert.equal(first.page_location, 'https://www.ramblechina.com/en?utm_source=newsletter&utm_medium=email&utm_campaign=autumn');
assert.equal(first.page_referrer, 'https://search.example/');
assert.equal(first.page_title, 'Plan a trip');

recordPageView(target, id, '/en');
target.location = new URL('https://www.ramblechina.com/en?trip=another-id');
recordPageView(target, id, '/en');
assert.equal(commands().filter(value => value[0] === 'event').length, 1, 'Rerenders, Strict Mode and query changes must not double count');
target.location = new URL('https://www.ramblechina.com/zh/plan?trip=private-id&next=secret#private');
recordPageView(target, id, '/zh/plan');
views = commands().filter(value => value[0] === 'event');
assert.equal(views.length, 2);
assert.equal((views[1][2] as Record<string, unknown>).page_location, 'https://www.ramblechina.com/zh/plan');
assert.equal((views[1][2] as Record<string, unknown>).page_referrer, 'https://www.ramblechina.com/en');
assert.equal(commands().filter(value => value[0] === 'config').length, 1, 'Navigation must reuse the same analytics session');
target.location = new URL('https://www.ramblechina.com/en');
recordPageView(target, id, '/en');
assert.equal(commands().filter(value => value[0] === 'event').length, 3, 'Returning to an earlier page is a real view');
assert(!JSON.stringify(commands()).match(/private-id|another-id|secret|token|private-email/));

for (const origin of ['http://localhost:3000', 'http://127.0.0.1:3000', 'https://preview.vercel.app', 'https://www.ramblechina.com.evil.test']) {
  const excluded = browser(origin + '/en');
  recordPageView(excluded, id, '/en');
  assert.equal(excluded.dataLayer, undefined);
}
const bare = browser('https://ramblechina.com/zh');
bare.document = {referrer: 'not a valid URL', title: '首页'};
recordPageView(bare, id, '/zh');
assert.equal((Array.from(bare.dataLayer!.at(-1)!)[2] as Record<string, unknown>).page_referrer, '');
const blocked = browser('https://www.ramblechina.com/en');
blocked.gtag = () => { throw new Error('Blocked analytics'); };
assert.doesNotThrow(() => recordPageView(blocked, id, '/en'), 'Analytics failures must not break the site');

async function verifyComponents() {
  const savedEnv = {id: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID, mode: process.env.NODE_ENV, deployment: process.env.VERCEL_ENV};
  const savedWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const savedDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  let renderer: ReactTestRenderer | undefined;
  try {
    Object.assign(process.env, {NODE_ENV: 'production', VERCEL_ENV: 'production'});
    delete process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
    assert.equal(DEFAULT_GA_MEASUREMENT_ID, 'G-QBCYPGN6SB');
    const configured = GoogleAnalytics()!;
    assert.equal(configured.props.children.props.measurementId, DEFAULT_GA_MEASUREMENT_ID, 'Production uses the owner-supplied web stream without extra deployment configuration');
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = '';
    assert.equal(GoogleAnalytics(), null, 'An explicit blank ID disables the configured web stream');
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = id;
    assert.equal(GoogleAnalytics()!.props.children.props.measurementId, id, 'An explicit deployment ID overrides the public default');
    process.env.VERCEL_ENV = 'preview';
    assert.equal(GoogleAnalytics(), null);
    Object.assign(process.env, {NODE_ENV: 'development', VERCEL_ENV: 'production'});
    assert.equal(GoogleAnalytics(), null);

    const client = browser('https://www.ramblechina.com/en?trip=private-id');
    const scripts: {src?: string; attributes: Record<string, string>; events: Record<string, (event: unknown) => void>}[] = [];
    const document = {...client.document,
      createElement(tag: string) {
        assert.equal(tag, 'script');
        const element = {src: '', attributes: {} as Record<string, string>, events: {} as Record<string, (event: unknown) => void>,
          setAttribute(key: string, value: string) {this.attributes[key] = value;},
          removeAttribute(key: string) {delete this.attributes[key];},
          addEventListener(key: string, callback: (event: unknown) => void) {this.events[key] = callback;},
        };
        return element;
      },
      body: {appendChild(element: typeof scripts[number]) {scripts.push(element);}},
    };
    Object.assign(globalThis, {window: client, document, IS_REACT_ACT_ENVIRONMENT: true});
    function tree(path: string) {
      return React.createElement(StrictMode, null, React.createElement(PathnameContext.Provider, {value: path}, React.createElement(GoogleAnalyticsTracker, {measurementId: id})));
    }
    await act(async () => {renderer = create(tree('/en'));});
    assert.equal(scripts.length, 1, 'Next Script loads once under Strict Mode');
    assert.equal(scripts[0].src, `https://www.googletagmanager.com/gtag/js?id=${id}`);
    assert.equal(scripts[0].attributes['data-nscript'], 'afterInteractive');
    const views = () => client.dataLayer!.filter(value => value[0] === 'event');
    assert.equal(views().length, 1);
    // A failed remote script never prevents the actual component from navigating.
    await act(async () => {scripts[0].events.error(new Error('Blocked Google script'));});
    client.location = new URL('https://www.ramblechina.com/zh/plan?trip=private-id');
    await act(async () => {renderer!.update(tree('/zh/plan'));});
    assert.equal(views().length, 2);
    assert.equal(scripts.length, 1);
    assert.equal((views()[1][2] as Record<string, unknown>).page_location, 'https://www.ramblechina.com/zh/plan');
    console.log('PASS: production/config guards; initial, bilingual, return and deduplicated views; campaign attribution and private URL cleanup; session reuse; actual Next Script/Strict Mode/router integration and blocked-script recovery. No test traffic is sent to Google.');
  } finally {
    if (renderer) await act(async () => {renderer!.unmount();});
    for (const [key, value] of Object.entries({NEXT_PUBLIC_GA_MEASUREMENT_ID: savedEnv.id, NODE_ENV: savedEnv.mode, VERCEL_ENV: savedEnv.deployment})) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
    if (savedWindow) Object.defineProperty(globalThis, 'window', savedWindow); else Reflect.deleteProperty(globalThis, 'window');
    if (savedDocument) Object.defineProperty(globalThis, 'document', savedDocument); else Reflect.deleteProperty(globalThis, 'document');
  }
}
verifyComponents().catch(error => {console.error(error); process.exitCode = 1;});
