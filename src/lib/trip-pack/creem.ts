import {createHash,createHmac,timingSafeEqual} from 'node:crypto';
import {z} from 'zod';

const id=z.string().min(1).max(180);
// GET product omits pay_what_you_want in the current Creem response. The operator
// must keep PWYW off; reject it when exposed and independently require exact paid subtotal.
const productSchema=z.object({id,mode:z.literal('test'),price:z.literal(990),currency:z.literal('USD'),billing_type:z.literal('onetime'),status:z.literal('active'),pay_what_you_want:z.literal(false).optional()}).passthrough();
const ref=z.union([id,z.object({id}).passthrough()]);
const refId=(value:z.infer<typeof ref>)=>typeof value==='string'?value:value.id;
export type PackConfig={mode:'off'|'test';available:boolean;webhookAvailable:boolean;key:string;productId:string;webhookSecret:string;testers:Set<string>};
export function packConfig(env:Record<string,string|undefined>=process.env):PackConfig{
 const mode=env.RAMBLE_PACK_MODE==='test'?'test':'off',key=env.CREEM_TEST_API_KEY||'',productId=env.CREEM_TEST_PRODUCT_ID||'',webhookSecret=env.CREEM_TEST_WEBHOOK_SECRET||'';
 const testers=new Set((env.RAMBLE_PACK_TESTER_IDS||'').split(',').map(x=>x.trim()).filter(x=>z.string().uuid().safeParse(x).success));
 // Existing test purchases must still accept signed lifecycle events after checkout is disabled.
 const webhookAvailable=/^prod_[a-zA-Z0-9]+$/.test(productId)&&webhookSecret.length>0;
 return {mode,key,productId,webhookSecret,testers,webhookAvailable,available:mode==='test'&&key.startsWith('creem_test_')&&webhookAvailable&&testers.size>0};
}
export function validateProduct(value:unknown,productId:string){const product=productSchema.parse(value);if(product.id!==productId)throw Error('Product mismatch');return product;}
const checkoutSchema=z.object({id,mode:z.literal('test'),product:ref,units:z.literal(1),status:z.enum(['pending','processing','completed','expired']),request_id:z.string().max(180).optional(),checkout_url:z.string().max(2000).optional(),custom_price:z.number().optional(),order:z.unknown().optional()}).passthrough();
const paidOrderSchema=z.object({id,mode:z.literal('test'),product:ref,currency:z.literal('USD'),sub_total:z.literal(990),amount:z.literal(990),status:z.literal('paid'),type:z.literal('onetime'),transaction:ref,amount_paid:z.number().int().min(990),amount_due:z.number().int().min(990),discount_amount:z.number().optional()}).passthrough();
export function validateCheckout(value:unknown,productId:string){
 const checkout=checkoutSchema.parse(value);
 if(refId(checkout.product)!==productId||checkout.custom_price!==undefined)throw Error('Checkout mismatch');
 if(typeof checkout.product!=='string')validateProduct(checkout.product,productId);
 if(checkout.status!=='completed')return {checkout,paid:false as const};
 const order=paidOrderSchema.parse(checkout.order);
 if(refId(order.product)!==productId||order.amount_paid<order.amount_due||(order.discount_amount||0)!==0)throw Error('Payment mismatch');
 return {checkout,order,paid:true as const};
}
/** No custom hosted domains are accepted. Environment is independently verified in response. */
export function checkoutUrl(value:string,productId:string,checkoutId:string){
 const url=new URL(value);
 if(url.protocol!=='https:'||url.username||url.password||url.port||!['creem.io','www.creem.io'].includes(url.hostname)||url.search||url.hash||url.pathname!==`/test/checkout/${encodeURIComponent(productId)}/${encodeURIComponent(checkoutId)}`)throw Error('Unsafe checkout URL');
 return url.href;
}
export async function creemRequest(config:PackConfig,path:string,body?:unknown):Promise<unknown>{
 if(!config.available)throw Error('Unavailable');
 const response=await fetch('https://test-api.creem.io/v1/'+path,{method:body?'POST':'GET',headers:{'x-api-key':config.key,'Content-Type':'application/json','User-Agent':'RambleChina-TestIntegration/1.0'},...(body?{body:JSON.stringify(body)}:{}),cache:'no-store',redirect:'error',signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw Error('Provider unavailable');
 const raw=await boundedBody(response,256000);return JSON.parse(raw.toString('utf8'));
}
export async function boundedBody(request:Request|Response,max:number){
 const reader=request.body?.getReader();if(!reader)throw Error('Empty body');let length=0;const parts:Uint8Array[]=[];
 while(true){const part=await reader.read();if(part.done)break;length+=part.value.length;if(length>max){await reader.cancel();throw Error('Body too large');}parts.push(part.value);}
 return Buffer.concat(parts);
}
export type VerifiedPackEvent={eventId:string;digest:string;kind:'paid'|'revoked';checkoutId:string|null;orderId:string|null;transactionId:string|null;requestId?:string};
export function paymentEvent(value:unknown,productId:string,eventId:string,digest:string):VerifiedPackEvent|null{
 const validated=validateCheckout(value,productId);if(!validated.paid)return null;
 return {eventId,digest,kind:'paid',checkoutId:validated.checkout.id,orderId:validated.order.id,transactionId:refId(validated.order.transaction),requestId:validated.checkout.request_id};
}
/** Official Creem raw HMAC contract: https://docs.creem.io/code/webhooks */
export function verifyCreemEvent(raw:Buffer,signature:string|null,secret:string,productId:string):VerifiedPackEvent|null{
 if(!secret||!signature||!/^[a-fA-F0-9]{64}$/.test(signature)||!timingSafeEqual(createHmac('sha256',secret).update(raw).digest(),Buffer.from(signature,'hex')))throw Error('Invalid signature');
 const envelope=z.object({id,eventType:z.string(),object:z.record(z.string(),z.unknown())}).parse(JSON.parse(raw.toString('utf8'))),object=envelope.object;
 const digest=createHash('sha256').update(raw).digest('hex');
 if(envelope.eventType==='checkout.completed'){
  const product=ref.safeParse(object.product);if(!product.success||refId(product.data)!==productId)return null;
  return paymentEvent(object,productId,envelope.id,digest);
 }
 if(!['refund.created','dispute.created'].includes(envelope.eventType))return null;
 const productRef=z.object({product:ref}).safeParse(object.order);
 if(productRef.success&&refId(productRef.data.product)!==productId)return null;
 const order=z.object({id,product:ref,mode:z.literal('test')}).passthrough().parse(object.order);
 if(refId(order.product)!==productId)return null;
 if(object.mode!=='test')throw Error('Wrong event mode');
 if(envelope.eventType==='refund.created'&&(object.status!=='succeeded'||typeof object.refund_amount!=='number'||!Number.isSafeInteger(object.refund_amount)||object.refund_amount<=0))return null;
 const transaction=z.object({id,mode:z.literal('test')}).passthrough().parse(object.transaction);
 const checkout=z.object({id,mode:z.literal('test')}).passthrough().optional().parse(object.checkout);
 return {eventId:envelope.id,digest,kind:'revoked',checkoutId:checkout?.id||null,orderId:order.id,transactionId:transaction.id};
}
