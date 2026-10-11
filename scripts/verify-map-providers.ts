/** Direct Google/Amap integration contracts with injected HTTP responses, never live Evals. */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { findGooglePlace, googleRoute, normalizeGooglePlace, photosForGooglePlaces, staticGoogle, diningNearGooglePlace, GoogleMapsError } from '../src/lib/travel/google-maps';
import { toGcj02, toWgs84 } from '../src/lib/travel/map-coordinates';
import { routeBetween, weatherFor } from '../src/lib/travel/concierge-amap';
import { storedTrip, storedMessages } from '../src/lib/travel/trip-storage';
import { POST as photosPOST } from '../src/app/api/trip-place-photos/route';
import { POST as refreshPOST } from '../src/app/api/trip-refresh/route';
import type { VerifiedTrip } from '../src/lib/travel/concierge-types';
import { configurePhotoFixture, photoScreeningFixture } from './fixtures/photo-screening';
const poi={id:'ChIJ_test_id-with_underscore',displayName:{text:'豫园'},formattedAddress:'上海市黄浦区豫园路',location:{longitude:121.492,latitude:31.228},types:['tourist_attraction'],addressComponents:[{longText:'中国',shortText:'CN',types:['country']},{longText:'上海市',types:['locality']},{longText:'黄浦区',types:['sublocality_level_1']}]};
const a=normalizeGooglePlace(poi)!;
const b={...a,id:'ChIJ_other_place',point:{lng:121.493,lat:31.229,system:'WGS84' as const}};
const originalFetch=globalThis.fetch,originalGoogle=process.env.GOOGLE_MAPS_SERVER_API_KEY;
const originalAmap=process.env.AMAMP_API_KEY;
const requests:{host:string;path:string;mode?:string}[]=[];
const restorePhotoFixture=configurePhotoFixture();
async function main(){
 process.env.GOOGLE_MAPS_SERVER_API_KEY='server-test-secret';process.env.AMAMP_API_KEY='amap-test-secret';
 assert.equal(a.provider,'Google');assert.equal(a.adcode,'310101');assert.equal(a.citycode,'021');
 assert.equal(normalizeGooglePlace({...poi,businessStatus:'CLOSED_PERMANENTLY'}),undefined);
 assert.equal(normalizeGooglePlace({...poi,location:{longitude:null,latitude:31}}),undefined);
 assert.equal(normalizeGooglePlace({...poi,addressComponents:[{shortText:'US',types:['country']}]}),undefined);
 const native={lng:121.492,lat:31.228,system:'WGS84' as const};
 assert.deepEqual(toWgs84(native),native,'Google coordinates must not be converted again');
 const gcj=toGcj02(native),back=toWgs84(gcj);assert(Math.abs(gcj.lng-native.lng)>.001);assert(Math.abs(back.lng-native.lng)<.000001&&Math.abs(back.lat-native.lat)<.000001);
 let routeFailure=false,googlePlaceMissing=false,hotelOnly=false;
 const hotel={...poi,id:'ChIJ_sinan_hotel',displayName:{text:'思南公馆酒店'},types:['hotel','lodging']};
 globalThis.fetch=async(input,init)=>{
  const url=new URL(String(input));const body=init?.body?JSON.parse(String(init.body)):undefined;requests.push({host:url.hostname,path:url.pathname,mode:body?.travelMode});
  const screened=photoScreeningFixture(url,init);if(screened)return screened;
  if(url.hostname==='restapi.amap.com'){
   assert(['/v3/weather/weatherInfo','/v5/direction/transit/integrated'].includes(url.pathname));
   if(url.pathname.includes('weatherInfo'))return Response.json({status:'1',forecasts:[{reporttime:'2026-10-11',casts:[{date:'2026-10-11',dayweather:'晴',nightweather:'晴',daytemp:'25',nighttemp:'18'}]}]});
   const origin=url.searchParams.get('origin')!.split(',').map(Number);assert(Math.abs(origin[0]-toGcj02(a.point).lng)<.000001,'Only Amap requests use converted GCJ-02 coordinates');
   return Response.json({status:'1',route:{transits:[{cost:{duration:'900'},distance:'1300',segments:[{walking:{distance:'100',steps:[{polyline:`${gcj.lng},${gcj.lat};${gcj.lng+.001},${gcj.lat+.001}`}]} }]}]}});
  }
  if(url.hostname==='routes.googleapis.com'){
   assert.equal((init?.headers as Record<string,string>)['X-Goog-Api-Key'],'server-test-secret');assert(['WALK','DRIVE'].includes(body.travelMode));
   assert.equal(body.origin.location.latLng.longitude,a.point.lng);
   if(routeFailure)throw Error('Injected route failure');
   return Response.json({routes:[{duration:'180s',distanceMeters:200,legs:[{steps:[]}]}]});
  }
  if(url.hostname==='maps.googleapis.com')return new Response(new Uint8Array([1,2,3]),{headers:{'content-type':'image/png'}});
  assert.equal(url.hostname,'places.googleapis.com');
  assert.equal((init?.headers as Record<string,string>)['X-Goog-Api-Key'],'server-test-secret');
  const mask=(init?.headers as Record<string,string>)['X-Goog-FieldMask'];assert(mask&&!mask.includes('*'));
  if(url.pathname.endsWith(':searchText'))return Response.json({places:googlePlaceMissing?[]:hotelOnly?[{...hotel,types:body.includedType==='lodging'?hotel.types:['point_of_interest','establishment']}]:[poi]});
  if(url.pathname.endsWith(':searchNearby')){
   assert.deepEqual(body.includedTypes,['restaurant']);assert.equal(body.maxResultCount,20);assert.equal(body.locationRestriction.circle.radius,600);
   const meal={...poi,id:'ChIJ_meal',displayName:{text:'受控正餐'},location:{longitude:121.493,latitude:31.228},types:['restaurant','chinese_restaurant']};
   const conflictingNames=['Fresh bread&company','鑫旺糖工坊','樱岚食品有限公司','南市豆制品厂门市部'];
   return Response.json({places:[...conflictingNames.map((name,index)=>({...meal,id:`ChIJ_nonmeal_${index}`,displayName:{text:name},types:['restaurant']})),meal,{...meal,id:'ChIJ_dessert',displayName:{text:'Dorayaki 铜锣烧'},types:['restaurant','japanese_restaurant']},{...meal,id:'ChIJ_wrong_bank',addressComponents:[...poi.addressComponents.slice(0,2),{longText:'浦东新区',types:['sublocality_level_1']}]},{...meal,id:'ChIJ_far',location:{longitude:121.6,latitude:31.3}}]});
  }
  if(url.pathname.endsWith('/media'))return Response.json({photoUri:'https://lh3.googleusercontent.com/controlled-photo'});
  if(mask==='photos')return Response.json({photos:[{name:'places/ChIJ_test_id-with_underscore/photos/PHOTO_ID',authorAttributions:[{displayName:'Controlled author',uri:'https://www.google.com/maps/contrib/test'}]}]});
  return Response.json(poi);
 };
 assert((await findGooglePlace('豫园','上海'))?.provider==='Google');
 assert.equal(await findGooglePlace('豫园','杭州'),undefined);
 googlePlaceMissing=true;assert.equal(await findGooglePlace('豫园','上海'),undefined);googlePlaceMissing=false;
 hotelOnly=true;
 assert.equal(await findGooglePlace('思南公馆','上海'),undefined,'An adjacent hotel is not a confirmed match for the landmark');
 assert.equal((await findGooglePlace('思南公馆酒店','上海'))?.id,hotel.id,'An explicit hotel visit remains possible');
 assert.equal((await findGooglePlace('思南公馆','上海','hotel'))?.id,hotel.id,'Hotel searches retain lodging matches');
 hotelOnly=false;
 const walk=await routeBetween(a,b,false);assert.equal(walk?.provider,'Google');assert.equal(walk?.mode,'walk');assert.equal(walk?.minutes,3);assert.equal(walk?.geometry?.[0].kind,'connection','Missing geometry is not a verified path');
 const far={...b,point:{lng:121.52,lat:31.25,system:'WGS84' as const}};
 const transit=await routeBetween(a,far,false);assert.equal(transit?.provider,'Amap');assert.equal(transit?.mode,'transit');assert.equal(transit?.geometry?.[0].points[0].system,'WGS84');
 const easier=await routeBetween(a,{...far,point:{lng:121.53,lat:31.25,system:'WGS84'}},true);assert.equal(easier?.mode,'transit');
 const meal=await diningNearGooglePlace(a);assert.equal(meal.length,1);assert.equal(meal[0].cuisine,'Chinese restaurant');assert.equal(new URL(meal[0].sourceUrl).hostname,'www.google.com');
 const photoResponse=await photosPOST(new Request('http://controlled/api/trip-place-photos',{method:'POST',body:JSON.stringify({ids:[a.id]})}));assert.equal(photoResponse.status,200);const photos=(await photoResponse.json()).photos;assert.equal(photos[a.id].authors[0].name,'Controlled author');assert(!JSON.stringify(photos).includes('server-test-secret'));
 assert.equal((await photosForGooglePlaces([a.id]))[a.id].url,'https://lh3.googleusercontent.com/controlled-photo');
 assert((await staticGoogle([a.point,b.point],a.point)).headers.get('content-type')?.startsWith('image/'));
 assert.equal((await weatherFor(a.adcode,'2026-10-11')).status,'forecast');
 assert.equal((await weatherFor(a.adcode,'2027-10-11')).status,'outside-range');
 assert.equal((await weatherFor('','2026-10-11')).status,'unavailable');
 const plan:VerifiedTrip={title:'User draft',summary:'User plan',createdAt:'original',provider:'Google + Amap',checks:[],days:[{id:'day-1',city:'上海',title:'User day',hotel:'My hotel',hotelPlace:a,stops:[{id:'stop-1',name:'Yu Garden',search:'豫园',at:'10:00',durationMinutes:90,booked:true,bookingNote:'User ticket',place:a,placeStatus:'matched'}],legs:[{from:'hotel',to:'stop-1',...walk!}],weather:{status:'forecast',day:'晴'},checks:[]}]};
 const saved=storedTrip(plan)!;assert.equal(saved.days[0].stops[0].googlePlaceId,a.id);assert.equal(saved.days[0].stops[0].place,undefined);assert.equal(saved.days[0].hotelPlace,undefined);assert.equal(saved.days[0].legs[0].minutes,undefined);assert.equal(saved.days[0].weather.status,'date-needed');assert(saved.days[0].stops[0].booked&&saved.days[0].stops[0].at==='10:00');
 assert.equal(storedMessages([{role:'assistant',text:'Provider restaurant facts',sources:[{title:'Google',url:'https://www.google.com/maps/search/'}]}])[0].text,'Earlier map listings need a fresh lookup.');
 const legacy=storedTrip({...plan,provider:'Amap',days:[{...plan.days[0],stops:[{...plan.days[0].stops[0],place:{...a,provider:'Amap'}}]}]})!;assert.equal(legacy.days[0].stops[0].googlePlaceId,undefined);
 const refreshed=await refreshPOST(new Request('http://controlled/api/trip-refresh',{method:'POST',body:JSON.stringify({plan:saved})}));assert.equal(refreshed.status,200);const restored=(await refreshed.json()).plan;assert.equal(restored.title,'User draft');assert(restored.days[0].stops[0].booked);assert.equal(restored.days[0].stops[0].at,'10:00');assert.equal(restored.days[0].stops[0].place.provider,'Google');
 routeFailure=true;assert.equal(await googleRoute('walking',a,b).catch(()=>undefined),undefined);
 delete process.env.GOOGLE_MAPS_SERVER_API_KEY;await assert.rejects(findGooglePlace('豫园','上海'),e=>e instanceof GoogleMapsError&&e.code==='NOT_CONFIGURED');
 const refresh=await refreshPOST(new Request('http://controlled/api/trip-refresh',{method:'POST',body:JSON.stringify({plan:saved})}));assert.equal(refresh.status,503);assert((await refresh.json()).error.includes('draft is retained'));
 assert(!requests.some(r=>r.mode==='TRANSIT'));assert(requests.some(r=>r.host==='places.googleapis.com'));assert(requests.some(r=>r.host==='routes.googleapis.com'));
 const code=await readFile('src/lib/travel/concierge-amap.ts','utf8');assert(!/v5\/place\/|v5\/direction\/(walking|driving)|v3\/staticmap/.test(code));
 console.log('PASS: direct Google contracts, Amap two-service allowlist, coordinate conversion, route and weather provenance, dining filtering, photo authors, static maps, storage migration, outages and missing server key. Controlled evidence only.');
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{restorePhotoFixture();globalThis.fetch=originalFetch;if(originalGoogle===undefined)delete process.env.GOOGLE_MAPS_SERVER_API_KEY;else process.env.GOOGLE_MAPS_SERVER_API_KEY=originalGoogle;if(originalAmap===undefined)delete process.env.AMAMP_API_KEY;else process.env.AMAMP_API_KEY=originalAmap;});
