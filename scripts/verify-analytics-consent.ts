import assert from 'node:assert/strict';
import {chooseAnalytics,readAnalyticsChoice,CONSENT_KEY} from '../src/lib/analytics-consent';
import {recordPageView,type AnalyticsBrowser} from '../src/lib/analytics';
import {recordGrowthEvent} from '../src/lib/growth/analytics';
const originalWindow=Object.getOwnPropertyDescriptor(globalThis,'window'),originalDocument=Object.getOwnPropertyDescriptor(globalThis,'document');
try{
 const stored=new Map<string,string>(),cookies:string[]=[],events:unknown[][]=[];
 const browser:AnalyticsBrowser={location:new URL('https://www.ramblechina.com/en/trip-pack?order=PRIVATE&trip=SECRET'),document:{title:'PRIVATE HOTEL',referrer:''}};
 const bus=new EventTarget();Object.assign(browser,{localStorage:{getItem:(key:string)=>stored.get(key)??null,setItem:(key:string,value:string)=>stored.set(key,value)},dispatchEvent:bus.dispatchEvent.bind(bus)});
 const document={get cookie(){return '_ga=abc; _ga_ID=secret; essential=keep';},set cookie(value:string){cookies.push(value);}};
 Object.assign(globalThis,{window:browser,document});
 assert.equal(readAnalyticsChoice(),null);recordPageView(browser,'G-TEST','/en/trip-pack');assert.equal(browser.dataLayer,undefined);
 chooseAnalytics(false);assert.equal(readAnalyticsChoice(),false);assert.equal(stored.get(CONSENT_KEY),'rejected');assert(cookies.some(v=>v.startsWith('_ga=; Max-Age=0')));assert(cookies.some(v=>v.startsWith('_ga_ID=; Max-Age=0')));assert(!cookies.some(v=>v.startsWith('essential=')));
 chooseAnalytics(true);recordPageView(browser,'G-TEST','/en/trip-pack');assert.equal(readAnalyticsChoice(),true);assert(!JSON.stringify(browser.dataLayer).match(/PRIVATE|SECRET|HOTEL/));
 const connectedLayer=browser.dataLayer!,connectedTag=(...args:unknown[])=>events.push(args);browser.gtag=connectedTag;chooseAnalytics(false);recordGrowthEvent('planner_start',{}, {browser});recordPageView(browser,'G-TEST','/en/account');assert.equal(browser.dataLayer,connectedLayer);assert.equal(connectedLayer.length,0);assert.equal(browser.gtag,connectedTag);assert.equal(browser.__rambleAnalytics?.lastPage,'');assert.equal(browser.__rambleAnalytics?.needsConfiguration,true,'Clearing an unconsumed queue must require destination reconfiguration');assert.equal((browser as unknown as Record<string,unknown>)['ga-disable-G-TEST'],true);assert.equal(events.filter(e=>e[0]==='event').length,0);assert(!JSON.stringify([...stored]).match(/PRIVATE|SECRET|HOTEL|\d{4}-/));
 Object.assign(browser,{localStorage:{getItem:()=>{throw Error('unavailable');},setItem:()=>{throw Error('unavailable');}}});
 chooseAnalytics(true);assert.equal(readAnalyticsChoice(),true,'Explicit acceptance survives inaccessible storage');chooseAnalytics(false);assert.equal(readAnalyticsChoice(),false,'Explicit rejection survives inaccessible storage');
 Object.assign(browser,{localStorage:{getItem:()=> 'rejected',setItem:()=>{throw Error('quota');}}});chooseAnalytics(true);assert.equal(readAnalyticsChoice(),true,'Failed write must not restore a stale persisted rejection');
 console.log('PASS: no choice/reject prevents queues; explicit opt-in; private query/title hygiene; withdrawal disables GA, clears first-party cookies only, clears queue contents while retaining the connection, prevents growth/page events and supports storage-unavailable choice; only choice persisted.');
}finally{if(originalWindow)Object.defineProperty(globalThis,'window',originalWindow);else Reflect.deleteProperty(globalThis,'window');if(originalDocument)Object.defineProperty(globalThis,'document',originalDocument);else Reflect.deleteProperty(globalThis,'document');}
