import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';

async function main() {
  const db=new PGlite();
  await db.exec('create role anon; create role authenticated;');
  const files=await readdir('supabase/migrations');
  await db.exec(await readFile('supabase/migrations/'+files.find(file=>file.endsWith('_ramble_growth_trial.sql')),'utf8'));
  await db.query("insert into ramble_growth.settings(key,secret_hash,enabled) values('gateway',encode(sha256(convert_to($1,'UTF8')),'hex'),false)",['controlled-secret']);
  const sql=await readFile('supabase/migrations/'+files.find(file=>file.endsWith('_ramble_research_requests.sql')),'utf8');
  await db.exec(sql);await db.exec(sql);
  const ip='a'.repeat(64),other='b'.repeat(64);
  const details={email:'traveler@example.invalid',destination:'Shanghai',travelWindow:'November',question:'Will this route work?',language:'en',consent:true};
  const submit=(id:string,hash=ip,request=details,secret='controlled-secret')=>db.transaction(async tx=>{
    await tx.exec('set local role anon');
    return (await tx.query<{receipt:{status:string;requestId:string}}>('select public.ramble_submit_research_request($1,$2,$3,$4::jsonb) as receipt',[secret,id,hash,JSON.stringify(request)])).rows[0].receipt;
  });
  const first=randomUUID();
  assert.equal((await submit(first)).status,'created');
  assert.equal((await submit(first)).status,'duplicate');
  assert.equal((await submit(first,ip,{...details,question:'changed'})).status,'conflict');
  assert.equal((await submit(first,other)).status,'conflict');
  await assert.rejects(submit(randomUUID(),ip,details,''),/Unauthorized/);
  await assert.rejects(submit(randomUUID(),'raw-ip'),/Invalid request/);
  await assert.rejects(submit(randomUUID(),ip,{...details,consent:false}),/Invalid request/);
  await assert.rejects(submit(randomUUID(),ip,{...details,email:'bad'}),/Invalid request/);
  const concurrent=await Promise.all(Array.from({length:5},()=>submit(randomUUID())));
  assert.equal(concurrent.filter(value=>value.status==='created').length,2,'Atomic per-IP/day limit admits only three total');
  assert.equal(concurrent.filter(value=>value.status==='rate_limited').length,3);
  assert.equal((await submit(first)).status,'duplicate','Retries still work after daily cap');
  assert.equal((await submit(randomUUID(),other)).status,'created','Distinct opaque IPs have independent limits');
  for(const role of ['anon','authenticated']) {
    await assert.rejects(db.transaction(async tx=>{await tx.exec('set local role '+role);return tx.exec('select * from ramble_growth.research_requests');}));
    await assert.rejects(db.transaction(async tx=>{await tx.exec('set local role '+role);return tx.exec('delete from ramble_growth.research_requests');}));
  }
  await db.exec("update ramble_growth.research_requests set created_at=now()-interval '1 day'");
  assert.equal((await submit(randomUUID())).status,'created','UTC next day permits new intake');
  await db.exec('delete from ramble_growth.settings');
  await assert.rejects(submit(randomUUID()),/Unauthorized/,'Missing gateway config denies storage');
  assert.equal((await db.query<{n:number}>('select count(*)::int as n from ramble_growth.research_requests')).rows[0].n,5);
  await db.close();
  console.log('PASS: actual PostgreSQL guest RPC, gateway authorization/config failure, private RLS, duplicate/conflict handling and concurrent UTC quota.');
}
main().catch(error=>{console.error(error);process.exit(1);});
