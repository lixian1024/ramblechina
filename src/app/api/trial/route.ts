import {guestIdentity} from '@/lib/growth/trial';
import {callGrowthRpc} from '@/lib/growth/server';
export const runtime='nodejs';
export async function GET(){
 try{return Response.json(await callGrowthRpc('ramble_growth_status',{p_actor:await guestIdentity()}),{headers:{'Cache-Control':'private, no-store'}});}
 catch{return Response.json({error:'Guest trial is unavailable. Please retry later.'},{status:503,headers:{'Cache-Control':'private, no-store'}});}
}
