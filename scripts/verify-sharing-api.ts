import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {createRequire} from 'node:module';
import {createClient} from '@supabase/supabase-js';
import {randomUUID} from 'node:crypto';
async function main(){
 const dir=await mkdtemp(resolve('.sharing-api-test-'));
 try{
  const owner=randomUUID(),id=randomUUID();let calls=0,missing=false,unavailable=false,signedIn=true;
  const client=createClient('https://controlled-share-api.test','controlled-key',{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:async(input,options)=>{
   calls++;if(unavailable)return Response.json({message:'Unavailable'},{status:503});const url=new URL(String(input));
   if(url.pathname.endsWith('/ramble_trips'))return Response.json(missing?[]:[{id}]);
   if(url.pathname.endsWith('/rpc/ramble_share_preview'))return Response.json({schemaVersion:1,days:[{city:'Shanghai',stops:[],uncertainty:[]}],uncertainty:['unverified']});
   assert(url.pathname.endsWith('/ramble_trip_shares'));
   if(options?.method==='POST'){const body=JSON.parse(String(options.body));assert.equal(body.user_id,owner);assert.equal(body.trip_id,id);assert.match(body.token_hash,/^[0-9a-f]{64}$/);assert.equal(body.snapshot,undefined);return Response.json({published_at:'2026-10-23T00:00:00Z'},{status:201});}
   if(options?.method==='DELETE')return new Response(null,{status:204});return Response.json([]);
  }}});
  Object.assign(client.auth,{getUser:async()=>({data:{user:signedIn?{id:owner}:null},error:null})});Object.assign(globalThis,{__rambleShareApiClient:client});
  const outfile=join(dir,'api.cjs');await build({entryPoints:['src/app/api/trips/[id]/share/route.ts'],outfile,bundle:true,platform:'node',format:'cjs',plugins:[{name:'controlled-session-transport',setup(builder){builder.onLoad({filter:/src\/lib\/supabase\/server\.ts$/},()=>({contents:'export async function createClient(){return globalThis.__rambleShareApiClient}',loader:'ts'}));builder.onLoad({filter:/src\/lib\/supabase\/config\.ts$/},()=>({contents:"export const supabaseUrl='https://controlled-share-api.test';export const supabasePublishableKey='controlled-key';export function isSupabaseConfigured(){return true}",loader:'ts'}));}}]});
  const route=createRequire(import.meta.url)(outfile),context={params:Promise.resolve({id})};
  const request=(method:string,body?:unknown,origin='http://localhost:3001')=>new Request('http://localhost:3001/api/trips/'+id+'/share',{method,headers:{origin,'content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
  const before=calls;assert.equal((await route.POST(request('POST',{confirmed:true},'https://evil.test'),context)).status,403);assert.equal((await route.DELETE(request('DELETE',undefined,'https://evil.test'),context)).status,403);assert.equal(calls,before,'Cross-origin mutations never reach storage');
  assert.equal((await route.POST(request('POST',{confirmed:false}),context)).status,400);assert.equal(calls,before,'Disclosure is required before publishing');
  let response=await route.POST(request('POST',{confirmed:true,locale:'zh'}),context);assert.equal(response.status,201);assert.equal(response.headers.get('cache-control'),'private, no-store');assert.match((await response.json()).path,/^\/zh\/shared\/[A-Za-z0-9_-]{43}$/);
  assert.equal((await route.GET(request('GET'),context)).status,200);assert.equal((await route.DELETE(request('DELETE'),context)).status,200);
  missing=true;assert.equal((await route.POST(request('POST',{confirmed:true}),context)).status,404);missing=false;
  assert.equal((await route.GET(request('GET'),{params:Promise.resolve({id:'guessable-private-id'})})).status,404);
  unavailable=true;response=await route.GET(request('GET'),context);assert.equal(response.status,503);unavailable=false;
  signedIn=false;assert.equal((await route.POST(request('POST',{confirmed:true}),context)).status,401);
  console.log('PASS: production sharing API uses real accountSession and SDK, requires owner login/disclosure/UUID/same origin, returns random locale links, private no-store, distinguishes missing from unavailable.');
 }finally{delete (globalThis as Record<string,unknown>).__rambleShareApiClient;await rm(dir,{recursive:true,force:true});}
}
main().catch(error=>{console.error(error);process.exitCode=1});
