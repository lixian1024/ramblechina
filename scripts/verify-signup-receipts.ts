import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {receiveSignupClaim} from '../src/lib/growth/signup';

async function main(){
 const user=randomUUID(),other=randomUUID(),old=randomUUID(),unconfirmed=randomUUID();
 const request=(origin='https://www.ramblechina.com')=>new Request('https://www.ramblechina.com/api/analytics/signup',{method:'POST',headers:{origin},body:JSON.stringify({userId:other})});
 const session=async()=>({user:{id:user}});
 let claimed='';
 const claim=async(id:string)=>{claimed=id;return true;};
 let response=await receiveSignupClaim(request(),session,claim);
 assert.equal(response.status,200);assert.deepEqual(await response.json(),{newSignup:true});
 assert.equal(claimed,user,'Server session selects identity; a body cannot claim another account');
 assert.equal(response.headers.get('Cache-Control'),'private, no-store');
 claimed='';assert.equal((await receiveSignupClaim(request('https://evil.test'),session,claim)).status,403);assert.equal(claimed,'');
 assert.equal((await receiveSignupClaim(request(),async()=>({response:Response.json({error:'Sign in'},{status:401})}),claim)).status,401);
 assert.equal((await receiveSignupClaim(request(),session,async()=>{throw Error('private storage error');})).status,503);
 response=await receiveSignupClaim(request(),session,async()=>false);assert.deepEqual(await response.json(),{newSignup:false});
 const db=new PGlite();
 try{
  await db.exec('create role anon; create role authenticated;create schema auth;create table auth.users(id uuid primary key,created_at timestamptz not null,email_confirmed_at timestamptz);');
  const files=await readdir('supabase/migrations');
  await db.exec(await readFile('supabase/migrations/'+files.find(file=>file.endsWith('_ramble_growth_trial.sql')),'utf8'));
  const sql=await readFile('supabase/migrations/'+files.find(file=>file.endsWith('_ramble_signup_receipts.sql')),'utf8');
  await db.exec(sql);await db.exec(sql);
  await db.query("insert into ramble_growth.settings(key,secret_hash) values('gateway',encode(sha256(convert_to('controlled-secret','UTF8')),'hex'))");
  await db.query("insert into auth.users values($1,'2026-10-23T01:00Z','2026-10-23T01:01Z'),($2,'2026-10-24T01:00Z','2026-10-24T01:01Z'),($3,'2026-10-22T23:59Z','2026-10-23T01:01Z'),($4,'2026-10-23T01:00Z',null)",[user,other,old,unconfirmed]);
  const invoke=(id:string,secret='controlled-secret')=>db.transaction(async tx=>{await tx.exec('set local role anon');return (await tx.query<{claimed:boolean}>('select public.ramble_claim_signup($1,$2) as claimed',[secret,id])).rows[0].claimed;});
  assert.equal(await invoke(old),false,'Pre-cutoff users must never be counted as new signup');
  assert.equal(await invoke(unconfirmed),false,'Unverified signup response cannot count');
  assert.equal(await invoke(randomUUID()),false,'Missing identity cannot count');
  await assert.rejects(invoke(user,''),/Unauthorized/);
  const results=await Promise.all(Array.from({length:8},()=>invoke(user)));
  assert.equal(results.filter(Boolean).length,1,'Concurrent clients can claim a verified new account only once');
  assert.equal(await invoke(user),false);assert.equal(await invoke(other),true,'Email and Google accounts use the same verified identity rule');
  for(const role of ['anon','authenticated']){
   await assert.rejects(db.transaction(async tx=>{await tx.exec('set local role '+role);return tx.exec('select * from ramble_growth.signup_receipts');}));
   await assert.rejects(db.transaction(async tx=>{await tx.exec('set local role '+role);return tx.exec('delete from ramble_growth.signup_receipts');}));
  }
  await db.query('delete from auth.users where id=$1',[other]);
  assert.equal((await db.query<{n:number}>('select count(*)::int as n from ramble_growth.signup_receipts')).rows[0].n,1,'Deleting an account removes its receipt');
  await db.exec('delete from ramble_growth.settings');await assert.rejects(invoke(other),/Unauthorized/);
 }finally{await db.close();}
 console.log('PASS: actual PostgreSQL verified signup receipt cutoff, no preexisting/unconfirmed counting, atomic dedupe, private permissions, deletion cascade and session-only API identity.');
}
main().catch(error=>{console.error(error);process.exit(1);});
