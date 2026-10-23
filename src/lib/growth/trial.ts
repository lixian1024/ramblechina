import {randomBytes,randomUUID} from 'node:crypto';
import {cookies} from 'next/headers';
import {accountSession} from '@/lib/account/http';
import {sameOrigin} from '@/lib/account/origin';
import {callGrowthRpc,growthRequestIp,hashGrowthIdentity} from './server';
import {assertGuestScope,GrowthDenied} from './trial-scope';
export {assertGuestScope,GrowthDenied} from './trial-scope';
import type {TripMessage,VerifiedTrip} from '@/lib/travel/concierge-types';
import {withModelBudget} from './model-budget';

export const trialCookie='ramble_trial';
export async function guestIdentity(){
 const jar=await cookies();let token=jar.get(trialCookie)?.value;
 if(!token||!/^[a-f0-9]{64}$/.test(token)){token=randomBytes(32).toString('hex');jar.set(trialCookie,token,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',maxAge:86400,path:'/'});}
 return hashGrowthIdentity(`guest:${token}`);
}
export type Admission={status:string;requestId:string;plan:VerifiedTrip|null;messages:TripMessage[]|null};
export async function admitGrowth(request:Request,operation:'generate'|'edit'|'lookup',inputMessages?:TripMessage[]){
 let originRequest=request;
 if(request.method==='GET'&&!request.headers.has('origin')&&request.headers.get('sec-fetch-site')==='same-origin'){
  try{const headers=new Headers(request.headers);headers.set('origin',new URL(request.headers.get('referer')||'').origin);originRequest=new Request(request,{headers});}catch{/* A missing referrer cannot authorize paid work. */}
 }
 if(!sameOrigin(originRequest))throw new GrowthDenied('Please use the Ramble China website.',403);
 const session=await accountSession();
 if(session.response&&session.response.status!==401)throw new GrowthDenied('Account services are unavailable. Please retry.',503);
 const guest=!session.user;
 const actor=guest?await guestIdentity():hashGrowthIdentity(`account:${session.user!.id}`);
 let canonicalMessages=inputMessages;
 if(guest&&inputMessages){
  const state=await callGrowthRpc<{plan:VerifiedTrip|null;messages:TripMessage[]|null}>('ramble_growth_status',{p_actor:actor});
  operation=state.plan?'edit':'generate';
  const latest=inputMessages.filter(m=>m.role==='user').at(-1);
  if(!latest)throw new GrowthDenied('Please describe your Shanghai trip.',400);
  canonicalMessages=state.plan?[...(state.messages||[]),{role:'user',text:latest.text}]:[{role:'user',text:latest.text}];
  assertGuestScope(canonicalMessages,state.plan);
 }
 if(process.env.RAMBLE_AI_PAUSED==='1')throw new GrowthDenied('Planning is temporarily paused. Your existing itinerary is retained.',503);
 const admission=await callGrowthRpc<Admission>('ramble_growth_admit',{p_actor:actor,p_ip:hashGrowthIdentity(`ip:${growthRequestIp(request)}`),p_guest:guest,p_operation:operation,p_id:randomUUID()});
 if(admission.status!=='admitted'){
  const messages:Record<string,string>={disabled:'Planning is temporarily paused.',daily_limit:'Today’s trial capacity has been reached. Please return tomorrow (UTC).',guest_limit:'Your guest allowance has been used. Sign in to continue; your itinerary is retained.',account_limit:'Your daily planning allowance has been reached.',ip_limit:'This network has reached its daily allowance.',busy:'The planner is busy. Please wait a few minutes and retry.',sign_in:'Sign in to refresh map details.'};
  throw new GrowthDenied(messages[admission.status]||'Planning is unavailable.',admission.status==='disabled'?503:429);
 }
 return {...admission,guest,inputMessages:canonicalMessages};
}
export async function finishGrowth(id:string,plan:VerifiedTrip|null=null,messages:TripMessage[]|null=null){await callGrowthRpc('ramble_growth_finish',{p_id:id,p_plan:plan,p_messages:messages});}
export async function guardedLookup(request:Request,work:()=>Promise<Response>){
 let admitted:Awaited<ReturnType<typeof admitGrowth>>|undefined;
 try{admitted=await admitGrowth(request,'lookup');return await withModelBudget(admitted.requestId,work);}
 catch(error){return Response.json({error:error instanceof GrowthDenied?error.message:'Map services are unavailable. Your draft is retained.'},{status:error instanceof GrowthDenied?error.status:503,headers:{'Cache-Control':'private, no-store'}});}
 finally{if(admitted)await finishGrowth(admitted.requestId).catch(()=>{});}
}
