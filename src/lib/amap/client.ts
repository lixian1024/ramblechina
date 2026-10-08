// Server-only use: import from route handlers / scripts, never from client components.
import type { AmapPoi, AmapWalk } from './types';
import type { Coordinates } from '../content/schema';
export class AmapError extends Error{constructor(public code:string,message:string,public status=502){super(message)}}
type ObjectValue=Record<string,unknown>;
const object=(v:unknown):ObjectValue=>v&&typeof v==='object'&&!Array.isArray(v)?v as ObjectValue:{};
const str=(v:unknown)=>typeof v==='string'?v:'';
const num=(v:unknown)=>typeof v==='string'&&v.trim()!==''?Number(v):typeof v==='number'?v:NaN;
export function parseCoordinate(v:unknown):Coordinates|null{if(typeof v!=='string')return null;const parts=v.split(',');if(parts.length!==2)return null;const longitude=num(parts[0]),latitude=num(parts[1]);if(!Number.isFinite(longitude)||!Number.isFinite(latitude)||longitude<115||longitude>118||latitude<39||latitude>42)return null;return {longitude,latitude,system:'GCJ-02'};}
export function normalizePoi(value:unknown,at:string):AmapPoi|null{const p=object(value);const coordinates=parseCoordinate(p.location);if(!str(p.id)||!str(p.name)||!coordinates)return null;const business=object(p.business);return {id:str(p.id),name:str(p.name),address:str(p.address),district:str(p.adname),type:str(p.type),coordinates,telephone:str(business.tel),openingHours:str(business.opentime_today)||str(business.opentime_week),provider:'Amap',fetchedAt:at};}
export function normalizeWalk(value:unknown,origin:AmapPoi,destination:AmapPoi,at:string):AmapWalk{const r=object(value);const paths=object(r.route).paths;const p=Array.isArray(paths)?object(paths[0]):{};const distance=num(p.distance);if(!Number.isFinite(distance)||distance<0)throw new AmapError('NO_ROUTE','Amap did not return a usable walking route.');const rawSteps=Array.isArray(p.steps)?p.steps:[];const duration=num(object(p.cost).duration??p.duration);const coordinates:Coordinates[]=[];const steps=rawSteps.map(v=>{const s=object(v);for(const point of str(s.polyline).split(';')){const c=parseCoordinate(point);if(c)coordinates.push(c);}const d=num(s.distance);return {instruction:str(s.instruction),distanceMetres:Number.isFinite(d)?d:0};});return {distanceMetres:distance,durationSeconds:Number.isFinite(duration)&&duration>=0?duration:null,steps,coordinates,provider:'Amap',fetchedAt:at,origin,destination};}
export function configured(){return Boolean(process.env.AMAP_WEB_SERVICE_KEY?.trim())}
// Per-process cap protects the prototype quota. Deployments need a shared limiter.
let budgetWindow=0,budgetCalls=0;
async function request(path:string,params:Record<string,string>):Promise<unknown>{
 const key=process.env.AMAP_WEB_SERVICE_KEY?.trim();if(!key)throw new AmapError('NOT_CONFIGURED','Live place search is not connected yet. The curated route and offline cards remain available.',503);
 if(Date.now()-budgetWindow>60000){budgetWindow=Date.now();budgetCalls=0;}if(++budgetCalls>30)throw new AmapError('RATE_LIMIT','Live lookup is busy. Try again in a minute.',429);
 const url=new URL('https://restapi.amap.com/'+path);url.search=new URLSearchParams({...params,key}).toString();
 let response:Response;try{response=await fetch(url,{signal:AbortSignal.timeout(8000),cache:'no-store'});}catch{throw new AmapError('UPSTREAM_UNAVAILABLE','Amap could not be reached. Use the curated notes and retry later.');}
 if(!response.ok)throw new AmapError('UPSTREAM_UNAVAILABLE','The map provider is temporarily unavailable.');
 let data:ObjectValue;try{data=object(await response.json());}catch{throw new AmapError('INVALID_RESPONSE','The map provider returned an unreadable response.');}
 if(String(data.status)!=='1'){
  const code=str(data.infocode);
  if(['10003','10004','10014','10019','10020','10021','10044','10045'].includes(code))throw new AmapError('QUOTA','Amap quota or request limit reached. Try later or check the account quota.',429);
  if(['10001','10005','10006','10007','10008','10009','10012','10013','10016','10041'].includes(code))throw new AmapError('CONFIGURATION','The Amap service key or service permissions need attention.',503);
  throw new AmapError('PROVIDER_ERROR','Amap could not complete this lookup. Check the query or try later.');
 }
 return data;
}
export async function searchPlaces(query:string){const data=object(await request('v5/place/text',{keywords:query,region:'110100',city_limit:'true',page_size:'6',show_fields:'business'}));const at=new Date().toISOString();return (Array.isArray(data.pois)?data.pois:[]).map(v=>normalizePoi(v,at)).filter((p):p is AmapPoi=>p!==null);}
async function detail(id:string){const data=object(await request('v5/place/detail',{id,show_fields:'business'}));const p=Array.isArray(data.pois)?normalizePoi(data.pois[0],new Date().toISOString()):null;if(!p)throw new AmapError('NO_PLACE','The selected place is no longer available.',404);return p;}
export async function walkBetweenGates(originId:string,destinationId:string){
 const [origin,destination]=await Promise.all([detail(originId),detail(destinationId)]);
 if(!origin.name.includes('神武门')||!destination.name.includes('景山')||!destination.name.includes('南门'))throw new AmapError('WRONG_GATE','Choose Shenwumen as the exit and Jingshan south gate as the destination.',400);
 const a=origin.coordinates,b=destination.coordinates;if(Math.abs(a.longitude-b.longitude)>.03||Math.abs(a.latitude-b.latitude)>.03)throw new AmapError('WRONG_GATE','These candidates are too far apart for this crossing. Check the entrances.',400);
 const coordinate=(c:Coordinates)=>c.longitude.toFixed(6)+','+c.latitude.toFixed(6);
 const data=await request('v5/direction/walking',{origin:coordinate(a),destination:coordinate(b),origin_id:origin.id,destination_id:destination.id,show_fields:'cost,polyline'});
 return normalizeWalk(data,origin,destination,new Date().toISOString());
}
