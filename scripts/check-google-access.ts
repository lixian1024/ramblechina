/** Read-only permission probe; never prints keys, request URLs or upstream messages. */
import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd(),true, {info(){},error(){}});
const server=process.env.GOOGLE_MAPS_SERVER_API_KEY?.trim();
const key=server||process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
if(!key)throw new Error('No Google key configured');
async function check(name:string,url:string,body?:unknown,fields?:string){
 try{
  const response=await fetch(url,{method:body?'POST':'GET',headers:fields?{'Content-Type':'application/json','X-Goog-Api-Key':key!,'X-Goog-FieldMask':fields}:undefined,body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(15000)});
  const type=response.headers.get('content-type')||'';
  if(type.startsWith('image/'))return {name,status:response.status,image:true};
  const data=await response.json().catch(()=>({}));
  return {name,status:response.status,errorStatus:data.error?.status,reasons:data.error?.details?.map((d:{reason?:string})=>d.reason).filter(Boolean),placeCount:data.places?.length,routeCount:data.routes?.length};
 }catch{return {name,error:'NETWORK_OR_TIMEOUT'};}
}
async function main(){
 console.log(JSON.stringify({credentialSource:server?'GOOGLE_MAPS_SERVER_API_KEY':'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY'}));
 const results=await Promise.all([
 check('Places New','https://places.googleapis.com/v1/places:searchText',{textQuery:'豫园 上海 中国',languageCode:'zh-CN',pageSize:1},'places.id,places.location,places.displayName,places.addressComponents'),
 check('Routes','https://routes.googleapis.com/directions/v2:computeRoutes',{origin:{location:{latLng:{latitude:31.23,longitude:121.49}}},destination:{location:{latLng:{latitude:31.235,longitude:121.492}}},travelMode:'WALK'},'routes.duration,routes.distanceMeters'),
 check('Static Maps','https://maps.googleapis.com/maps/api/staticmap?'+new URLSearchParams({center:'31.23,121.49',zoom:'11',size:'200x200',key:key!}))
 ]);
 console.log(JSON.stringify(results));
}void main();
