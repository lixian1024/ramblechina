import {callGrowthRpc} from '../growth/server';
import type {PackDocument} from './model';
import type {PackErrorCode,PackOrder} from './api-types';
import type {VerifiedPackEvent} from './creem';
export type StoredPackOrder={id:string;owner_id:string;trip_id:string;mode:'test';state:PackOrder['state'];version:number;locale:'en'|'zh';revision:number;created_at:string;paid_at:string|null;expires_at:string|null;checkout_id:string|null;checkout_url:string|null;create_attempt_at:string|null;document:PackDocument;pdf:string;digest:string;provider_order_id:string|null;transaction_id:string|null};
export type StoredPackTrip={id:string;title:string;version:number;snapshot:unknown};
export type StoreResult={code?:PackErrorCode;order?:StoredPackOrder;orders?:StoredPackOrder[];trip?:StoredPackTrip;token?:string;create?:boolean};
export class PackFailure extends Error{constructor(public code:PackErrorCode,public status:number, message:string,public issues?:string[]){super(message);}}
const messages:Partial<Record<PackErrorCode,string>>={not_found:'This saved trip or pack could not be found.',conflict:'The saved trip or file changed. Reload it before retrying.',rate_limit:'The hourly PDF limit has been reached. Try again later.',busy:'Another PDF is being prepared. Wait briefly before retrying.',file_limit:'You already have three unpurchased packs. Reuse one or wait for unused previews to expire.',invalid_file:'The PDF could not be prepared safely. Your previous file is unchanged.',expired:'The 90-day regeneration window has ended. Your existing file is still available.',revoked:'This test entitlement has been revoked.',terms_required:'Please accept the current Trip Pack terms.',already_paid:'This trip already has an active pack.'};
export async function packStore(owner:string,action:string,data:Record<string,unknown>={}):Promise<StoreResult>{
 const result=await callGrowthRpc<StoreResult>('ramble_pack_owner',{p_owner:owner,p_action:action,p_data:data});
 if(result.code)throw new PackFailure(result.code,result.code==='not_found'?404:result.code==='rate_limit'?429:result.code==='revoked'?403:409,messages[result.code]||'This action is unavailable. Reload and retry.');
 return result;
}
export function packEvent(event:VerifiedPackEvent){return callGrowthRpc<{status:'applied'|'duplicate'|'unmapped'}>('ramble_pack_event',{p_event:event});}
export function publicOrder(order:StoredPackOrder,tester:boolean):PackOrder{
 return {id:order.id,tripId:order.trip_id,mode:order.mode,state:order.state,version:order.version,locale:order.locale,revision:order.revision,createdAt:order.created_at,paidAt:order.paid_at,expiresAt:order.expires_at,canDownload:order.state==='paid',canRegenerate:tester&&order.state==='paid'&&!!order.expires_at&&Date.parse(order.expires_at)>Date.now(),checkoutUrl:order.state==='pending'?order.checkout_url:null,needsSupport:order.state==='pending'&&!!order.create_attempt_at&&!order.checkout_url};
}
