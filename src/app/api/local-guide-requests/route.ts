import { receiveGuideRequest } from '@/lib/travel/guide-request-handler';
import { saveAccountGuideRequest } from '@/lib/account/guide-store';
import { accountSession, json } from '@/lib/account/http';

export const runtime = 'nodejs';
export async function POST(request: Request) {
  const session=await accountSession(); if(session.response)return session.response;
  return receiveGuideRequest(request,input=>saveAccountGuideRequest(session.client,session.user.id,input));
}
export async function GET(request:Request) {
  const session=await accountSession(); if(session.response)return session.response;
  const offset=Math.max(0,Number(new URL(request.url).searchParams.get('offset'))||0);
  const {data,error}=await session.client.from('ramble_guide_requests').select('id,reference,request,status,created_at').eq('user_id',session.user.id).order('created_at',{ascending:false}).order('id').range(offset,offset+49);
  return error?json({error:'Your guide requests could not be loaded. Please retry.'},503):json({requests:data,hasMore:data.length===50});
}
