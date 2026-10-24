import {createHash} from 'node:crypto';
import {z} from 'zod';
import {accountSession,readMutation} from '../account/http';
import {preparePack} from './model';
import {renderPackPdf} from './pdf';
import {PACK_POLICY_VERSION,type PackAvailability,type PackPreviewResponse} from './api-types';
import {boundedBody,checkoutUrl,creemRequest,packConfig,paymentEvent,validateCheckout,validateProduct,verifyCreemEvent,type PackConfig} from './creem';
import {packEvent,PackFailure,packStore,publicOrder,type StoredPackOrder} from './store';

export const packHeaders={'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'};
const json=(value:unknown,status=200)=>Response.json(value,{status,headers:packHeaders});
const hotel=z.object({name:z.string().trim().min(1).max(240),address:z.string().trim().min(1).max(500)}).strict();
const prepareInput=z.object({tripId:z.string().uuid(),version:z.number().int().min(1),locale:z.enum(['en','zh']),hotel:hotel.optional()}).strict();
const regenerateInput=prepareInput.omit({tripId:true}).extend({orderId:z.string().uuid()}).strict();
const checkoutInput=z.object({orderId:z.string().uuid(),acceptedTerms:z.literal(true),policyVersion:z.literal(PACK_POLICY_VERSION)}).strict();
function failure(error:unknown){
 if(error instanceof PackFailure)return json({error:{code:error.code,message:error.message},...(error.issues?{issues:error.issues}:{})},error.status);
 if(error instanceof z.ZodError)return json({error:{code:'invalid_input',message:'Please check the submitted details.'}},400);
 const cause=error instanceof Error?error.message:'';
 if(['origin','format','body','size'].includes(cause)||error instanceof SyntaxError)return json({error:{code:cause==='origin'?'forbidden':'invalid_input',message:cause==='origin'?'Please use the Ramble China website.':'Please check the submitted details.'}},cause==='origin'?403:400);
 return json({error:{code:'unavailable',message:'Trip Pack services are unavailable. Your existing file is unchanged. Please retry later.'}},503);
}
function requireTester(owner:string,config:PackConfig){
 if(!config.available)throw new PackFailure('unavailable',503,'Test checkout is unavailable. Live payments are not enabled.');
 if(!config.testers.has(owner))throw new PackFailure('forbidden',403,'Test checkout is limited to approved testers.');
}
function availability(owner:string,config:PackConfig):PackAvailability{return {mode:config.mode,checkoutAvailable:config.available&&config.testers.has(owner),reason:!config.available?'Test checkout is unavailable. Live payments are not enabled.':!config.testers.has(owner)?'Test checkout is limited to approved testers.':null,amount:990,currency:'USD',policyVersion:PACK_POLICY_VERSION};}
function orderResponse(order:StoredPackOrder & {checkoutExpired?:boolean},owner:string,config:PackConfig){return json({order:{...publicOrder(order,config.available&&config.testers.has(owner)),...(order.checkoutExpired?{checkoutExpired:true}:{})}});}
function queryId(request:Request,key:string){return z.string().uuid().parse(new URL(request.url).searchParams.get(key));}
async function reconcile(owner:string,order:StoredPackOrder,config:PackConfig){
 if(order.state!=='pending'||!order.checkout_id||!config.available)return order;
 const body=await creemRequest(config,'checkouts?checkout_id='+encodeURIComponent(order.checkout_id));
 const valid=validateCheckout(body,config.productId);
 if(valid.checkout.id!==order.checkout_id||(valid.checkout.request_id!==undefined&&valid.checkout.request_id!==order.id))throw new PackFailure('invalid_payment',503,'The provider checkout could not be matched. Please contact support.');
 if(valid.checkout.status==='expired')return {...order,checkoutExpired:true};
 if(valid.paid){
  const digest=createHash('sha256').update(JSON.stringify(body)).digest('hex');
  const event=paymentEvent(body,config.productId,'reconcile_'+order.checkout_id+'_'+digest.slice(0,20),digest)!;
  await packEvent(event);return (await packStore(owner,'get',{orderId:order.id})).order!;
 }
 return order;
}
/** Production entry points delegate here so authentication, privacy and errors are consistent. */
export async function handlePack(request:Request,action:'preview'|'prepare'|'checkout'|'status'|'download'|'regenerate'|'orders'){
 try{
  const session=await accountSession();
  if(session.response){const signIn=session.response.status===401;return json({error:{code:signIn?'sign_in':'unavailable',message:signIn?'Sign in to access your private Trip Pack.':'Account services are unavailable. Please retry.'}},session.response.status);}
  const owner=session.user.id,config=packConfig(),tester=config.available&&config.testers.has(owner);
  if(action==='orders'){const result=await packStore(owner,'orders');return json({orders:(result.orders||[]).map(order=>publicOrder(order,tester))});}
  if(action==='preview'){
   const tripId=queryId(request,'trip'),locale=z.enum(['en','zh']).parse(new URL(request.url).searchParams.get('locale')||'en');
   const stored=await packStore(owner,'trip',{tripId}),trip=stored.trip!;const preview=preparePack(trip.snapshot,locale);
   const result:PackPreviewResponse={trip:{id:trip.id,title:trip.title,version:trip.version},preview:preview.document,issues:preview.issues,config:availability(owner,config),order:stored.order?publicOrder(stored.order,tester):null};return json(result);
  }
  if(action==='status'||action==='download'){
   const orderId=queryId(request,'order');let order=(await packStore(owner,'get',{orderId})).order!;
   if(action==='status'){order=await reconcile(owner,order,config);return orderResponse(order,owner,config);}
   if(order.state==='revoked')throw new PackFailure('revoked',403,'This test entitlement has been revoked.');
   if(order.state!=='paid')throw new PackFailure('payment_pending',409,'Payment has not been confirmed. Check the order status.');
   const bytes=Buffer.from(order.pdf,'base64');
   if(bytes.length>2097152||bytes.subarray(0,5).toString()!=='%PDF-'||createHash('sha256').update(bytes).digest('hex')!==order.digest)throw new PackFailure('invalid_file',503,'The saved file could not be verified. Please contact support.');
   // Historical paid bytes are intentionally not checked against today's venue catalog.
   return new Response(bytes,{headers:{...packHeaders,'Content-Type':'application/pdf','Content-Disposition':`attachment; filename="china-trip-pack-test-${order.id}.pdf"`}});
  }
  const raw=await readMutation(request,6000);
  if(action==='checkout'){
   const input=checkoutInput.parse(raw);requireTester(owner,config);
   let order=(await packStore(owner,'get',{orderId:input.orderId})).order!;
   if(order.state==='paid')return orderResponse(order,owner,config);
   if(order.state==='revoked')throw new PackFailure('revoked',403,'This test entitlement has been revoked.');
   if(order.state==='prepared')validateProduct(await creemRequest(config,'products/'+encodeURIComponent(config.productId)),config.productId);
   const claim=await packStore(owner,'claim',{orderId:order.id,policyVersion:input.policyVersion});order=claim.order!;
   if(!claim.create){if(order.state==='pending'&&!order.checkout_url)throw new PackFailure('checkout_uncertain',409,'Checkout creation is still being reconciled. Contact support before trying another purchase.');return orderResponse(order,owner,config);}
   try{
    // request_id is a correlation ID, not an idempotency guarantee. No automatic POST retry.
    const successUrl=new URL('/en/trip-pack',request.url);successUrl.searchParams.set('order',order.id);successUrl.searchParams.set('trip',order.trip_id);
    const created=await creemRequest(config,'checkouts',{product_id:config.productId,request_id:order.id,units:1,success_url:successUrl.href});
    const validated=validateCheckout(created,config.productId);
    // The synchronous POST response belongs to this persisted attempt; Creem may omit the echo.
    if((validated.checkout.request_id!==undefined&&validated.checkout.request_id!==order.id)||!validated.checkout.checkout_url)throw Error('Unmatched checkout');
    const url=checkoutUrl(validated.checkout.checkout_url,config.productId,validated.checkout.id);
    order=(await packStore(owner,'attach',{orderId:order.id,checkoutId:validated.checkout.id,checkoutUrl:url})).order!;
    return orderResponse(order,owner,config);
   }catch{throw new PackFailure('checkout_uncertain',409,'Checkout creation could not be confirmed. Contact support before trying another purchase.');}
  }
  const input=action==='prepare'?prepareInput.parse(raw):regenerateInput.parse(raw);
  let order:StoredPackOrder|undefined;
  if(action==='regenerate'){requireTester(owner,config);order=(await packStore(owner,'get',{orderId:(input as z.infer<typeof regenerateInput>).orderId})).order!;}
  const tripId='tripId' in input?input.tripId:order!.trip_id;
  const admission=await packStore(owner,'admit',{tripId,version:input.version,...(order?{orderId:order.id}:{})});
  try{
   const prepared=preparePack(admission.trip!.snapshot,input.locale,input.hotel);
   if(!prepared.document)throw new PackFailure('unsupported_trip',422,'This saved trip cannot be exported yet. Review the listed details.',prepared.issues);
   // Test-labelled warning travels inside the private file, never in provider metadata.
   prepared.document.warnings.unshift(input.locale==='zh'?'仅供测试：此文件不代表真实付款或正式购买权益。':'TEST ONLY: this file does not represent a real payment or live purchase entitlement.');
   const bytes=Buffer.from(await renderPackPdf(prepared.document));
   if(bytes.length>2097152)throw new PackFailure('invalid_file',413,'This PDF exceeds the 2 MiB limit. Your previous file is unchanged.');
   const stored=await packStore(owner,action,{tripId,version:input.version,locale:input.locale,document:prepared.document,pdf:bytes.toString('base64'),digest:createHash('sha256').update(bytes).digest('hex'),token:admission.token,...(order?{orderId:order.id,revision:order.revision}:{})});
   return orderResponse(stored.order!,owner,config);
  }catch(error){try{await packStore(owner,'release',{tripId,token:admission.token,...(order?{orderId:order.id}:{})});}catch{/* A failed release expires after the bounded render lease. */}throw error;}
 }catch(error){return failure(error);}
}
export async function handlePackWebhook(request:Request){
 try{
  const config=packConfig();if(!config.webhookAvailable)throw new PackFailure('unavailable',503,'Test webhook verification is unavailable.');
  let raw:Buffer;try{raw=await boundedBody(request,256000);}catch{throw new PackFailure('invalid_input',413,'Webhook body is invalid or too large.');}
  let event;try{event=verifyCreemEvent(raw,request.headers.get('creem-signature'),config.webhookSecret,config.productId);}catch(error){throw new PackFailure(error instanceof Error&&error.message==='Invalid signature'?'invalid_signature':'invalid_payment',error instanceof Error&&error.message==='Invalid signature'?401:400,'The webhook could not be verified.');}
  if(!event)return json({received:true});
  const result=await packEvent(event);if(result.status==='unmapped')throw new PackFailure('unavailable',503,'The checkout is not yet mapped. Retry delivery.');
  return json({received:true});
 }catch(error){return failure(error);}
}
