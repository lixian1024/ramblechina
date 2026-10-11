// Server only. Browser credentials are deliberately not reused for REST requests.
import type { MapPoint, PlacePhoto, VerifiedDay, VerifiedLeg, VerifiedStop } from './concierge-types';
import { toWgs84 } from './map-coordinates';
import { districtPhotoSubjects, landmarkForQuery, landmarkMatches } from './place-identity';
import { screenPlacePhotos } from './photo-screening';

type Dict=Record<string,unknown>;
type Place=NonNullable<VerifiedStop['place']>;
export const object=(v:unknown):Dict=>v&&typeof v==='object'&&!Array.isArray(v)?v as Dict:{};
export const array=(v:unknown):unknown[]=>Array.isArray(v)?v:[];
export const string=(v:unknown)=>typeof v==='string'?v:'';
const key=()=>process.env.GOOGLE_MAPS_SERVER_API_KEY?.trim()||'';
export const googleConfigured=()=>Boolean(key());
export const validPlaceId=(id:unknown):id is string=>typeof id==='string'&&/^[A-Za-z0-9_-]{5,255}$/.test(id);
let windowStart=0,calls=0;
export class GoogleMapsError extends Error {
  constructor(public code:string,message:string,public status=502){super(message);}
}
export async function googleJson(path:string,body:Dict|undefined,fields:string):Promise<Dict>{
  if(!key())throw new GoogleMapsError('NOT_CONFIGURED','Google Maps server key is not configured.',503);
  if(Date.now()-windowStart>60_000){windowStart=Date.now();calls=0;}
  if(++calls>180)throw new GoogleMapsError('RATE_LIMIT','Map lookup is busy. Retry in a minute.',429);
  const host=path.startsWith('directions/')?'https://routes.googleapis.com/':'https://places.googleapis.com/';
  let response:Response;
  try{response=await fetch(host+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json','X-Goog-Api-Key':key(),'X-Goog-FieldMask':fields},body:body?JSON.stringify(body):undefined,cache:'no-store',signal:AbortSignal.timeout(9000)});}
  catch{throw new GoogleMapsError('UNAVAILABLE','Google Maps is temporarily unreachable.');}
  if(!response.ok)throw new GoogleMapsError(response.status===429?'QUOTA':'PROVIDER_ERROR',response.status===403?'Google Maps API permissions or billing need attention.':'Google Maps could not complete this lookup.',response.status===403?503:response.status===429?429:502);
  try { const data=await response.json(); if(!data||typeof data!=='object'||Array.isArray(data))throw new Error(); return object(data); } catch { throw new GoogleMapsError('INVALID_RESPONSE','Google Maps returned an unreadable response.'); }
}
// Explicit administrative bridge for Amap's two retained services. These codes are
// our mapping of verified Google address components, never Google-returned fields.
const cities=[
 ['上海|shanghai','310000','021'],['北京|beijing','110000','010'],['天津|tianjin','120000','022'],['重庆|chongqing','500000','023'],
 ['杭州|hangzhou','330100','0571'],['苏州|suzhou','320500','0512'],['南京|nanjing','320100','025'],['成都|chengdu','510100','028'],
 ['广州|guangzhou','440100','020'],['深圳|shenzhen','440300','0755'],['西安|xi.?an','610100','029'],['桂林|guilin','450300','0773'],
 ['昆明|kunming','530100','0871'],['厦门|xiamen','350200','0592'],['武汉|wuhan','420100','027'],['长沙|changsha','430100','0731'],
 ['青岛|qingdao','370200','0532'],['济南|jinan','370100','0531'],['郑州|zhengzhou','410100','0371'],['丽江|lijiang','530700','0888'],
 ['九寨沟|jiuzhaigou','513225','0837'],
 ['大理|dali','532900','0872'],['黄山|huangshan','341000','0559'],['张家界|zhangjiajie','430800','0744'],['三亚|sanya','460200','0898'],
] as const;
const shanghaiDistricts=[['浦东|pudong','310115'],['黄浦|huangpu','310101'],['徐汇|xuhui','310104'],['长宁|changning','310105'],['静安|jing.an','310106'],['普陀|putuo','310107'],['虹口|hongkou','310109'],['杨浦|yangpu','310110'],['闵行|minhang','310112'],['宝山|baoshan','310113'],['嘉定|jiading','310114'],['金山|jinshan','310116'],['松江|songjiang','310117'],['青浦|qingpu','310118'],['奉贤|fengxian','310120'],['崇明|chongming','310151']] as const;
export function normalizeGooglePlace(value:unknown):Place|undefined{
 const p=object(value),location=object(p.location),lng=location.longitude,lat=location.latitude;
 if(!string(object(p.displayName).text).trim()||p.businessStatus==='CLOSED_PERMANENTLY'||!validPlaceId(p.id)||typeof lng!=='number'||typeof lat!=='number'||!Number.isFinite(lng)||!Number.isFinite(lat)||lng<73||lng>135||lat<18||lat>54)return;
 const components=array(p.addressComponents).map(object);
 if(!components.some(c=>array(c.types).includes('country')&&string(c.shortText)==='CN'))return;
 const address=string(p.formattedAddress);
 const regionText=components.filter(c=>array(c.types).some(t=>/^administrative_area|^locality$|^sublocality/.test(string(t)))).map(c=>string(c.longText)).join(' ');
 const city=cities.find(c=>new RegExp(c[0],'i').test(regionText.replace(/[\s'’]/g,'')));
 const district=city?.[1]==='310000'?shanghaiDistricts.find(d=>new RegExp(d[0],'i').test(regionText+' '+address)):undefined;
 const hours=object(p.regularOpeningHours);
 return {id:p.id,name:string(object(p.displayName).text),address,point:{lng,lat,system:'WGS84'},
  provider:'Google',sourceUrl:string(p.googleMapsUri)||`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(string(object(p.displayName).text))}&query_place_id=${encodeURIComponent(p.id)}`,
  region:{city:city?.[0].split('|')[0]||string(components.find(c=>array(c.types).includes('locality'))?.longText).replace(/市$/, ''),district:district?.[0].split('|')[0]},
  adcode:district?.[1]||city?.[1]||'',citycode:city?.[2]||'',category:array(p.types).map(string).join(';'),
  openingHours:array(hours.weekdayDescriptions).map(string).filter(Boolean).join(' · ')||undefined,checkedAt:new Date().toISOString()};
}
const placeFields='id,displayName,formattedAddress,location,addressComponents,types,businessStatus,regularOpeningHours,googleMapsUri';
export async function searchGooglePlaces(query:string,city:string,kind:'hotel'|'visit'='visit',strictVisitType?:string):Promise<Place[]>{
 const data=await googleJson('v1/places:searchText',{textQuery:`${query.slice(0,80)} ${city.slice(0,40)} 中国`,languageCode:/[\u3400-\u9fff]/u.test(query)?'zh-CN':'en',regionCode:'CN',pageSize:6,...(kind==='hotel'?{includedType:'lodging',strictTypeFiltering:true}:strictVisitType?{includedType:strictVisitType,strictTypeFiltering:true}:{})},placeFields.split(',').map(f=>'places.'+f).join(','));
 return array(data.places).map(normalizeGooglePlace).filter((p):p is Place=>Boolean(p));
}
function placeScore(p:Place,query:string,city:string,kind:'hotel'|'visit'){
 const expected=cities.find(c=>new RegExp('^(?:'+c[0]+')(?:市|shi)?$','i').test(city.trim().replace(/[\s'’]/g,'')));
 const cityMatches=(expected?p.adcode.slice(0,/^(?:11|12|31|50)/.test(expected[1])?2:4)===expected[1].slice(0,/^(?:11|12|31|50)/.test(expected[1])?2:4):!city.trim()||p.region?.city.toLowerCase()===city.replace(/市$/, '').trim().toLowerCase())&&(!/^上海|^shanghai/i.test(city)||Boolean(p.region?.district)&&p.point.lng>=120.8&&p.point.lng<=122.1&&p.point.lat>=30.6&&p.point.lat<=31.9);
 const unexpectedHotel=kind==='visit'&&/酒店|宾馆|旅馆|饭店|\bhotel\b|\bhostel\b/i.test(p.name)&&!/酒店|宾馆|旅馆|饭店|\bhotel\b|\bhostel\b/i.test(query);
 if(!cityMatches||unexpectedHotel)return 0;
 if(/井盖|售票|停车场|洗手间|卫生间|纪念品|便利店/.test(p.name)&&!/井盖|售票|停车场|洗手间|卫生间|纪念品|便利店/.test(query))return 0;
 if(/transit_station|train_station|bus_station/.test(p.category||'')&&!/车站|站台|地铁站|station/i.test(query))return 0;
 const landmark=kind==='visit'?landmarkForQuery(query):undefined;
 if(landmark)return landmarkMatches(p,landmark)?6:0;
 const clean=(s:string)=>s.toLowerCase().replace(/[\s()（）·—－-]/g,'');
 const target=clean(query),stem=target.split(/[（(]/)[0];
  const name=clean(p.name.replace(new RegExp('^'+(p.region?.city || '(?!)')+'(?:市)?'), ''));
  const nameStem=clean(p.name.split(/[（(]/)[0].replace(/(?:酒楼|餐厅|饭店|景区)$/, ''));
  const queryStem=clean(query.split(/[（(]/)[0].replace(/(?:酒楼|餐厅|饭店|景区)$/, ''));
  if(nameStem===queryStem&&queryStem.length>=2)return 4;
  return name===target?5:name.startsWith(target)?4:name.includes(target)?3:target.includes(name)||name===stem?2:0;
}
export function googlePlaceMatches(place:Place,query:string,city:string,kind:'hotel'|'visit'='visit',requireExactName=false){
 // Restored IDs only accept an exact name or a reviewed landmark alias. Do not
 // widen the saved-ID trust boundary to general substring search matches.
 if(requireExactName&&!(kind==='visit'&&landmarkForQuery(query))&&place.name!==query)return false;
 return Boolean(query.trim())&&placeScore(place,query,city,kind)>=2;
}
export async function findGooglePlace(query:string,city:string,kind:'hotel'|'visit'='visit'):Promise<Place|undefined>{
 if(!query.trim())return;
 const landmark=kind==='visit'?landmarkForQuery(query):undefined;
 const lookup=landmark?.query||query;
 let candidates=await searchGooglePlaces(lookup,city,kind);
 if(landmark?.fallbackQuery&&!candidates.some(p=>googlePlaceMatches(p,query,city,kind)))candidates=await searchGooglePlaces(landmark.fallbackQuery,city,kind,'tourist_attraction');
 const matches=candidates.filter(p=>googlePlaceMatches(p,query,city,kind)).sort((a,b)=>placeScore(b,query,city,kind)-placeScore(a,query,city,kind));
 return matches[0];
}
export async function googlePlaceDetails(id:string,language:'en'|'zh-CN'='en'):Promise<Place|undefined>{
 if(!validPlaceId(id))return;
 return normalizeGooglePlace(await googleJson('v1/places/'+encodeURIComponent(id)+'?languageCode='+language,undefined,placeFields));
}
export function distanceMetres(a:MapPoint,b:MapPoint){
 const x=toWgs84(a),y=toWgs84(b),r=Math.PI/180;
 const h=Math.sin((y.lat-x.lat)*r/2)**2+Math.cos(x.lat*r)*Math.cos(y.lat*r)*Math.sin((y.lng-x.lng)*r/2)**2;
 return 12742000*Math.asin(Math.min(1,Math.sqrt(h)));
}
export async function diningNearGooglePlace(anchor:Place,radius=600,limit=2):Promise<NonNullable<VerifiedDay['dining']>[number]['options']>{
 const point=toWgs84(anchor.point);
 const data=await googleJson('v1/places:searchNearby',{includedTypes:['restaurant'],maxResultCount:20,rankPreference:'DISTANCE',languageCode:'zh-CN',locationRestriction:{circle:{center:{latitude:point.lat,longitude:point.lng},radius}}},placeFields.split(',').filter(f=>f!=='regularOpeningHours').map(f=>'places.'+f).join(','));
 const options:NonNullable<VerifiedDay['dining']>[number]['options']=[];
 for(const raw of array(data.places)){
  const p=normalizeGooglePlace(raw);if(!p)continue;
  const types=(p.category||'').split(';'),metres=distanceMetres(point,p.point);
  if(!types.includes('restaurant')||metres>radius||options.some(o=>o.id===p.id)
   ||(/^31/.test(anchor.adcode)&&(!p.region?.district||(p.adcode==='310115')!==(anchor.adcode==='310115')))
   ||/cafe|coffee_shop|tea_house|dessert|ice_cream|bakery|bar(?:;|$)/.test(p.category||'')
   ||/咖啡|茶馆|甜品|甜汤|糖水|糖工坊|糕饼|蛋糕|面包|冷饮|饮品|酒吧|冰淇淋|冰激凌|铜锣烧|食品.{0,6}公司|(?:豆制品|食品|制糖)厂|门市部|dorayaki|gelato|ice\s*cream|\b(?:bread|bakery|patisserie|confectionery|dessert|candy|pastry|pastries|donuts?|doughnuts?)\b/i.test(p.name))continue;
  const cuisine=types.includes('chinese_restaurant')?'Chinese restaurant':types.includes('japanese_restaurant')?'Japanese restaurant':types.includes('fast_food_restaurant')?'Casual meal restaurant':'Restaurant';
  options.push({id:p.id,name:p.name,address:p.address,type:p.category||'',cuisine,point:p.point,adcode:p.adcode,metres:Math.round(metres),sourceUrl:p.sourceUrl!,checkedAt:p.checkedAt,hoursStatus:'unverified'});
 }
 return options.slice(0,limit);
}
export async function diningNearGoogleHotel(query:string){
 const hotel=await findGooglePlace(query,'','hotel');if(!hotel)return;
 const restaurants=await diningNearGooglePlace(hotel,1200,5);
 return restaurants.length?{hotel,restaurants}:undefined;
}
export async function photosForGooglePlaces(ids:string[],expected:Record<string,{query:string;city:string}>={}):Promise<Record<string,PlacePhoto>>{
 const entries=await Promise.all(ids.map(async id=>{
  try{
   let requested=await googlePlaceDetails(id,'zh-CN');
   if(!requested||requested.id!==id)return;
   const context=expected[id];
   if(context&&!googlePlaceMatches(requested,context.query,context.city,'visit',true)){
    // A generic English query must be checked against Google's English name,
    // without loosening the exact-name/city/type boundary.
    if(/[\u3400-\u9fff]/u.test(context.query))return;
    const english=await googlePlaceDetails(id,'en');
    if(!english||english.id!==id||!googlePlaceMatches(english,context.query,context.city,'visit',true))return;
    requested=english;
   }
   const landmark=landmarkForQuery(requested.name);
   if(landmark&&!landmarkMatches(requested,landmark))return;
   const subject=districtPhotoSubjects[id];
   const anchor=subject?await googlePlaceDetails(subject.id,'zh-CN'):undefined;
   if(subject&&(!anchor||!googlePlaceMatches(anchor,subject.query,subject.city)))return;
   const photoId=subject?.id||id;
   const p=await googleJson('v1/places/'+encodeURIComponent(photoId),undefined,'photos');
   const resources=array(p.photos).map(object).filter(photo=>/^places\/[A-Za-z0-9_-]+\/photos\/[A-Za-z0-9_-]+$/.test(string(photo.name))&&string(photo.name).split('/')[1]===photoId).slice(0,3);
   const candidates=(await Promise.all(resources.map(async photo=>{
    try{
     const media=await googleJson('v1/'+string(photo.name)+'/media?maxWidthPx=600&skipHttpRedirect=true',undefined,'photoUri');
     const uri=new URL(string(media.photoUri));
     if(uri.protocol!=='https:'||!(uri.hostname.endsWith('.googleusercontent.com')||uri.hostname.endsWith('.gstatic.com'))||uri.searchParams.has('key'))return;
     return {url:uri.toString(),photo};
    }catch{return;}
   }))).filter((candidate):candidate is NonNullable<typeof candidate>=>Boolean(candidate));
   const target=anchor||requested;
   const selected=await screenPlacePhotos({name:target.name,city:target.region?.city||'',address:target.address},candidates.map(item=>item.url));
   if(!selected)return;
   const chosen=candidates[selected.index];
   // This transient photo URI and its authors come from the same photo lookup.
   // Neither URI nor photo resource name is written to persistent browser storage.
   return [id,{url:chosen.url,placeId:id,screening:'visual-match' as const,authors:array(chosen.photo.authorAttributions).map(object).map(a=>({name:string(a.displayName),uri:string(a.uri)||undefined})),...(subject&&anchor?{subject:{name:subject.label,nameEnglish:subject.labelEnglish,sourceUrl:anchor.sourceUrl}}:{})}] as const;
  }catch{return;}
 }));return Object.fromEntries(entries.filter((entry):entry is NonNullable<typeof entry>=>Boolean(entry)));
}
export function decodePolyline(encoded:string):MapPoint[]{
 const points:MapPoint[]=[];let i=0,lat=0,lng=0;
 const part=()=>{let shift=0,result=0,b=0;do{if(i>=encoded.length||shift>30)throw new Error('Invalid polyline');b=encoded.charCodeAt(i++)-63;if(b<0||b>63)throw new Error('Invalid polyline');result|=(b&31)<<shift;shift+=5;}while(b>=32);return result&1?~(result>>1):result>>1;};
 while(i<encoded.length){lat+=part();lng+=part();points.push({lat:lat/1e5,lng:lng/1e5,system:'WGS84'});}return points;
}
export async function googleRoute(mode:'walking'|'driving',from:Place,to:Place){
 const waypoint=(p:Place)=>{const point=toWgs84(p.point);return {location:{latLng:{latitude:point.lat,longitude:point.lng}}};};
 const data=await googleJson('directions/v2:computeRoutes',{origin:waypoint(from),destination:waypoint(to),travelMode:mode==='walking'?'WALK':'DRIVE',languageCode:'en',units:'METRIC',...(mode==='driving'?{routeModifiers:{avoidFerries:true}}:{})},'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs.steps.navigationInstruction,routes.legs.steps.distanceMeters,routes.warnings');
 const route=object(array(data.routes)[0]),duration=string(route.duration);
 if(!/^\d+(?:\.\d+)?s$/.test(duration)||Number(duration.slice(0,-1))<=0)return;
 // Google treats ferry avoidance as a preference. Reject mixed/ferry walking results.
 if(mode==='walking'&&/ferry|轮渡|渡轮/i.test(JSON.stringify([route.warnings,array(route.legs).flatMap(l=>array(object(l).steps).map(s=>object(s).navigationInstruction))])))return;
 const encoded=string(object(route.polyline).encodedPolyline);let points:MapPoint[]=[];
 try{if(encoded)points=decodePolyline(encoded);}catch{return;}
 const geometry:VerifiedLeg['geometry']=points.length>1?[{kind:'route',points}]:[{kind:'connection',points:[toWgs84(from.point),toWgs84(to.point)]}];
 const durationSeconds=Number(duration.slice(0,-1));
 const steps=array(route.legs).flatMap(l=>array(object(l).steps).map(s=>{const step=object(s);return {instruction:string(object(step.navigationInstruction).instructions),distanceMetres:typeof step.distanceMeters==='number'?step.distanceMeters:0};}));
 return {durationSeconds,steps,mode:mode==='walking'?'walk' as const:'taxi' as const,provider:'Google' as const,minutes:Math.ceil(Number(duration.slice(0,-1))/60),metres:typeof route.distanceMeters==='number'&&route.distanceMeters>=0?route.distanceMeters:undefined,geometry,checkedAt:new Date().toISOString()};
}
export async function staticGoogle(points:MapPoint[],center:MapPoint):Promise<Response>{
 if(!key())return new Response('Google Maps server key is not configured',{status:503});
 const params=new URLSearchParams({size:'640x480',scale:'2',key:key(),language:'en'});
 for(const [i,p]of points.slice(0,10).entries()){const c=toWgs84(p);params.append('markers',`color:green|label:${String.fromCharCode(65+i)}|${c.lat},${c.lng}`);}
 // Markers only: straight connections must not masquerade as navigable routes.
 if(!points.length){const c=toWgs84(center);params.set('center',`${c.lat},${c.lng}`);params.set('zoom','11');}
 try{const response=await fetch('https://maps.googleapis.com/maps/api/staticmap?'+params,{cache:'no-store',signal:AbortSignal.timeout(9000)});const type=response.headers.get('content-type')||'';if(!response.ok||!type.startsWith('image/'))return new Response('Google map unavailable',{status:502});return new Response(await response.arrayBuffer(),{headers:{'Content-Type':type,'Cache-Control':'private, no-store'}});}catch{return new Response('Google map unavailable',{status:502});}
}
