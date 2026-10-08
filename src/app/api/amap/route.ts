import { AmapError,configured,searchPlaces,walkBetweenGates } from '@/lib/amap/client';
export const runtime='nodejs';
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(request:Request){
 const url=new URL(request.url);const action=url.searchParams.get('action');
 if(action==='status')return json({configured:configured(),provider:'Amap',scope:'Beijing pilot',coordinateSystem:'GCJ-02'});
 try{
  if(action==='search'){
   const q=url.searchParams.get('q')?.trim()||'';
   if(q.length<2||q.length>80||/[\x00-\x1f]/.test(q))return json({error:'Enter 2–80 characters.',code:'INVALID_INPUT'},400);
   return json({pois:await searchPlaces(q),provider:'Amap'});
  }
  if(action==='walk'){
   const origin=url.searchParams.get('origin')||'',destination=url.searchParams.get('destination')||'';
   if(!/^[A-Za-z0-9]{5,40}$/.test(origin)||!/^[A-Za-z0-9]{5,40}$/.test(destination))return json({error:'Choose both gate candidates first.',code:'INVALID_INPUT'},400);
   return json({route:await walkBetweenGates(origin,destination)});
  }
  return json({error:'Unknown operation.',code:'INVALID_INPUT'},400);
 }catch(error){if(error instanceof AmapError)return json({error:error.message,code:error.code},error.status);return json({error:'Live lookup is temporarily unavailable.',code:'UNAVAILABLE'},502);}
}
