import {z} from 'zod';
import type {SupabaseClient} from '@supabase/supabase-js';
import {guideRequestSchema} from '@/lib/travel/guide-request';

export const guideStatuses = ['new','reviewing','contacted','closed'] as const;
const rowSchema = z.object({
  id:z.string().uuid(), reference:z.string(), created_at:z.string().datetime({offset:true}),
  status:z.enum(guideStatuses), request:z.unknown(),
});
export type AdminGuideRequest = Omit<z.infer<typeof rowSchema>,'request'> & {request:z.infer<typeof guideRequestSchema>|null};
export type AdminGuideResult =
  | {kind:'ok'; requests:AdminGuideRequest[]; hasMore:boolean; page:number}
  | {kind:'forbidden'|'unavailable'|'invalid'};

/** Membership is resolved by PostgreSQL for the current verified session. */
export async function guideAdminAccess(client:SupabaseClient):Promise<boolean|null> {
  try {
    const {data,error} = await client.rpc('ramble_is_guide_admin');
    return error || typeof data !== 'boolean' ? null : data;
  } catch { return null; }
}

export async function readAdminGuideRequests(client:SupabaseClient, params:URLSearchParams):Promise<AdminGuideResult> {
  const access = await guideAdminAccess(client);
  if (access === null) return {kind:'unavailable'};
  if (!access) return {kind:'forbidden'};
  const pageText = params.get('page') ?? '0', status = params.get('status') ?? 'all';
  if (!/^(0|[1-9]\d{0,4})$/.test(pageText) ||
      (status !== 'all' && !(guideStatuses as readonly string[]).includes(status))) return {kind:'invalid'};
  const page = Number(pageText), size = 25;
  try {
    let query = client.from('ramble_guide_requests').select('id,reference,request,status,created_at')
      .order('created_at',{ascending:false}).order('id',{ascending:false});
    if (status !== 'all') query = query.eq('status',status);
    const {data,error} = await query.range(page*size,page*size+size);
    if (error) return {kind:'unavailable'};
    const parsed = z.array(rowSchema).safeParse(data);
    if (!parsed.success) return {kind:'unavailable'};
    const requests = parsed.data.slice(0,size).map(row=>{
      const details = guideRequestSchema.safeParse(row.request);
      return {...row,request:details.success?details.data:null};
    });
    return {kind:'ok',requests,hasMore:parsed.data.length>size,page};
  } catch { return {kind:'unavailable'}; }
}
