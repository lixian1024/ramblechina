import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {withModelBudget,budgetedModelFetch} from '../src/lib/growth/model-budget';
import {screenPlacePhotos} from '../src/lib/travel/photo-screening';

async function main(){
 const db=new PGlite();
 try{
  await db.exec('create role anon;create role authenticated;');
  await db.exec(await readFile('supabase/migrations/20261023031908_ramble_growth_trial.sql','utf8'));
  await db.exec("insert into ramble_growth.settings(key,secret_hash,enabled) values ('gateway',encode(sha256(convert_to('fixture','UTF8')),'hex'),true)");
  const generate=randomUUID(),lookup=randomUUID();
  for(const [id,kind,actor] of [[generate,'generate','a'],[lookup,'lookup','b']])await db.query('select public.ramble_growth_admit($1,$2,$3,false,$4,$5)',['fixture',String(actor).repeat(64),String(actor).repeat(64),kind,id]);
  async function admit(id:string){return (await db.query<{status:string}>('select public.ramble_growth_model_admit($1,$2) status',['fixture',id])).rows[0].status;}
  const results=await Promise.all(Array.from({length:40},(_,i)=>admit(i%2?generate:lookup)));
  assert.equal(results.filter(x=>x==='admitted').length,30,'Generation, photo lookup and concurrent child model calls share the same global allowance');
  assert.equal(results.filter(x=>x==='daily_limit').length,10);
  await db.query('select public.ramble_growth_finish($1,$2,null,null)',['fixture',lookup]);
  assert.equal(await admit(lookup),'expired');
  await db.exec("update ramble_growth.settings set enabled=false");assert.equal(await admit(generate),'disabled');
  await assert.rejects(db.query('select public.ramble_growth_model_admit($1,$2)',['wrong',generate]));
  const original=globalThis.fetch;let transports=0;
  globalThis.fetch=async()=>{transports++;return Response.json({ok:true});};
  Object.assign(process.env,{DASHSCOPE_API_KEY:'controlled-qwen',DASHSCOPE_BASE_URL:'https://dashscope.aliyuncs.com/compatible-mode/v1',QWEN_MODEL:'qwen3.6-plus'});
  try{
   await assert.rejects(budgetedModelFetch('https://controlled.invalid/model',{}),/reservation/);
   assert.equal(transports,0);
   await assert.rejects(withModelBudget(generate,()=>budgetedModelFetch('https://controlled.invalid/model',{}),async()=>{throw Error('daily_limit');}));
   assert.equal(transports,0);
   const selected=await withModelBudget(lookup,()=>screenPlacePhotos({name:'Public venue',city:'Shanghai',address:''},['https://controlled.invalid/photo']),async()=>{throw Error('daily_limit');});
   assert.equal(selected,undefined);assert.equal(transports,0,'No vision API or image fetch may start after denied model admission');
   await withModelBudget(generate,()=>budgetedModelFetch('https://controlled.invalid/model',{}),async()=>{});assert.equal(transports,1);
  }finally{globalThis.fetch=original;}
  console.log('PASS: all model child calls including photo lookup share a durable atomic30/day ceiling; expired/stopped/missing-context and quota failures precede model transport.');
 }finally{await db.close();}
}
void main().catch(error=>{console.error(error);process.exitCode=1;});
