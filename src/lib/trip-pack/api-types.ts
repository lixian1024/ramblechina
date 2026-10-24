import type {PackDocument} from './model';
/** All endpoints require an authenticated owner. Every response is private/no-store/no-referrer.
 * POSTs require same-origin application/json, reject unknown keys. No client payment fields.
 * Test entitlements never represent a real purchase. Browser returns never grant access. */
export const PACK_POLICY_VERSION='trip-pack-2026-10-24-v1';
export type PackErrorCode='sign_in'|'unavailable'|'forbidden'|'invalid_input'|'not_found'|'conflict'|'unsupported_trip'|'rate_limit'|'busy'|'file_limit'|'invalid_file'|'terms_required'|'already_paid'|'expired'|'revoked'|'payment_pending'|'checkout_uncertain'|'invalid_signature'|'invalid_payment';
export type PackError={error:{code:PackErrorCode;message:string};issues?:string[]};
export type PackOrder={id:string;tripId:string;mode:'test';state:'prepared'|'pending'|'paid'|'revoked';version:number;locale:'en'|'zh';revision:number;createdAt:string;paidAt:string|null;expiresAt:string|null;canDownload:boolean;canRegenerate:boolean;checkoutUrl:string|null;checkoutExpired?:boolean;needsSupport:boolean};
export type PackAvailability={mode:'off'|'test';checkoutAvailable:boolean;reason:string|null;amount:990;currency:'USD';policyVersion:typeof PACK_POLICY_VERSION};
/** GET /api/trip-pack?trip=<uuid>&locale=en|zh: preview may be null with actionable issues. */
export type PackPreviewResponse={trip:{id:string;title:string;version:number};preview:PackDocument|null;issues:string[];config:PackAvailability;order:PackOrder|null};
export type PackPrepareInput={tripId:string;version:number;locale:'en'|'zh';hotel?:{name:string;address:string}};
export type PackRegenerateInput=Omit<PackPrepareInput,'tripId'> & {orderId:string};
export type PackCheckoutInput={orderId:string;acceptedTerms:true;policyVersion:typeof PACK_POLICY_VERSION};
/** prepare, regenerate, status, checkout all return this shape. Redirect only when checkoutUrl exists. */
export type PackOrderResponse={order:PackOrder};
/** GET /api/trip-pack/orders: owner-only recovery, newest first, up to 100 records. */
export type PackOrdersResponse={orders:PackOrder[]};
/** download is application/pdf attachment; non-2xx uses PackError, never a redirect. */
