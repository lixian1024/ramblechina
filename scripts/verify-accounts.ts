import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { createClient } from '@supabase/supabase-js';
import { safeDestination } from '../src/lib/account/navigation';
import {sameOrigin} from '../src/lib/account/origin';
import { safeSnapshot, tripWriteSchema } from '../src/lib/account/trips';
import { saveAccountGuideRequest } from '../src/lib/account/guide-store';
import { GuideRequestConflict } from '../src/lib/travel/guide-request-store';
import type { VerifiedTrip } from '../src/lib/travel/concierge-types';

async function main(){
  const db=new PGlite();const a=randomUUID(),b=randomUUID(),id=randomUUID();
  await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;grant usage on schema auth to authenticated,anon;`);
  await db.query('insert into auth.users values ($1),($2)',[a,b]);
  const migration=await readFile('supabase/migrations/20261011000100_ramble_accounts.sql','utf8');
  await db.exec(migration);await db.exec(migration); // safe to rerun after a network/console retry
  async function as<T=Record<string,unknown>>(actor:string,sql:string,parameters:unknown[]=[]){return db.transaction(async tx=>{await tx.exec('set local role authenticated');await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[actor]);return tx.query<T>(sql,parameters);});}
  const plan={title:'Shanghai for ten days',summary:'A controlled storage fixture, not a generated itinerary.',createdAt:new Date().toISOString(),provider:'Google + Amap',checks:['Old checks'],days:Array.from({length:10},(_,i)=>({id:`day-${i+1}`,city:'Shanghai',title:`Day ${i+1}`,date:`2026-10-${20+i}`,stops:i?[ ]:[{id:'stop-1',name:'Yu Garden',search:'Yu Garden Shanghai',durationMinutes:90,booked:true,bookingNote:'User-held ticket',placeStatus:'matched',place:{id:'google-test-place',provider:'Google',name:'Provider data',address:'Provider address',point:{lat:31,lng:121},adcode:'',citycode:'',checkedAt:new Date().toISOString(),photo:{url:'https://maps.googleapis.com/temporary-photo'}}}],legs:[],weather:{status:'forecast',high:'28'},checks:[]}))} as VerifiedTrip;
  const snapshot=safeSnapshot({plan,messages:[{role:'user',text:'Ten days, start Oct 20'},{role:'assistant',text:'Map results',sources:[{title:'Google',url:'https://www.google.com/maps/place/test'}]}]});
  assert.equal(snapshot.plan?.days.length,10);assert.equal(snapshot.plan?.days[9].date,'2026-10-29');assert.equal(snapshot.plan?.days[0].stops[0].googlePlaceId,'google-test-place');assert.equal(snapshot.plan?.days[0].stops[0].booked,true);assert.equal(snapshot.plan?.days[0].stops[0].place,undefined);assert.equal(snapshot.plan?.days[0].weather.high,undefined);assert.equal(snapshot.messages[1].sources,undefined);
  assert.throws(()=>tripWriteSchema.parse({id,version:0,snapshot:{plan:null,messages:[]}}));
  for(const bad of ['//evil.test','/en/plan\\evil','https://evil.test','/auth/callback','/en/account\nLocation: evil'])assert.equal(safeDestination(bad),'/en/account');
  assert.equal(safeDestination('/en/plan?trip='+id),'/en/plan?trip='+id);
  assert(sameOrigin(new Request('http://localhost:3001/api/trips',{headers:{host:'127.0.0.1:3001',origin:'http://127.0.0.1:3001'}})));
  assert(!sameOrigin(new Request('http://localhost:3001/api/trips',{headers:{host:'127.0.0.1:3001',origin:'https://evil.test'}})));
  assert(!sameOrigin(new Request('http://localhost:3001/api/trips',{headers:{host:'127.0.0.1:3001'}})));
  await as(a,'insert into public.ramble_profiles(id,full_name) values ($1,$2)',[a,'Traveler A']);
  await assert.rejects(as(a,'insert into public.ramble_profiles(id,full_name) values ($1,$2)',[b,'Forged owner']));
  await as(a,'insert into public.ramble_trips(id,user_id,title,snapshot) values($1,$2,$3,$4)',[id,a,plan.title,JSON.stringify(snapshot)]);
  assert.equal((await as(b,'select * from public.ramble_trips where id=$1',[id])).rows.length,0);
  assert.equal((await as(b,'select * from public.ramble_profiles where id=$1',[a])).rows.length,0);
  assert.equal((await as(b,"update public.ramble_trips set title='Stolen' where id=$1 returning id",[id])).rows.length,0);
  await assert.rejects(as(b,'insert into public.ramble_trips(id,user_id,title,snapshot) values($1,$2,$3,$4)',[randomUUID(),a,'Forged',JSON.stringify(snapshot)]));
  assert.equal((await as(a,'update public.ramble_trips set version=version+1 where id=$1 and version=1 returning version',[id])).rows.length,1);
  assert.equal((await as(a,'update public.ramble_trips set version=version+1 where id=$1 and version=1 returning version',[id])).rows.length,0,'Stale update must not overwrite newer content');
  const restored=(await as<{snapshot:typeof snapshot}>(a,'select snapshot from public.ramble_trips where id=$1',[id])).rows[0].snapshot;
  assert.deepEqual(restored,snapshot,'Saved user choices, dates and bookings must survive a database round trip');
  const input={requestId:randomUUID(),name:'QA Traveler',email:'qa@example.invalid',destinations:'Shenzhen, Chengdu',startDate:'',endDate:'',travelers:2,guideLanguage:'English',budget:'USD 1,000–3,000',notes:'Storage verification only',consent:true as const,website:''};
  function client(actor:string){return createClient('https://controlled-storage.test','controlled-publishable-key',{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:async(url,options)=>{
    const parsed=new URL(String(url));assert.equal(parsed.pathname,'/rest/v1/ramble_guide_requests');
    try{if(options?.method==='POST'){const row=JSON.parse(String(options.body));const result=await as(actor,'insert into public.ramble_guide_requests(id,user_id,request) values($1,$2,$3) returning reference,created_at',[row.id,row.user_id,JSON.stringify(row.request)]);return Response.json(result.rows[0],{status:201});}
      const requestId=parsed.searchParams.get('id')?.slice(3),owner=parsed.searchParams.get('user_id')?.slice(3);
      const result=await as(actor,'select reference,created_at,request from public.ramble_guide_requests where id=$1 and user_id=$2',[requestId,owner]);return Response.json(result.rows);
    }catch(error){return Response.json({code:(error as {code?:string}).code,message:'Controlled database rejection'},{status:400});}
  }}});}
  const receipt=await saveAccountGuideRequest(client(a),a,input);
  assert.deepEqual(await saveAccountGuideRequest(client(a),a,input),receipt,'Same request must return the original receipt');
  await assert.rejects(saveAccountGuideRequest(client(a),a,{...input,notes:'Changed during retry'}),GuideRequestConflict);
  await assert.rejects(saveAccountGuideRequest(client(b),b,input),GuideRequestConflict);
  assert.equal((await as(a,'select * from public.ramble_guide_requests')).rows.length,1);
  assert.equal((await as(b,'select * from public.ramble_guide_requests')).rows.length,0);
  await assert.rejects(as(a,"update public.ramble_guide_requests set status='contacted' where id=$1",[input.requestId]));
  await assert.rejects(as(a,'insert into public.ramble_guide_requests(id,user_id,request,status) values($1,$2,$3,$4)',[randomUUID(),a,JSON.stringify(input),'contacted']));
  await assert.rejects(db.transaction(async tx=>{await tx.exec('set local role anon');return tx.query('select * from public.ramble_trips');}));
  const failing=createClient('https://controlled-storage.test','controlled-key',{auth:{persistSession:false},global:{fetch:async()=>Response.json({message:'Database unavailable'},{status:503})}});
  await assert.rejects(saveAccountGuideRequest(failing,a,input));
  await db.close();
  console.log('PASS: real PostgreSQL migration/rerun, two-user RLS, forged-owner rejection, anonymous denial, immutable guide status, idempotent receipts, conflicting retries, database failure, trip versions, ten-day/booking restoration, provider stripping and safe return paths.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
