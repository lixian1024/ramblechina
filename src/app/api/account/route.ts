import { z } from 'zod';
import { accountSession, json, readMutation, mutationFailure } from '@/lib/account/http';
import {guideAdminAccess} from '@/lib/account/guide-admin';
const profileSchema=z.object({full_name:z.string().trim().max(100),country:z.string().trim().max(100),preferred_language:z.string().trim().min(1).max(80)});
export async function GET() {
  const session=await accountSession(); if(session.response)return session.response;
  const {data,error}=await session.client.from('ramble_profiles').select('full_name,country,preferred_language').eq('id',session.user.id).maybeSingle();
  const guideAdmin = await guideAdminAccess(session.client);
  return error?json({error:'Your profile could not be loaded. Please retry.'},503):json({email:session.user.email,guideAdmin:guideAdmin===true,profile:data||{full_name:String(session.user.user_metadata?.full_name||''),country:'',preferred_language:'English'}});
}
export async function PATCH(request:Request) {
  const session=await accountSession(); if(session.response)return session.response;
  try {
    const profile=profileSchema.parse(await readMutation(request,12000));
    const {error}=await session.client.from('ramble_profiles').upsert({...profile,id:session.user.id,updated_at:new Date().toISOString()},{onConflict:'id'});
    return error?json({error:'Your profile could not be saved. Please retry.'},503):json({profile});
  }catch(error){return mutationFailure(error);}
}
