import {safeSnapshot,tripWriteSchema,type TripSnapshot} from '@/lib/account/trips';
import type {TripMessage,VerifiedTrip} from '@/lib/travel/concierge-types';
export const guestDraftKey='ramble-guest-draft';
export function stageGuestDraft(plan:VerifiedTrip,messages:TripMessage[]){
 const snapshot=safeSnapshot({plan,messages});
 sessionStorage.setItem(guestDraftKey,JSON.stringify({expiresAt:Date.now()+86400000,snapshot}));
}
export function readGuestDraft():TripSnapshot|null{
 try{const raw=sessionStorage.getItem(guestDraftKey);if(!raw)return null;const data=JSON.parse(raw);if(!Number.isFinite(data.expiresAt)||data.expiresAt<Date.now()){clearGuestDraft();return null;}
 const parsed=tripWriteSchema.shape.snapshot.safeParse(data.snapshot);return parsed.success?safeSnapshot(parsed.data):null;
 }catch{return null;}
}
export function clearGuestDraft(){sessionStorage.removeItem(guestDraftKey);}
