import type { SupabaseClient } from '@supabase/supabase-js';
import { isDeepStrictEqual } from 'node:util';
import { guideRequestSchema, type GuideRequest, type GuideReceipt } from '@/lib/travel/guide-request';
import { GuideRequestConflict } from '@/lib/travel/guide-request-store';

export async function saveAccountGuideRequest(client:SupabaseClient,userId:string,input:GuideRequest):Promise<GuideReceipt> {
  const request=guideRequestSchema.parse(input);
  const {data,error}=await client.from('ramble_guide_requests').insert({id:request.requestId,user_id:userId,request}).select('reference,created_at').single();
  if (!error) return {reference:data.reference,receivedAt:data.created_at};
  if (error.code==='23505') {
    const {data:existing}=await client.from('ramble_guide_requests').select('reference,created_at,request').eq('id',request.requestId).eq('user_id',userId).maybeSingle();
    if (existing && isDeepStrictEqual(existing.request,request))return {reference:existing.reference,receivedAt:existing.created_at};
    throw new GuideRequestConflict();
  }
  throw new Error('Guide request database unavailable');
}
