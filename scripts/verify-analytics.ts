import assert from 'node:assert/strict';
import React, {act, StrictMode} from 'react';
import {create, type ReactTestRenderer} from 'react-test-renderer';
import {PathnameContext} from 'next/dist/shared/lib/hooks-client-context.shared-runtime';
import {GoogleAnalytics} from '../src/components/analytics/GoogleAnalytics';
import {chooseAnalytics} from '../src/lib/analytics-consent';
import {recordGrowthEvent} from '../src/lib/growth/analytics';
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
  return {__rambleAnalyticsConsent:true, location: new URL(url), document: {referrer: 'https://search.example/search?q=private-email@example.com', title: 'Plan a trip'}};
}
const target = browser('https://www.ramblechina.com/en?utm_source=newsletter&utm_medium=email&utm_campaign=autumn&trip=private-id&code=secret#token');
const denied = {...target, __rambleAnalyticsConsent:false};
recordPageView(denied,id,'/en');
assert.equal(denied.dataLayer,undefined,'No consent means no analytics queue');
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

const shared = browser('https://www.ramblechina.com/en/shared/private-share-token?utm_source=community');
recordPageView(shared, id, '/en/shared/private-share-token');
assert.equal((Array.from(shared.dataLayer!.at(-1)!)[2] as Record<string,unknown>).page_location,
  'https://www.ramblechina.com/en/shared?utm_source=community');
assert.equal(shared.__rambleAnalytics!.lastPage, 'https://www.ramblechina.com/en/shared');
shared.location = new URL('https://www.ramblechina.com/en/plan');
recordPageView(shared, id, '/en/plan');
assert.equal((Array.from(shared.dataLayer!.at(-1)!)[2] as Record<string,unknown>).page_referrer, 'https://www.ramblechina.com/en/shared');
assert(!JSON.stringify(shared.dataLayer).includes('private-share-token'), 'Capability tokens never enter events, global gtag settings or later referrers');

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
    const removedCookies:string[]=[];
    const document = {...client.document,
      get cookie(){return '_ga=old; _ga_TEST=old; essential=keep';},
      set cookie(value:string){removedCookies.push(value);},
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
    let storedChoice:string|null=null,storageReadsFail=false,storageWritesFail=false;
    const bus=new EventTarget();
    Object.assign(client,{localStorage:{getItem:()=>{if(storageReadsFail)throw Error('storage blocked');return storedChoice;},setItem:(_key:string,value:string)=>{if(storageWritesFail)throw Error('storage blocked');storedChoice=value;}},addEventListener:bus.addEventListener.bind(bus),removeEventListener:bus.removeEventListener.bind(bus),dispatchEvent:bus.dispatchEvent.bind(bus)});
    Object.assign(globalThis, {window: client, document, IS_REACT_ACT_ENVIRONMENT: true});
    function tree(path: string) {
      return React.createElement(StrictMode, null, React.createElement(PathnameContext.Provider, {value: path}, React.createElement(GoogleAnalyticsTracker, {measurementId: id})));
    }
    await act(async () => {renderer = create(tree('/en'));});
    assert.equal(scripts.length,0,'Default denied: actual Tracker must not load Google');
    assert.equal(client.dataLayer,undefined,'Default denied: no queued pageviews');
    storedChoice='accepted';
    await act(async()=>{bus.dispatchEvent(new Event('ramble-analytics-choice'));});
    assert.equal(scripts.length, 1, 'Next Script loads once after opt-in under Strict Mode');
    assert.equal(scripts[0].src, `https://www.googletagmanager.com/gtag/js?id=${id}`);
    assert.equal(scripts[0].attributes['data-nscript'], 'afterInteractive');
    const views = () => client.dataLayer!.filter(value => value[0] === 'event');
    assert.equal(views().length, 1);
    // Google has not consumed any queued command yet (slow/blocked bootstrap).
    const waitingLayer=(client as AnalyticsBrowser).dataLayer!,waitingTag=(client as AnalyticsBrowser).gtag!;
    await act(async()=>{chooseAnalytics(false);});
    assert.equal(waitingLayer.length,0,'Withdrawal before bootstrap discards initial config and events');
    waitingTag('event','denied-before-bootstrap',{hotel:'PRIVATE HOTEL'});
    recordPageView(client,id,'/en/account');recordGrowthEvent('pack_prepared',{}, {browser:client});
    assert.equal(waitingLayer.length,0,'Denied commands cannot wait for a later bootstrap');
    await act(async()=>{chooseAnalytics(true);});
    assert.equal(client.dataLayer,waitingLayer);assert.equal(client.gtag,waitingTag);
    assert.equal(scripts.length,1,'An in-flight cached script does not bootstrap again on reacceptance');
    // Simulate eventual bootstrap consuming the queue only after renewed acceptance.
    const consumed=waitingLayer.map(command=>Array.from(command));
    let bootstrapped=false,destination=false,automaticViews=0,explicitViews=0;
    for(const command of consumed){
      if(command[0]==='js')bootstrapped=true;
      if(command[0]==='config'){
        assert.equal(bootstrapped,true,'The deferred tag receives its initialization command');
        assert.equal(command[1],id);destination=true;
        const config=command[2] as Record<string,unknown>;
        assert.equal(config.send_page_view,false,'Reconfiguration disables automatic pageviews');
        assert.equal(config.allow_google_signals,false);assert.equal(config.allow_ad_personalization_signals,false);
        if(config.send_page_view!==false)automaticViews++;
      }
      if(command[0]==='event'&&command[1]==='page_view'){
        assert.equal(destination,true,'Deferred bootstrap must configure a destination before the renewed pageview');explicitViews++;
      }
    }
    assert.equal(destination,true,'Renewed consent restores discarded destination configuration');
    assert.equal(automaticViews,0);assert.equal(explicitViews,1);
    assert(!JSON.stringify(consumed).match(/private-id|PRIVATE|denied-before-bootstrap/));
    // A failed remote script never prevents the actual component from navigating.
    await act(async () => {scripts[0].events.error(new Error('Blocked Google script'));});
    client.location = new URL('https://www.ramblechina.com/zh/plan?trip=private-id');
    await act(async () => {renderer!.update(tree('/zh/plan'));});
    assert.equal(views().length, 2);
    assert.equal(scripts.length, 1);
    assert.equal((views()[1][2] as Record<string, unknown>).page_location, 'https://www.ramblechina.com/zh/plan');
    // Model Google's bootstrap instrumenting the existing array, not a replacement queue.
    // The load callback makes Next cache this script's successful initialization.
    const initializedLayer=(client as AnalyticsBrowser).dataLayer!,initializedGtag=(client as AnalyticsBrowser).gtag!;
    const delivered:unknown[][]=[];
    initializedLayer.push=function(...items:IArguments[]){
      for(const item of items)if(!(client as unknown as Record<string,unknown>)[`ga-disable-${id}`])delivered.push(Array.from(item));
      return Array.prototype.push.apply(this,items);
    };
    await act(async()=>{scripts[0].events.load(new Event('load'));});
    await act(async()=>{chooseAnalytics(false);});
    assert.equal(client.dataLayer,initializedLayer,'Withdrawal preserves the initialized Google connection');
    assert.equal(client.gtag,initializedGtag,'Withdrawal preserves the connected gtag function');
    assert.equal(initializedLayer.length,0,'Withdrawal discards previously queued data in place');
    assert(removedCookies.some(value=>value.startsWith('_ga=; Max-Age=0')));
    assert(removedCookies.some(value=>value.startsWith('_ga_TEST=; Max-Age=0')));
    assert(!removedCookies.some(value=>value.startsWith('essential=')));
    const beforeDenied=delivered.length;
    client.location=new URL('https://www.ramblechina.com/en/account?order=secret');
    await act(async()=>{renderer!.update(tree('/en/account'));});
    recordPageView(client,id,'/en/account');recordGrowthEvent('pack_prepared',{locale:'en'},{browser:client});
    initializedGtag('event','private-denied-event',{hotel:'PRIVATE HOTEL'});
    assert.equal(delivered.length,beforeDenied,'Denied page/growth/direct calls never reach the connection');
    assert.equal(initializedLayer.length,0,'Denied calls cannot queue private data for later replay');
    await act(async()=>{chooseAnalytics(true);});
    assert.equal(scripts.length,1,'Cached Next Script does not bootstrap another connection');
    assert.equal(client.dataLayer,initializedLayer);
    assert.equal(client.gtag,initializedGtag);
    assert(delivered.some(value=>value[0]==='event'&&value[1]==='page_view'),'Renewed consent reaches the initialized sink');
    recordGrowthEvent('pack_prepared',{locale:'en'},{browser:client});
    assert(delivered.some(value=>value[1]==='pack_prepared'));
    assert(!JSON.stringify(delivered).match(/secret|PRIVATE|private-denied-event/));
    assert(delivered.some(value=>value[0]==='consent'&&(value[2] as Record<string,unknown>).analytics_storage==='granted'),'Renewed consent also restores tag consent state');
    // Same-page renewed consent must produce a new view, without retaining a private referrer.
    const deliveredViews=()=>delivered.filter(value=>value[1]==='page_view').length;
    const beforeSamePage=deliveredViews();
    await act(async()=>{chooseAnalytics(false);});await act(async()=>{chooseAnalytics(true);});
    assert.equal(deliveredViews(),beforeSamePage+1);
    assert.equal(scripts.length,1);
    storedChoice='rejected';const storageEvent=new Event('storage');Object.assign(storageEvent,{key:'ramble-analytics-choice'});
    await act(async()=>{bus.dispatchEvent(storageEvent);});
    assert.equal(client.__rambleAnalyticsConsent,false,'Cross-tab rejection supersedes the page choice');
    storedChoice='accepted';await act(async()=>{bus.dispatchEvent(storageEvent);});assert.equal(client.__rambleAnalyticsConsent,true);
    storageReadsFail=true;storageWritesFail=true;
    await act(async()=>{chooseAnalytics(false);});assert.equal(client.__rambleAnalyticsConsent,false);
    const beforeEphemeral=deliveredViews();await act(async()=>{chooseAnalytics(true);});
    assert.equal(client.__rambleAnalyticsConsent,true,'Actual Tracker retains explicit acceptance when all storage fails');
    assert.equal(deliveredViews(),beforeEphemeral+1);
    storageReadsFail=false;storedChoice='rejected';await act(async()=>{chooseAnalytics(false);});
    const beforeStale=deliveredViews();await act(async()=>{chooseAnalytics(true);});
    assert.equal(deliveredViews(),beforeStale+1,'Failed persistence cannot restore stale rejection during the consent event');
    assert.equal(client.dataLayer,initializedLayer);assert.equal(scripts.length,1);
    console.log('PASS: actual Tracker default-denial, slow-bootstrap renewed config with zero automatic/one explicit view, cached-script accept/withdraw/reaccept with initialized sink, denied direct/page/growth calls, queue discard, cookie clearing, cross-tab choices and inaccessible/stale storage fallback; production/config guards; initial, bilingual, return and deduplicated views; campaign attribution and private URL cleanup; session reuse; actual Next Script/Strict Mode/router integration and blocked-script recovery. No test traffic is sent to Google.');
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
