import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID,createHash} from 'node:crypto';
import type {StoredPackOrder} from '../src/lib/trip-pack/store';
type SqlResult={code?:string;trip:{id:string};order:StoredPackOrder;token:string;create:boolean;status:string};
import {PGlite} from '@electric-sql/pglite';

export async function packDatabase(){
 const db=new PGlite();
 await db.exec(`create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;`);
 for(const name of ['20261011000100_ramble_accounts.sql','20261023031908_ramble_growth_trial.sql','20261023234740_ramble_trip_pack.sql'])await db.exec(await readFile('supabase/migrations/'+name,'utf8'));
 await db.query("insert into ramble_growth.settings(key,secret_hash) values('gateway',$1)",[createHash('sha256').update('controlled-secret-for-pack-testing-only').digest('hex')]);
 return db;
}
export const secret='controlled-secret-for-pack-testing-only';
export async function main(){
 const db=await packDatabase(),owner=randomUUID(),other=randomUUID(),trip=randomUUID();
 await db.query('insert into auth.users values($1),($2)',[owner,other]);
 await db.query("insert into ramble_trips(id,user_id,title,snapshot) values($1,$2,'Fixture','{}')",[trip,owner]);
 const call=async(action:string,data:unknown={},actor=owner)=>(await db.query<{result:SqlResult}>('select public.ramble_pack_owner($1,$2,$3,$4) result',[secret,actor,action,JSON.stringify(data)])).rows[0].result;
 const event=async(data:unknown)=>(await db.query<{result:SqlResult}>('select public.ramble_pack_event($1,$2) result',[secret,JSON.stringify(data)])).rows[0].result;
 assert.equal((await call('trip',{tripId:trip})).trip.id,trip);
 assert.equal((await call('trip',{tripId:trip},other)).code,'not_found');
 await assert.rejects(db.query("select public.ramble_pack_owner('bad',$1,'trip',$2)",[owner,JSON.stringify({tripId:trip})]));
 for(const role of ['anon','authenticated'])await assert.rejects(db.transaction(async tx=>{await tx.exec('set local role '+role);return tx.query('select * from ramble_growth.pack_orders');}));
 const pdf=Buffer.from('%PDF-1.7 fixture'),file={document:{schemaVersion:1,locale:'en'},pdf:pdf.toString('base64'),digest:createHash('sha256').update(pdf).digest('hex'),version:1,locale:'en'};
 async function prepare(){const admission=await call('admit',{tripId:trip,version:1});assert(admission.token);return call('prepare',{...file,tripId:trip,token:admission.token});}
 const prepared=await prepare();assert.equal(prepared.order.state,'prepared');
 const reused=await prepare();assert.equal(reused.order.id,prepared.order.id);
 const orderId=prepared.order.id;
 assert.equal((await call('get',{orderId},other)).code,'not_found');
 await db.query('update ramble_trips set version=2 where id=$1',[trip]);
 assert.equal((await call('claim',{orderId,policyVersion:'trip-pack-2026-10-24-v1'})).code,'conflict','Cannot purchase an outdated prepared version');
 await db.query('update ramble_trips set version=1 where id=$1',[trip]);
 const claims=await Promise.all([call('claim',{orderId,policyVersion:'trip-pack-2026-10-24-v1'}),call('claim',{orderId,policyVersion:'trip-pack-2026-10-24-v1'})]);
 assert.equal(claims.filter(x=>x.create===true).length,1,'Only one concurrent checkout admission');
 assert.equal((await call('claim',{orderId,policyVersion:'trip-pack-2026-10-24-v1'})).create,false,'Unknown creation outcome never retries POST');
 await call('attach',{orderId,checkoutId:'ch_fixture',checkoutUrl:'https://www.creem.io/test/payment/ch_fixture'});
 const paid={eventId:'evt_paid',digest:'a'.repeat(64),kind:'paid',checkoutId:'ch_fixture',orderId:'ord_fixture',transactionId:'tran_fixture'};
 assert.equal((await event(paid)).status,'applied');
 const first=(await call('get',{orderId})).order;assert.equal(first.state,'paid');assert(first.expires_at&&first.paid_at);assert.equal(Date.parse(first.expires_at)-Date.parse(first.paid_at),2160*3600*1000);
 await event(paid);await event({...paid,eventId:'evt_paid_again'});
 assert.equal((await call('get',{orderId})).order.paid_at,first.paid_at);
 assert.equal((await prepare()).order.id,orderId,'Paid rights reused without another purchase');
 const admission=await call('admit',{orderId,tripId:trip,version:1});
 assert.equal((await call('regenerate',{...file,tripId:trip,orderId,token:admission.token,revision:999})).code,'conflict');
 assert.equal((await call('get',{orderId})).order.pdf,first.pdf,'Failed CAS preserves prior bytes');
 const good=await call('admit',{orderId,tripId:trip,version:1});
 const revised=await call('regenerate',{...file,tripId:trip,orderId,token:good.token,revision:first.revision});assert.equal(revised.order.revision,first.revision+1);
 await db.transaction(async tx=>{await tx.query('update ramble_growth.pack_orders set expires_at=now(),paid_at=now()-interval \'2160 hours\' where id=$1',[orderId]);const expired=(await tx.query<{r:SqlResult}>('select ramble_pack_owner($1,$2,\'admit\',$3) r',[secret,owner,JSON.stringify({tripId:trip,orderId,version:1})])).rows[0].r;assert.equal(expired.code,'expired');});
 assert.equal((await call('get',{orderId})).order.pdf,first.pdf,'Expired file retained');
 await event({eventId:'evt_refund',digest:'b'.repeat(64),kind:'revoked',checkoutId:null,orderId:'ord_fixture',transactionId:'tran_fixture'});await event({...paid,eventId:'evt_late'});assert.equal((await call('get',{orderId})).order.state,'revoked');
 // Reordered refund is durable before any order has attached its identifiers.
 const trip2=randomUUID();await db.query("insert into ramble_trips(id,user_id,title,snapshot) values($1,$2,'Fixture','{}')",[trip2,other]);
 const ad=await call('admit',{tripId:trip2,version:1},other);const second=(await call('prepare',{...file,tripId:trip2,token:ad.token},other)).order;
 await call('claim',{orderId:second.id,policyVersion:'trip-pack-2026-10-24-v1'},other);
 await event({eventId:'evt_early_refund',digest:'c'.repeat(64),kind:'revoked',checkoutId:'ch_early',orderId:'ord_early',transactionId:'tran_early'});
 await call('attach',{orderId:second.id,checkoutId:'ch_early',checkoutUrl:'https://www.creem.io/test/payment/ch_early'},other);
 await event({...paid,eventId:'evt_early_success',checkoutId:'ch_early',orderId:'ord_early',transactionId:'tran_early'});
 assert.equal((await call('get',{orderId:second.id},other)).order.state,'revoked');
 await db.query('delete from ramble_trips where id=$1',[trip2]);assert.equal((await call('get',{orderId:second.id},other)).code,'not_found');

 const limited=randomUUID();await db.query('insert into auth.users values($1)',[limited]);
 const trips=Array.from({length:4},()=>randomUUID());
 for(const value of trips)await db.query("insert into ramble_trips(id,user_id,title,snapshot) values($1,$2,'Quota','{}')",[value,limited]);
 // File bounds are enforced in the database, even if a server caller passes forged hashes.
 const badAd=await call('admit',{tripId:trips[0],version:1},limited);
 assert.equal((await call('prepare',{...file,tripId:trips[0],token:badAd.token,digest:'0'.repeat(64)},limited)).code,'invalid_file');
 const largeAd=await call('admit',{tripId:trips[0],version:1},limited);
 const oversized=Buffer.alloc(2097153,65);oversized.write('%PDF-');
 assert.equal((await call('prepare',{...file,tripId:trips[0],token:largeAd.token,pdf:oversized.toString('base64'),digest:createHash('sha256').update(oversized).digest('hex')},limited)).code,'invalid_file');
 for(const value of trips.slice(0,3)){const a=await call('admit',{tripId:value,version:1},limited);assert(a.token);await call('prepare',{...file,tripId:value,token:a.token},limited);}
 assert.equal((await call('admit',{tripId:trips[3],version:1},limited)).code,'file_limit');
 const sixth=await call('admit',{tripId:trips[0],version:1},limited);assert(sixth.token);await call('release',{tripId:trips[0],token:sixth.token},limited);
 assert.equal((await call('admit',{tripId:trips[0],version:1},limited)).code,'rate_limit');
 await assert.rejects(event({...paid,digest:'f'.repeat(64)}),'An event ID cannot be reused with another digest');
 await db.close();console.log('PASS pack SQL: owner isolation, narrow gateway, concurrency, no uncertain retry, immutable 2160h, CAS retention, refund first, monotonic revoke, delete purge');
}
if(process.argv[1]?.endsWith('verify-trip-pack-storage.ts'))main().catch(e=>{console.error(e);process.exitCode=1;});
