import type {SupabaseClient} from '@supabase/supabase-js';
import {createClient} from '@supabase/supabase-js';
import {z} from 'zod';
import {supabaseUrl,supabasePublishableKey} from '@/lib/supabase/config';
import {newShareToken,hashShareToken,shareTokenSchema} from './tokens';
import {publishedShareSchema,sharedSnapshotSchema,type PublishedShare} from './snapshot';

export class ShareUnavailable extends Error{}
export class ShareNotFound extends Error{}
export class ShareNotPublishable extends Error{}
const tripIdSchema=z.string().uuid();
export async function shareStatus(client:SupabaseClient,owner:string,tripId:string){
 if(!tripIdSchema.safeParse(tripId).success)throw new ShareNotFound();
 const trip=await client.from('ramble_trips').select('id').eq('id',tripId).eq('user_id',owner).maybeSingle();
 if(trip.error)throw new ShareUnavailable();if(!trip.data)throw new ShareNotFound();
 const [preview,current]=await Promise.all([client.rpc('ramble_share_preview',{requested_trip:tripId}),client.from('ramble_trip_shares').select('published_at').eq('trip_id',tripId).eq('user_id',owner).maybeSingle()]);
 if(preview.error||current.error)throw new ShareUnavailable();
 const parsed=sharedSnapshotSchema.safeParse(preview.data);
 return {published:Boolean(current.data),publishedAt:current.data?.published_at as string|undefined,preview:parsed.success?parsed.data:null};
}
export async function publishShare(client:SupabaseClient,owner:string,tripId:string){
 const status=await shareStatus(client,owner,tripId);if(!status.preview)throw new ShareNotPublishable();
 const token=newShareToken();
 // Only the hash is stored. Every explicit publication replaces the capability.
 const result=await client.from('ramble_trip_shares').upsert({trip_id:tripId,user_id:owner,token_hash:hashShareToken(token)},{onConflict:'trip_id'}).select('published_at').single();
 if(result.error||!result.data)throw new ShareUnavailable();
 return {token,publishedAt:result.data.published_at as string};
}
export async function revokeShare(client:SupabaseClient,owner:string,tripId:string){
 // An owned-trip check distinguishes an unavailable store from a missing share.
 if(!tripIdSchema.safeParse(tripId).success)throw new ShareNotFound();
 const trip=await client.from('ramble_trips').select('id').eq('id',tripId).eq('user_id',owner).maybeSingle();
 if(trip.error)throw new ShareUnavailable();if(!trip.data)throw new ShareNotFound();
 const result=await client.from('ramble_trip_shares').delete().eq('trip_id',tripId).eq('user_id',owner);
 if(result.error)throw new ShareUnavailable();
}
export async function lookupShare(client:SupabaseClient,token:string):Promise<PublishedShare|null>{
 if(!shareTokenSchema.safeParse(token).success)return null;
 const result=await client.rpc('ramble_read_trip_share',{capability:token});
 if(result.error)throw new ShareUnavailable();if(!result.data)return null;
 const parsed=publishedShareSchema.safeParse(result.data);if(!parsed.success)throw new ShareUnavailable();return parsed.data;
}
export async function publicShare(token:string){
 if(!shareTokenSchema.safeParse(token).success)return null;
 if(!supabaseUrl||!supabasePublishableKey)throw new ShareUnavailable();
 // A fresh anonymous client: public reads never forward a viewer's account.
 const client=createClient(supabaseUrl,supabasePublishableKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:(input,init)=>fetch(input,{...init,cache:'no-store'})}});
 return lookupShare(client,token);
}
