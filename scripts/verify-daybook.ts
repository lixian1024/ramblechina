import {controlledTravel} from './fixtures/admitted-travel-routes';
import assert from 'node:assert/strict';
import { cards,entrances,places,sources,validateOptions,defaultOptions,preflight } from '../src/lib/content/beijing-day';
import { searchPlaces,walkBetweenGates,AmapError } from '../src/lib/amap/client';
import { normalizeGooglePlace } from '../src/lib/travel/google-maps';
import { googlePoi } from './fixtures/google-provider';
import { isDate } from '../src/lib/content/schema';
async function main(){
 assert.equal(isDate('2026-02-30'),false);assert.equal(isDate('2028-02-29'),true);
 assert.throws(()=>validateOptions({...defaultOptions,people:0}));assert.throws(()=>validateOptions({...defaultOptions,date:'2026-13-01'}));assert.throws(()=>validateOptions({...defaultOptions,cardIds:['unknown']}));
 for(const card of cards)assert(entrances.some(e=>e.id===card.entranceId));for(const e of entrances){assert(places.some(p=>p.id===e.placeId));assert.equal(e.vehicleDropoff.value,null);assert.equal(e.coordinates.value,null);}
 for(const p of places)for(const fact of [p.address,p.reservation,p.access]){if(fact.state==='verified'){assert(fact.checkedAt);assert(fact.sourceIds.length);for(const id of fact.sourceIds)assert(sources.some(s=>s.id===id));}}
 assert(preflight({...defaultOptions,date:'2026-09-28',confirmed:['reservation']},'2026-09-27').some(i=>i.id==='monday'));
 assert(preflight({...defaultOptions,date:'2026-09-01'},'2026-09-27').some(i=>i.id==='past'));
 assert(preflight({...defaultOptions,date:'2027-01-01'},'2026-09-27').some(i=>i.id==='freshness'));
 const raw={id:'B00000001',name:'故宫博物院神武门',location:'116.397,39.923',adcode:'110000',address:[],business:{tel:[],opentime_today:[]}};
 const origin=normalizeGooglePlace(googlePoi(raw))!;assert.equal(origin.address,'');assert.equal(origin.point.system,'WGS84');assert.equal(normalizeGooglePlace(googlePoi({...raw,location:'0,0'})),undefined);
 const originalFetch=globalThis.fetch,originalKey=process.env.GOOGLE_MAPS_SERVER_API_KEY;
 try{
 delete process.env.GOOGLE_MAPS_SERVER_API_KEY;await assert.rejects(searchPlaces('故宫'),e=>e instanceof AmapError&&e.code==='NOT_CONFIGURED');
 process.env.GOOGLE_MAPS_SERVER_API_KEY='test-only-secret';
 globalThis.fetch=async()=>Response.json({error:{message:'test-only-secret'}},{status:403});
 await assert.rejects(searchPlaces('故宫'),e=>e instanceof AmapError&&e.code==='PROVIDER_ERROR'&&!e.message.includes('test-only-secret'));
 globalThis.fetch=async()=>Response.json({error:{}},{status:429});await assert.rejects(searchPlaces('故宫'),e=>e instanceof AmapError&&e.status===429);
 globalThis.fetch=async()=>{throw Error('test-only-secret')};await assert.rejects(searchPlaces('故宫'),e=>e instanceof AmapError&&e.code==='UNAVAILABLE'&&!e.message.includes('secret'));
 globalThis.fetch=async()=>new Response('bad');await assert.rejects(searchPlaces('故宫'),e=>e instanceof AmapError&&e.code==='INVALID_RESPONSE');
 globalThis.fetch=async()=>Response.json({places:[]});assert.deepEqual(await searchPlaces('故宫'),[]);
 let routeCalls=0;
 globalThis.fetch=async input=>{const url=new URL(String(input));assert(['places.googleapis.com','routes.googleapis.com'].includes(url.hostname));if(url.hostname==='routes.googleapis.com'){routeCalls++;return Response.json({routes:[]});}return Response.json(googlePoi({...raw,name:'错误的入口'}));};
 await assert.rejects(walkBetweenGates('B00000001','B00000002'),e=>e instanceof AmapError&&e.code==='WRONG_GATE');assert.equal(routeCalls,0);
 const encode=(points:number[][])=>{let lat=0,lng=0,s='';const part=(d:number)=>{let n=d<0?~(d<<1):d<<1;while(n>=32){s+=String.fromCharCode((32|(n&31))+63);n>>=5;}s+=String.fromCharCode(n+63);};for(const p of points){const a=Math.round(p[0]*1e5),b=Math.round(p[1]*1e5);part(a-lat);part(b-lng);lat=a;lng=b;}return s;};
 globalThis.fetch=async(input,init)=>{const url=new URL(String(input));if(url.hostname==='routes.googleapis.com'){routeCalls++;assert.equal(JSON.parse(String(init?.body)).travelMode,'WALK');return Response.json({routes:[{distanceMeters:250,duration:'210s',polyline:{encodedPolyline:encode([[39.923,116.397],[39.924,116.397]])},legs:[{steps:[{navigationInstruction:{instructions:'Walk north'},distanceMeters:250}]}]}]});}return Response.json(googlePoi({...raw,id:url.pathname.endsWith('B00000001')?'B00000001':'B00000002',name:url.pathname.endsWith('B00000001')?'故宫博物院神武门':'景山公园南门'}));};
 const route=await walkBetweenGates('B00000001','B00000002');assert.equal(route.distanceMetres,250);assert.equal(route.durationSeconds,210);assert.equal(route.steps[0].instruction,'Walk north');assert.equal(route.coordinates.length,2);
 const healthyFetch=globalThis.fetch;globalThis.fetch=async(input,init)=>new URL(String(input)).hostname==='routes.googleapis.com'?Response.json({routes:[]}):healthyFetch(input,init);await assert.rejects(walkBetweenGates('B00000001','B00000002'),e=>e instanceof AmapError&&e.code==='NO_ROUTE');
 }finally{globalThis.fetch=originalFetch;if(originalKey===undefined)delete process.env.GOOGLE_MAPS_SERVER_API_KEY;else process.env.GOOGLE_MAPS_SERVER_API_KEY=originalKey;}
 console.log('PASS: content references, date and input validation, readiness, Google normalization, missing key, auth/quota/network/invalid response, empty search, wrong gate rejection and outdoor route.');
}controlledTravel(main).catch(e=>{console.error(e);process.exitCode=1});
