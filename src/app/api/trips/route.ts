import { isDeepStrictEqual } from 'node:util';
import { accountSession, json, readMutation, mutationFailure } from '@/lib/account/http';
import { tripWriteSchema, safeSnapshot, snapshotTitle } from '@/lib/account/trips';

export async function GET(request: Request) {
  const session = await accountSession(); if (session.response) return session.response;
  const offset = Math.max(0, Number(new URL(request.url).searchParams.get('offset')) || 0);
  const { data, error } = await session.client.from('ramble_trips').select('id,title,created_at,updated_at,version').eq('user_id',session.user.id).order('updated_at',{ascending:false}).order('id').range(offset,offset+49);
  return error ? json({error:'Your saved trips could not be loaded. Please retry.'},503) : json({trips:data,hasMore:data.length===50});
}
export async function POST(request: Request) {
  const session = await accountSession(); if (session.response) return session.response;
  try {
    const input = tripWriteSchema.parse(await readMutation(request));
    if (input.version !== 0) return json({error:'Open the saved trip before editing it.'},409);
    const snapshot = safeSnapshot(input.snapshot);
    const {data,error} = await session.client.from('ramble_trips').insert({id:input.id,user_id:session.user.id,title:snapshotTitle(snapshot),snapshot}).select('id,version,updated_at').single();
    if (!error) return json(data,201);
    if (error.code==='23505') {
      const {data:existing} = await session.client.from('ramble_trips').select('id,version,updated_at,snapshot').eq('id',input.id).eq('user_id',session.user.id).maybeSingle();
      if (existing && isDeepStrictEqual(existing.snapshot,snapshot)) return json({id:existing.id,version:existing.version,updated_at:existing.updated_at});
      return json({error:'This trip was already saved with different details. Reopen it before editing.',conflict:true},409);
    }
    return json({error:'Your trip could not be saved. Keep this page open and retry.'},503);
  } catch(error) { return mutationFailure(error); }
}
