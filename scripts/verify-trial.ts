import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {randomUUID,createHash} from 'node:crypto';

async function main(){
const db=new PGlite();
await db.exec('create role anon; create role authenticated;');
const sql=await readFile('supabase/migrations/20261023031908_ramble_growth_trial.sql','utf8');
await db.exec(sql); await db.exec(sql);
await db.exec("insert into ramble_growth.settings(key,secret_hash,enabled) values ('gateway',encode(sha256(convert_to('test-secret','UTF8')),'hex'),true) on conflict(key) do update set enabled=true");
let seq=0;
async function admit(actor:string,guest=true,operation='generate',ip=actor){
  const id=randomUUID();
  const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
  const row=await db.query<{result:{status:string;requestId?:string;plan?:unknown}}>('select public.ramble_growth_admit($1,$2,$3,$4,$5,$6) result',['test-secret',hash(actor),hash(ip),guest,operation,id]);
  return row.rows[0].result;
}
const first=await admit('a');assert.equal(first.status,'admitted');
assert.equal((await admit('a')).status,'guest_limit');
assert.equal((await admit('a',true,'edit')).status,'busy');
await db.query('select public.ramble_growth_finish($1,$2,$3,$4)', ['test-secret',first.requestId,{days:[{city:'Shanghai'}]},[{role:'user',text:'Shanghai three days'}]]);
const edit=await admit('a',true,'edit');assert.equal(edit.status,'admitted');assert.deepEqual(edit.plan,{days:[{city:'Shanghai'}]});
await db.query('select public.ramble_growth_finish($1,$2,$3,$4)',['test-secret',edit.requestId,null,null]);
assert.equal((await admit('a',true,'edit')).status,'guest_limit');
const reservations=await Promise.all(Array.from({length:5},()=>admit(`c${seq++}`)));
assert.equal(reservations.filter(r=>r.status==='admitted').length,2);
assert.equal(reservations.filter(r=>r.status==='busy').length,3);
await db.exec("update ramble_growth.requests set lease_until=now()-interval '1 second' where status='pending'");
assert.equal((await admit('fresh')).status,'admitted');
await db.exec("update ramble_growth.requests set status='finished'");
for(let i=0;i<8;i++){const r=await admit('signed',false);assert.equal(r.status,i<6?'admitted':'ip_limit');if(r.requestId)await db.query('select public.ramble_growth_finish($1,$2,null,null)',['test-secret',r.requestId]);}
// A second IP cannot bypass the account limit.
for(let i=0;i<5;i++){const r=await admit('signed',false,'generate',`new${i}`);assert.equal(r.status,i<4?'admitted':'account_limit');if(r.requestId)await db.query('select public.ramble_growth_finish($1,$2,null,null)',['test-secret',r.requestId]);}
while((await db.query<{n:number}>("select count(*)::int n from ramble_growth.requests where operation<>'lookup'")).rows[0].n<30){const r=await admit(`z${seq++}`);if(r.requestId)await db.query('select public.ramble_growth_finish($1,$2,null,null)',['test-secret',r.requestId]);}
assert.equal((await admit('overglobal')).status,'daily_limit');
await db.exec("update ramble_growth.settings set enabled=false");assert.equal((await admit('off')).status,'disabled');
await assert.rejects(db.query('select public.ramble_growth_admit($1,$2,$3,true,$4,$5)',['wrong','a'.repeat(64),'b'.repeat(64),'generate',randomUUID()]));
await db.exec('set role anon');await assert.rejects(db.query('select * from ramble_growth.requests'));await db.exec('reset role');
await db.close();console.log('PASS: atomic guest/account/IP/global quotas, concurrency, expired lease, canonical edit, fail-closed stop switch and anonymous isolation.');
}
void main().catch(error=>{console.error(error);process.exitCode=1;});
