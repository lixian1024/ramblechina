import {guardedLookup} from '@/lib/growth/trial';
import { refreshTrip } from '@/lib/travel/concierge';
export const runtime='nodejs';
async function lookup(request:Request){
 const text=await request.text();if(text.length>160000)return Response.json({error:'Trip request is too large.'},{status:413});
 let data:Record<string,unknown>;try{data=JSON.parse(text);if(!data||typeof data!=='object'||Array.isArray(data))throw Error();}catch{return Response.json({error:'Invalid trip request.'},{status:400});}
 const locale=data.locale==='zh'?'zh':data.locale==='ko'?'ko':'en';
 try{return Response.json({plan:await refreshTrip(data.plan,locale)},{headers:{'Cache-Control':'no-store'}});}
 catch{return Response.json({error:locale==='zh'?'行程草稿已保留，地图数据尚未重新核实。请检查 Google 服务配置后重试。':'Your draft is retained. Map data could not be refreshed; check Google service configuration and retry.'},{status:503});}
}

export async function POST(request:Request){return guardedLookup(request,()=>lookup(request));}
