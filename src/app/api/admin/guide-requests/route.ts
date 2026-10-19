import {accountSession,json} from '@/lib/account/http';
import {readAdminGuideRequests} from '@/lib/account/guide-admin';

export const runtime = 'nodejs';
export async function GET(request:Request) {
  const session = await accountSession();
  if (session.response) return session.response;
  const result = await readAdminGuideRequests(session.client,new URL(request.url).searchParams);
  if (result.kind === 'forbidden') return json({error:'Administrator access is required.'},403);
  if (result.kind === 'invalid') return json({error:'Please check the request filters.'},400);
  if (result.kind === 'unavailable') return json({error:'Guide request administration is unavailable. Please retry.'},503);
  return json(result);
}
