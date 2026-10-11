import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import {sameOrigin} from './origin';

export const privateHeaders = { 'Cache-Control': 'private, no-store' };
export function json(data: unknown, status = 200) { return Response.json(data, { status, headers: privateHeaders }); }
export async function accountSession() {
  if (!isSupabaseConfigured()) return { response: json({ error: 'Account services are not configured.' }, 503) };
  try {
    const client = await createClient();
    const { data, error } = await client.auth.getUser();
    if (error && error.name!=='AuthSessionMissingError' && error.status!==401 && error.status!==403) return {response:json({error:'Account services could not be reached. Please retry.'},503)};
    if (error || !data.user) return { response: json({ error: 'Please sign in to access your account.', signIn: true }, 401) };
    return { client, user: data.user };
  } catch { return { response: json({ error: 'Account services could not be reached. Please retry.' }, 503) }; }
}
export async function readMutation(request: Request, maximum = 240000) {
  if (!sameOrigin(request)) throw new Error('origin');
  if (!request.headers.get('content-type')?.includes('application/json')) throw new Error('format');
  const reader = request.body?.getReader(); if (!reader) throw new Error('body');
  const parts: Uint8Array[] = []; let size = 0;
  while (true) { const chunk = await reader.read(); if (chunk.done) break; size += chunk.value.byteLength; if (size > maximum) { await reader.cancel(); throw new Error('size'); } parts.push(chunk.value); }
  return JSON.parse(Buffer.concat(parts).toString('utf8')) as unknown;
}
export function mutationFailure(error: unknown) {
  const cause = error instanceof Error ? error.message : '';
  return json({ error: cause === 'origin' ? 'Please use the Ramble China website.' : cause === 'size' ? 'This trip is too large to save.' : 'Please check the submitted details.' }, cause === 'origin' ? 403 : cause === 'size' ? 413 : 400);
}
