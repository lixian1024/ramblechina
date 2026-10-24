import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {randomUUID,createHmac} from 'node:crypto';
import {packDatabase,secret} from './verify-trip-pack-storage';
const require=createRequire(import.meta.url);
async function main(){
 const db=await packDatabase(),dir=await mkdtemp(join(process.cwd(),'.superpowers/sdd/2026-10-23-china-trip-pack/.api-test-'));
 const owner=randomUUID(),other=randomUUID(),trip=randomUUID();
 await db.query('insert into auth.users values($1),($2)',[owner,other]);
 const snapshot={plan:{startDate:'2026-11-03',days:[{date:'2026-11-03',city:'Shanghai',stops:[{name:'The Bund',durationMinutes:60}]}]},messages:[]};
 await db.query("insert into ramble_trips(id,user_id,title,snapshot) values($1,$2,'Shanghai',$3)",[trip,owner,JSON.stringify(snapshot)]);
 Object.assign(process.env,{NEXT_PUBLIC_SUPABASE_URL:'https://controlled-pack.test',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'controlled-key',RAMBLE_GROWTH_SECRET:secret,RAMBLE_PACK_MODE:'test',CREEM_TEST_API_KEY:'creem_test_fixture',CREEM_TEST_PRODUCT_ID:'prod_fixture',CREEM_TEST_WEBHOOK_SECRET:'controlled-hook',RAMBLE_PACK_TESTER_IDS:owner});
 const harness={user:owner as string|null};Object.assign(globalThis,{__packSession:{auth:{getUser:async()=>({data:{user:harness.user?{id:harness.user}:null},error:null})}}});
 let posts=0,providerFailure=false,storageFailure=false,paid=false,conflictingCreateResponse=false;let providerExpired=false;let providerId='ch_fixture';
 const product={id:'prod_fixture',mode:'test',price:990,currency:'USD',billing_type:'onetime',status:'active',pay_what_you_want:false};
 let requestId='';
 function checkout(){return {id:providerId,mode:'test',product,units:1,status:paid?'completed':providerExpired?'expired':'pending',request_id:requestId,checkout_url:'https://www.creem.io/test/checkout/prod_fixture/'+providerId,...(paid?{order:{id:providerId==='ch_fixture'?'ord_fixture':'ord_unknown',mode:'test',product:'prod_fixture',currency:'USD',sub_total:990,amount:990,amount_paid:990,amount_due:990,status:'paid',type:'onetime',transaction:providerId==='ch_fixture'?'tran_fixture':'tran_unknown'}}:{})};}
 const originalFetch=globalThis.fetch;
 globalThis.fetch=async(input,init)=>{
  const url=new URL(String(input));
  if(url.hostname==='controlled-pack.test'){
   if(storageFailure)return Response.json({error:'unavailable'},{status:503});
   const args=JSON.parse(String(init?.body));const fn=url.pathname.split('/').at(-1)!;assert(['ramble_pack_owner','ramble_pack_event'].includes(fn));
   const keys=Object.keys(args);const sql=`select public.${fn}(${keys.map((key,i)=>`${key} => $${i+1}`).join(',')}) result`;
   try{const result=await db.query<{result:unknown}>(sql,keys.map(k=>typeof args[k]==='object'?JSON.stringify(args[k]):args[k]));return Response.json(result.rows[0].result);}catch{return Response.json({error:'database rejected'},{status:400});}
  }
  assert.equal(url.origin,'https://test-api.creem.io');assert.equal(new Headers(init?.headers).get('x-api-key'),'creem_test_fixture');
  if(url.pathname==='/v1/products/prod_fixture')return Response.json(product);
  assert.equal(url.pathname,'/v1/checkouts');
  if(init?.method==='POST'){posts++;const body=JSON.parse(String(init.body));assert.deepEqual(Object.keys(body).sort(),['product_id','request_id','success_url','units']);assert.equal(body.product_id,'prod_fixture');assert.equal(body.units,1);assert(!body.success_url.includes('evil'));requestId=body.request_id;if(providerFailure)throw Error('timeout');}
  else assert.equal(url.searchParams.get('checkout_id'),providerId);
  return Response.json({...checkout(),request_id:init?.method==='POST'&&conflictingCreateResponse?'another-order':undefined});
 };
 try{
  const names=['preview','prepare','checkout','status','download','regenerate','orders','webhook'];const routes:Record<string,Record<'GET'|'POST',(request:Request)=>Promise<Response>>>={};
  for(const name of names){const entry=name==='preview'?'src/app/api/trip-pack/route.ts':`src/app/api/trip-pack/${name}/route.ts`;const outfile=join(dir,name+'.cjs');await build({entryPoints:[join(process.cwd(),entry)],outfile,bundle:true,platform:'node',format:'cjs',packages:'external',define:{'import.meta.url':JSON.stringify(pathToFileURL(join(process.cwd(),'src/lib/trip-pack/pdf.ts')).href)},plugins:[{name:'controlled-auth-transport',setup(b){b.onLoad({filter:/src\/lib\/supabase\/server\.ts$/},()=>({contents:'export async function createClient(){return globalThis.__packSession}',loader:'ts'}));}}]});routes[name]=require(outfile);}
  const req=(name:string,body?:unknown,query='',origin='http://localhost:3000')=>new Request('http://localhost:3000/api/trip-pack'+(name==='preview'?'':'/'+name)+query,{method:body===undefined?'GET':'POST',headers:{origin,'content-type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
  const run=async(name:string,body?:unknown,query='',origin?:string)=>{const response=await routes[name][body===undefined?'GET':'POST'](req(name,body,query,origin));assert.equal(response.headers.get('cache-control'),'private, no-store');assert.equal(response.headers.get('referrer-policy'),'no-referrer');return response;};
  harness.user=null;assert.equal((await run('preview',undefined,'?trip='+trip)).status,401);harness.user=owner;
  assert.equal((await run('prepare',{tripId:trip,version:1,locale:'en'},'','https://evil.test')).status,403);
  assert.equal((await run('prepare',{tripId:trip,version:1,locale:'en',paid:true})).status,400);
  assert.equal((await run('prepare',{tripId:trip,version:2,locale:'en'})).status,409);
  const preview=await (await run('preview',undefined,'?trip='+trip+'&locale=en')).json();assert(preview.preview);assert.equal(preview.config.checkoutAvailable,true);
  const prepared=await (await run('prepare',{tripId:trip,version:1,locale:'en'})).json();assert.equal(prepared.order.state,'prepared');const orderId=prepared.order.id;
  const buy={orderId,acceptedTerms:true,policyVersion:'trip-pack-2026-10-24-v1'};
  assert.equal((await run('checkout',{...buy,returnUrl:'https://evil.test'})).status,400);
  process.env.RAMBLE_PACK_MODE='live';assert.equal((await run('checkout',buy)).status,503);process.env.RAMBLE_PACK_MODE='test';
  harness.user=other;assert.equal((await run('status',undefined,'?order='+orderId)).status,404);assert.equal((await run('checkout',buy)).status,403);harness.user=owner;
  const checks=await Promise.all([run('checkout',buy),run('checkout',buy)]);assert.equal(posts,1);assert(checks.some(x=>x.status===200),'A verified synchronous create response without request_id must attach');
  const attached=(await db.query<{checkout_id:string;checkout_url:string}>('select checkout_id,checkout_url from ramble_growth.pack_orders where id=$1',[orderId])).rows[0];
  assert.equal(attached.checkout_id,'ch_fixture');assert.equal(attached.checkout_url,'https://www.creem.io/test/checkout/prod_fixture/ch_fixture');
  assert.equal((await run('download',undefined,'?order='+orderId)).status,409);
  providerExpired=true;const expiredStatus=await (await run('status',undefined,'?order='+orderId)).json();assert.equal(expiredStatus.order.checkoutExpired,true,'Provider-confirmed expiry must be projected by the real status route');assert.equal(expiredStatus.order.state,'pending');assert.equal(expiredStatus.order.canDownload,false);assert.equal(posts,1,'Expiry must not create a replacement checkout');providerExpired=false;
  paid=true;
  const invalidPayment=JSON.stringify({id:'evt_underpaid',eventType:'checkout.completed',object:{...checkout(),order:{...checkout().order,sub_total:1}}});
  const invalidSignature=createHmac('sha256','controlled-hook').update(invalidPayment).digest('hex');
  assert.equal((await routes.webhook.POST(new Request('http://localhost:3000/api/trip-pack/webhook',{method:'POST',headers:{'creem-signature':invalidSignature},body:invalidPayment}))).status,400);
  assert.equal((await db.query<{state:string}>('select state from ramble_growth.pack_orders where id=$1',[orderId])).rows[0].state,'pending');
  const status=await (await run('status',undefined,'?order='+orderId)).json();assert.equal(status.order.state,'paid');assert.equal(status.order.canDownload,true);
  const file=await run('download',undefined,'?order='+orderId);assert.equal(file.status,200);assert(Buffer.from(await file.arrayBuffer()).subarray(0,5).equals(Buffer.from('%PDF-')));
  assert.equal((await (await run('orders')).json()).orders.length,1);
  const before=(await db.query<{pdf:string}>('select pdf from ramble_growth.pack_orders where id=$1',[orderId])).rows[0].pdf;
  await db.query('update ramble_trips set snapshot=$1,version=2 where id=$2',[JSON.stringify({...snapshot,plan:{...snapshot.plan,days:[{...snapshot.plan.days[0],stops:[{name:'Unknown stop',durationMinutes:60}]}]}}),trip]);
  assert.equal((await run('regenerate',{orderId,version:2,locale:'en'})).status,422);
  assert.equal((await db.query<{pdf:string}>('select pdf from ramble_growth.pack_orders where id=$1',[orderId])).rows[0].pdf,before);
  const refund={id:'evt_refund_api',eventType:'refund.created',object:{mode:'test',status:'succeeded',refund_amount:1,order:{id:'ord_fixture',product:'prod_fixture',mode:'test'},checkout:{id:providerId,mode:'test'},transaction:{id:'tran_fixture',mode:'test'}}};
  const raw=JSON.stringify(refund);const hook=(signature:string)=>new Request('http://localhost:3000/api/trip-pack/webhook',{method:'POST',headers:{'creem-signature':signature},body:raw});
  const signature=createHmac('sha256','controlled-hook').update(raw).digest('hex');
  assert.equal((await routes.webhook.POST(hook('bad'))).status,401);storageFailure=true;assert.equal((await routes.webhook.POST(hook(signature))).status,503);storageFailure=false;
  // Disabling future purchases must not strand existing paid rights after a refund.
  Object.assign(process.env,{RAMBLE_PACK_MODE:'off',RAMBLE_PACK_TESTER_IDS:'',CREEM_TEST_API_KEY:''});
  assert.equal((await run('download',undefined,'?order='+orderId)).status,200);
  assert.equal((await run('checkout',buy)).status,503,'New purchases remain disabled');
  assert.equal((await routes.webhook.POST(hook(signature))).status,200,'Signed refunds remain ingestible while checkout is disabled');
  assert.equal((await routes.webhook.POST(hook(signature))).status,200);
  assert.equal((await routes.webhook.POST(hook('bad'))).status,401,'Disabled checkout does not bypass HMAC');
  assert.equal((await run('download',undefined,'?order='+orderId)).status,403);
  Object.assign(process.env,{RAMBLE_PACK_MODE:'test',RAMBLE_PACK_TESTER_IDS:owner,CREEM_TEST_API_KEY:'creem_test_fixture'});
  // Unknown provider create outcome persists across requests and must not buy twice.
  const trip2=randomUUID();await db.query("insert into ramble_trips(id,user_id,title,snapshot) values($1,$2,'Second',$3)",[trip2,owner,JSON.stringify(snapshot)]);
  const second=await (await run('prepare',{tripId:trip2,version:1,locale:'en'})).json();providerFailure=true;providerId='ch_unknown';
  assert.equal((await run('checkout',{...buy,orderId:second.order.id})).status,409);assert.equal((await run('checkout',{...buy,orderId:second.order.id})).status,409);assert.equal(posts,2);
  // A valid signed checkout correlated to the persisted attempt recovers an unknown POST outcome.
  const recoveredRaw=JSON.stringify({id:'evt_recovered',eventType:'checkout.completed',object:checkout()});
  const recoveredSignature=createHmac('sha256','controlled-hook').update(recoveredRaw).digest('hex');
  const recoveredRequest=()=>new Request('http://localhost:3000/api/trip-pack/webhook',{method:'POST',headers:{'creem-signature':recoveredSignature},body:recoveredRaw});
  assert.equal((await routes.webhook.POST(recoveredRequest())).status,200);assert.equal((await routes.webhook.POST(recoveredRequest())).status,200);
  assert.equal((await (await run('status',undefined,'?order='+second.order.id)).json()).order.state,'paid');
  // A present but conflicting correlation ID must still fail closed and never create twice.
  const trip3=randomUUID();await db.query("insert into ramble_trips(id,user_id,title,snapshot) values($1,$2,'Conflicting response',$3)",[trip3,owner,JSON.stringify(snapshot)]);
  const third=await (await run('prepare',{tripId:trip3,version:1,locale:'en'})).json();
  paid=false;providerFailure=false;providerId='ch_conflicting';conflictingCreateResponse=true;
  assert.equal((await run('checkout',{...buy,orderId:third.order.id})).status,409);
  assert.equal((await db.query<{checkout_id:string|null}>('select checkout_id from ramble_growth.pack_orders where id=$1',[third.order.id])).rows[0].checkout_id,null);
  assert.equal((await run('checkout',{...buy,orderId:third.order.id})).status,409);assert.equal(posts,3);
  console.log('PASS actual pack routes: auth, origin, strict payload, cross-owner, off/live denial, single checkout, provider-confirmed hosted expiry projection, reconciliation, PDF, failed regen retention, signed durable refund, uncertain timeout no retry');
 }finally{globalThis.fetch=originalFetch;await db.close();await rm(dir,{recursive:true,force:true});}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
