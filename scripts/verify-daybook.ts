import assert from 'node:assert/strict';
import { cards,entrances,places,sources,validateOptions,defaultOptions,preflight } from '../src/lib/content/beijing-day';
import { normalizePoi,normalizeWalk,searchPlaces,walkBetweenGates,AmapError } from '../src/lib/amap/client';
import { isDate } from '../src/lib/content/schema';
async function main(){
 assert.equal(isDate('2026-02-30'),false);assert.equal(isDate('2028-02-29'),true);
 assert.throws(()=>validateOptions({...defaultOptions,people:0}));assert.throws(()=>validateOptions({...defaultOptions,date:'2026-13-01'}));assert.throws(()=>validateOptions({...defaultOptions,cardIds:['unknown']}));
 for(const card of cards)assert(entrances.some(e=>e.id===card.entranceId));for(const e of entrances){assert(places.some(p=>p.id===e.placeId));assert.equal(e.vehicleDropoff.value,null);assert.equal(e.coordinates.value,null);}
 for(const p of places)for(const fact of [p.address,p.reservation,p.access]){if(fact.state==='verified'){assert(fact.checkedAt);assert(fact.sourceIds.length);for(const id of fact.sourceIds)assert(sources.some(s=>s.id===id));}}
 assert(preflight({...defaultOptions,date:'2026-09-28',confirmed:['reservation']},'2026-09-27').some(i=>i.id==='monday'));
 assert(preflight({...defaultOptions,date:'2026-09-01'},'2026-09-27').some(i=>i.id==='past'));
 assert(preflight({...defaultOptions,date:'2027-01-01'},'2026-09-27').some(i=>i.id==='freshness'));
 const raw={id:'B00000001',name:'故宫博物院神武门',location:'116.397,39.923',address:[],business:{tel:[],opentime_today:[]}};
 const origin=normalizePoi(raw,'2026-09-27')!;assert.equal(origin.address,'');assert.equal(origin.coordinates.system,'GCJ-02');assert.equal(normalizePoi({...raw,location:'0,0'},''),null);
 const destination=normalizePoi({...raw,id:'B00000002',name:'景山公园南门'},'2026-09-27')!;
 assert.throws(()=>normalizeWalk({route:{paths:[]}},origin,destination,''),AmapError);
 assert.equal(normalizeWalk({route:{paths:[{distance:'500',cost:{duration:'600'},steps:[]}]}},origin,destination,'').durationSeconds,600);
 const originalFetch=globalThis.fetch,originalKey=process.env.AMAP_WEB_SERVICE_KEY;
 try{
 delete process.env.AMAP_WEB_SERVICE_KEY;await assert.rejects(searchPlaces('故宫'),e=>e instanceof AmapError&&e.code==='NOT_CONFIGURED');
 process.env.AMAP_WEB_SERVICE_KEY='test-only-secret';
 globalThis.fetch=async()=>Response.json({status:'0',infocode:'10001',info:'test-only-secret'});
 await assert.rejects(searchPlaces('故宫'),e=>e instanceof AmapError&&e.code==='CONFIGURATION'&&!e.message.includes('test-only-secret'));
 globalThis.fetch=async()=>Response.json({status:'0',infocode:'10003'});await assert.rejects(searchPlaces('故宫'),e=>e instanceof AmapError&&e.status===429);
 globalThis.fetch=async()=>{throw Error('test-only-secret')};await assert.rejects(searchPlaces('故宫'),e=>e instanceof AmapError&&e.code==='UPSTREAM_UNAVAILABLE'&&!e.message.includes('secret'));
 globalThis.fetch=async()=>new Response('bad');await assert.rejects(searchPlaces('故宫'),e=>e instanceof AmapError&&e.code==='INVALID_RESPONSE');
 globalThis.fetch=async()=>Response.json({status:'1',pois:[]});assert.deepEqual(await searchPlaces('故宫'),[]);
 let routeCalls=0;
 globalThis.fetch=async input=>{const url=new URL(String(input));assert.equal(url.hostname,'restapi.amap.com');if(url.pathname.includes('direction')){routeCalls++;return Response.json({status:'1',route:{paths:[]}});}return Response.json({status:'1',pois:[{...raw,name:'错误的入口'}]});};
 await assert.rejects(walkBetweenGates('B00000001','B00000002'),e=>e instanceof AmapError&&e.code==='WRONG_GATE');assert.equal(routeCalls,0);
 globalThis.fetch=async input=>{const url=new URL(String(input));if(url.pathname.includes('direction')){routeCalls++;return Response.json({status:'1',route:{paths:[{distance:'250',cost:{duration:'210'},steps:[{instruction:'步行',distance:'250',polyline:'116.397,39.923;116.397,39.924'}]}]}});}return Response.json({status:'1',pois:[{...raw,name:url.searchParams.get('id')==='B00000001'?'故宫博物院神武门':'景山公园南门'}]});};
 const route=await walkBetweenGates('B00000001','B00000002');assert.equal(route.distanceMetres,250);assert.equal(route.coordinates.length,2);
 }finally{globalThis.fetch=originalFetch;if(originalKey===undefined)delete process.env.AMAP_WEB_SERVICE_KEY;else process.env.AMAP_WEB_SERVICE_KEY=originalKey;}
 console.log('PASS: content references, date and input validation, readiness, Amap normalization, missing key, auth/quota/network/invalid response, empty search, wrong gate rejection and outdoor route.');
}main().catch(e=>{console.error(e);process.exitCode=1});
