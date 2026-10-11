import { z } from 'zod';
import { accountSession, json, readMutation, mutationFailure } from '@/lib/account/http';
import { tripWriteSchema, safeSnapshot, snapshotTitle } from '@/lib/account/trips';
import { isDeepStrictEqual } from 'node:util';
type Context = { params: Promise<{id:string}> };
export async function GET(_request: Request, context: Context) {
  const session = await accountSession(); if (session.response) return session.response;
  const {id}=await context.params; if (!z.uuid().safeParse(id).success) return json({error:'Trip not found.'},404);
  const {data,error}=await session.client.from('ramble_trips').select('id,title,snapshot,version,created_at,updated_at').eq('id',id).eq('user_id',session.user.id).maybeSingle();
  if (error) return json({error:'Your trip could not be loaded. Please retry.'},503);
  return data ? json(data) : json({error:'Trip not found in your account.'},404);
}
export async function PATCH(request: Request, context: Context) {
  const session = await accountSession(); if (session.response) return session.response;
  try {
    const {id}=await context.params;
    const input=tripWriteSchema.parse(await readMutation(request));
    if (input.id!==id || input.version<1) return json({error:'Invalid trip version.'},400);
    const snapshot=safeSnapshot(input.snapshot);
    const {data,error}=await session.client.from('ramble_trips').update({snapshot,title:snapshotTitle(snapshot),version:input.version+1,updated_at:new Date().toISOString()}).eq('id',id).eq('user_id',session.user.id).eq('version',input.version).select('id,version,updated_at').maybeSingle();
    if (error) return json({error:'Your changes could not be saved. Keep this page open and retry.'},503);
    if (data) return json(data);
    // A lost response may be retried safely, but never overwrite newer content.
    const {data:existing}=await session.client.from('ramble_trips').select('id,version,updated_at,snapshot').eq('id',id).eq('user_id',session.user.id).maybeSingle();
    if (existing?.version===input.version+1 && isDeepStrictEqual(existing.snapshot,snapshot)) return json({id:existing.id,version:existing.version,updated_at:existing.updated_at});
    return json({error:existing?'This trip was edited in another tab. Reopen its saved version before continuing.':'Trip not found in your account.',conflict:true},existing?409:404);
  } catch(error) { return mutationFailure(error); }
}
