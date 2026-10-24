import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
async function main(){
 const {packConfig,validateProduct,validateCheckout,verifyCreemEvent,checkoutUrl,boundedBody}=await import('../src/lib/trip-pack/creem');
 const env={RAMBLE_PACK_MODE:'test',CREEM_TEST_API_KEY:'creem_test_fixture',CREEM_TEST_PRODUCT_ID:'prod_fixture',CREEM_TEST_WEBHOOK_SECRET:'controlled-hook',RAMBLE_PACK_TESTER_IDS:'00000000-0000-4000-8000-000000000001'};
 assert.equal(packConfig(env).mode,'test');assert.equal(packConfig({...env,RAMBLE_PACK_MODE:'live'}).mode,'off');assert.equal(packConfig({...env,CREEM_TEST_API_KEY:'creem_live_bad'}).available,false);
 for(const disabled of [{RAMBLE_PACK_MODE:'off'},{RAMBLE_PACK_TESTER_IDS:''},{CREEM_TEST_API_KEY:''}]){
  const config=packConfig({...env,...disabled});
  assert.equal(config.available,false);
  assert.equal(config.webhookAvailable,true,'Existing signed events do not need new-purchase eligibility');
 }
 for(const missing of [{CREEM_TEST_PRODUCT_ID:''},{CREEM_TEST_WEBHOOK_SECRET:''}])assert.equal(packConfig({...env,...missing}).webhookAvailable,false);
 const product={id:'prod_fixture',mode:'test',price:990,currency:'USD',billing_type:'onetime',status:'active',pay_what_you_want:false};
 validateProduct({...product,pay_what_you_want:undefined},'prod_fixture');
 validateProduct(product,'prod_fixture');for(const bad of [{price:991},{currency:'CNY'},{mode:'prod'},{billing_type:'recurring'},{pay_what_you_want:true}])assert.throws(()=>validateProduct({...product,...bad},'prod_fixture'));
 const checkout={id:'ch_fixture',mode:'test',product,units:1,status:'completed',request_id:'00000000-0000-4000-8000-000000000009',order:{id:'ord_fixture',mode:'test',product:'prod_fixture',currency:'USD',sub_total:990,amount:990,amount_paid:1089,amount_due:1089,status:'paid',type:'onetime',transaction:'tran_fixture'}};
 assert.equal(validateCheckout(checkout,'prod_fixture').paid,true);
 for(const bad of [{units:2},{mode:'prod'},{status:'pending'},{order:{...checkout.order,sub_total:989}},{order:{...checkout.order,currency:'EUR'}}]){try{assert.equal(validateCheckout({...checkout,...bad},'prod_fixture').paid,false);}catch(error){assert(!(error instanceof assert.AssertionError));}}
 const body=JSON.stringify({id:'evt_fixture',eventType:'checkout.completed',object:checkout});const signature=createHmac('sha256',env.CREEM_TEST_WEBHOOK_SECRET).update(body).digest('hex');
 assert.equal(verifyCreemEvent(Buffer.from(body),signature,'controlled-hook','prod_fixture')?.kind,'paid');
 assert.throws(()=>verifyCreemEvent(Buffer.from(body+' '),signature,'controlled-hook','prod_fixture'));
 assert.throws(()=>verifyCreemEvent(Buffer.from(body),'bad','controlled-hook','prod_fixture'));
 const refund={id:'evt_refund',eventType:'refund.created',object:{id:'ref_1',mode:'test',status:'succeeded',refund_amount:1,refund_currency:'USD',checkout:{id:'ch_fixture',mode:'test'},order:checkout.order,transaction:{id:'tran_fixture',mode:'test',order:'ord_fixture'}}};
 function signed(event:unknown){const raw=Buffer.from(JSON.stringify(event));return verifyCreemEvent(raw,createHmac('sha256','controlled-hook').update(raw).digest('hex'),'controlled-hook','prod_fixture');}
 assert.equal(signed(refund)?.kind,'revoked');assert.equal(signed({...refund,object:{...refund.object,status:'failed'}}),null);assert.equal(signed({...refund,object:{...refund.object,refund_amount:0}}),null);
 assert.equal(signed({...refund,object:{...refund.object,order:{...checkout.order,product:'prod_other'}}}),null);
 assert.equal(signed({...refund,object:{...refund.object,mode:'prod',order:{...checkout.order,mode:'prod',product:'prod_other'}}}),null);
 assert.equal(signed({id:'evt_dispute',eventType:'dispute.created',object:{...refund.object,amount:990}})?.kind,'revoked');
 assert.equal(checkoutUrl('https://www.creem.io/test/checkout/prod_fixture/ch_fixture','prod_fixture','ch_fixture'),'https://www.creem.io/test/checkout/prod_fixture/ch_fixture');
 for(const url of ['https://www.creem.io/test/checkout/prod_other/ch_fixture','https://www.creem.io/test/checkout/prod_fixture/ch_other','https://www.creem.io/test/checkout/prod_fixture/ch_fixture?redirect=https://evil.test','http://www.creem.io/test/payment/abc','https://www.creem.io.evil.test/test/payment/abc','https://www.creem.io/payment/abc','https://evil.test/test/payment/abc','https://user@www.creem.io/test/payment/abc'])assert.throws(()=>checkoutUrl(url,'prod_fixture','ch_fixture'));
 await assert.rejects(boundedBody(new Response('x'.repeat(257000)),256000));
 console.log('PASS Creem schemas: test-only config, product/quantity/subtotal/currency/status, raw HMAC, positive successful refunds, disputes, unrelated product isolation');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
