import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {createClient} from '@supabase/supabase-js';
import {safeSnapshot,snapshotTitle} from '../src/lib/account/trips';
import type {VerifiedTrip} from '../src/lib/travel/concierge-types';
import {shareStatus,publishShare,revokeShare,lookupShare,ShareNotFound,ShareUnavailable} from '../src/lib/sharing/store';

async function main(){
 const migrations=await readdir('supabase/migrations');
 const sharing=migrations.find(name=>name.endsWith('_ramble_trip_shares.sql'));
 assert(sharing,'Sharing migration must exist');
 const {newShareToken,hashShareToken,shareTokenSchema}=await import('../src/lib/sharing/tokens');
 const tokens=Array.from({length:100},()=>newShareToken());
 assert.equal(new Set(tokens).size,100);for(const token of tokens){assert(shareTokenSchema.safeParse(token).success);assert(Buffer.from(token,'base64url').length>=32);assert.notEqual(hashShareToken(token),token);}
 const db=new PGlite(); const a=randomUUID(),b=randomUUID(),id=randomUUID();
 try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated,anon;`);
 await db.query('insert into auth.users values ($1),($2)',[a,b]);
 await db.exec(await readFile('supabase/migrations/20261011000100_ramble_accounts.sql','utf8'));
 const migration=await readFile('supabase/migrations/'+sharing,'utf8');await db.exec(migration);await db.exec(migration);
 async function as<T=Record<string,unknown>>(actor:string|null,sql:string,parameters:unknown[]=[]){return db.transaction(async tx=>{await tx.exec('set local role '+(actor?'authenticated':'anon'));await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[actor||'']);return tx.query<T>(sql,parameters);});}
 await as(a,'insert into public.ramble_profiles(id,full_name) values($1,$2)',[a,'Jane Smith']);
 const privateMarker='PRIVATE-BOOKING-XYZ';
 const snapshot={messages:[{text:'traveler@example.invalid '+privateMarker}],plan:{title:'Private Jane Smith title',summary:privateMarker,checks:['Unknown opening hours'],createdAt:'2026-10-23T00:00:00Z',days:[{city:'Shanghai',date:'2026-11-20',hotel:'Secret Stay Hotel',hotelPlace:{address:'123 Private Lane'},note:privateMarker,checks:['Reservation availability unknown','Check with Jane and her son Tim about returning to Middle House.'],weather:{high:'28'},stops:[{name:'Yu Garden',durationMinutes:90,why:'Grouped with nearby sights',bookingNote:privateMarker,placeStatus:'unresolved',place:{photo:{url:'https://temporary.test'},address:'123 Private Lane'}},{name:'The Bund',durationMinutes:60,why:'Return to Secret Stay Hotel with '+privateMarker},{name:'Secret Stay Hotel',durationMinutes:60},{name:'Meet Jane Smith',durationMinutes:60}],legs:[{minutes:10,geometry:'private-provider'}]}]}};
 await as(a,'insert into public.ramble_trips(id,user_id,title,snapshot) values($1,$2,$3,$4)',[id,a,'Private title',JSON.stringify(snapshot)]);
 const preview=(await as<{snapshot:unknown}>(a,'select public.ramble_share_preview($1) as snapshot',[id])).rows[0].snapshot;
 assert(preview);const encoded=JSON.stringify(preview);
 for(const secret of [privateMarker,'Jane Smith','traveler@','123 Private Lane','temporary.test','Secret Stay Hotel','private-provider','messages','weather','bookingNote','photo','title','summary'])assert(!encoded.includes(secret),secret+' leaked');
 assert(encoded.includes('Yu Garden'));assert(encoded.includes('2026-11-20'));assert(!encoded.includes('Grouped with nearby sights'));assert(!encoded.includes('reason'));assert(encoded.includes('Opening hours'));assert(encoded.includes('Reservations or admission'));assert(encoded.includes('unverified'));
 assert.equal((await as<{snapshot:unknown}>(b,'select public.ramble_share_preview($1) as snapshot',[id])).rows[0].snapshot,null);
 const first=tokens[0],second=tokens[1];
 await assert.rejects(as(b,'insert into public.ramble_trip_shares(trip_id,user_id,token_hash) values($1,$2,$3)',[id,b,hashShareToken(first)]));
 await assert.rejects(as(a,'insert into public.ramble_trip_shares(trip_id,user_id,token_hash,snapshot) values($1,$2,$3,$4)',[id,a,hashShareToken(first),JSON.stringify({secret:privateMarker})]));
 await as(a,'insert into public.ramble_trip_shares(trip_id,user_id,token_hash) values($1,$2,$3)',[id,a,hashShareToken(first)]);
 assert.equal((await as(b,'select * from public.ramble_trip_shares')).rows.length,0);
 assert.equal((await as(b,'delete from public.ramble_trip_shares where trip_id=$1 returning trip_id',[id])).rows.length,0);
 await assert.rejects(as(null,'select * from public.ramble_trip_shares'));
 const lookup=async(token:string)=>(await as<{snapshot:unknown}>(null,'select public.ramble_read_trip_share($1) as snapshot',[token])).rows[0].snapshot;
 const published=await lookup(first);assert(published);assert(!JSON.stringify(published).includes(id));assert(!JSON.stringify(published).includes(a));assert.deepEqual((published as {snapshot:unknown}).snapshot,preview);
 await as(a,"update public.ramble_trips set snapshot=jsonb_set(snapshot,'{plan,days,0,stops,0,name}','\"Changed saved stop\"') where id=$1",[id]);
 assert.deepEqual(await lookup(first),published,'Saved edits must not silently change a public snapshot');
 await as(a,'update public.ramble_trip_shares set token_hash=$2 where trip_id=$1',[id,hashShareToken(second)]);
 assert.equal(await lookup(first),null,'Republish invalidates the prior link');assert(JSON.stringify(await lookup(second)).includes('Changed saved stop'));
 assert.equal(await lookup('unknown-link'),null);
 assert.equal((await as<{snapshot:unknown}>(null,"select public.ramble_read_trip_share('') as snapshot")).rows[0].snapshot,null);
 await as(a,'delete from public.ramble_trip_shares where trip_id=$1',[id]);assert.equal(await lookup(second),null,'Revoked capability must stop reading');

 function client(actor:string|null){return createClient('https://controlled-share.test','controlled-key',{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:async(input,options)=>{
  const url=new URL(String(input)),body=options?.body?JSON.parse(String(options.body)):null;const path=url.pathname;
  try{
   if(path.endsWith('/rpc/ramble_share_preview'))return Response.json((await as<{snapshot:unknown}>(actor,'select public.ramble_share_preview($1) as snapshot',[body.requested_trip])).rows[0].snapshot);
   if(path.endsWith('/rpc/ramble_read_trip_share'))return Response.json((await as<{snapshot:unknown}>(actor,'select public.ramble_read_trip_share($1) as snapshot',[body.capability])).rows[0].snapshot);
   const tripId=url.searchParams.get(path.endsWith('/ramble_trips')?'id':'trip_id')?.slice(3),userId=url.searchParams.get('user_id')?.slice(3);
   if(path.endsWith('/ramble_trips'))return Response.json((await as(actor,'select id from public.ramble_trips where id=$1 and user_id=$2',[tripId,userId])).rows);
   assert(path.endsWith('/ramble_trip_shares'));
   if(options?.method==='POST'){
    const rows=(await as(actor,'insert into public.ramble_trip_shares(trip_id,user_id,token_hash) values($1,$2,$3) on conflict(trip_id) do update set trip_id=excluded.trip_id,user_id=excluded.user_id,token_hash=excluded.token_hash returning published_at',[body.trip_id,body.user_id,body.token_hash])).rows;
    return Response.json(rows[0],{status:201});
   }
   if(options?.method==='DELETE'){await as(actor,'delete from public.ramble_trip_shares where trip_id=$1 and user_id=$2',[tripId,userId]);return new Response(null,{status:204});}
   return Response.json((await as(actor,'select published_at from public.ramble_trip_shares where trip_id=$1 and user_id=$2',[tripId,userId])).rows);
  }catch{return Response.json({message:'Controlled database denial'},{status:403});}
 }}});}
 const ownerClient=client(a),otherClient=client(b),anonClient=client(null);
 // Exercise the production save transformation before publication. Exact-name
 // filters cannot safely anonymize personalized free prose or hotel aliases.
 const personalId=randomUUID();
 const personalized:VerifiedTrip={title:'Jane Smith private trip',summary:'For Jane and her son Tim',createdAt:'2026-10-23T00:00:00Z',provider:'Google + Amap',checks:['Travel research source could not be verified.'],days:[{
  id:'day-1',city:'Shanghai',title:'Private family day',date:'2026-11-20',hotel:'The Middle House',checks:['Yu Garden: opening hours are unverified.','The 10:00 booking overlaps with the prior stop for Jane and her son Tim, before returning to Middle House.','Reservation availability unknown','Check with Jane and her son Tim about returning to Middle House.'],weather:{status:'forecast',high:'28'},legs:[],stops:[{id:'stop-1',name:'Yu Garden',search:'Yu Garden Shanghai',durationMinutes:90,placeStatus:'unresolved',booked:true,bookingNote:'PRIVATE-BOOKING-XYZ',why:'A relaxed walk for Jane and her son Tim, before returning to Middle House.'}]
 }]};
 const privateSaved=safeSnapshot({plan:personalized,messages:[{role:'user',text:'Jane and son Tim; The Middle House; private conversation'}]});
 await as(a,'insert into public.ramble_trips(id,user_id,title,snapshot) values($1,$2,$3,$4)',[personalId,a,snapshotTitle(privateSaved),JSON.stringify(privateSaved)]);
 const personalCapability=await publishShare(ownerClient,a,personalId);
 const personalRaw=await lookup(personalCapability.token);const publicText=JSON.stringify(personalRaw);
 assert(!/\b(?:Jane|Tim|son)\b/.test(publicText),'Production save→share leaked traveller identity');
 for(const value of ['Middle House','relaxed walk','why','reason','PRIVATE-BOOKING-XYZ'])assert(!publicText.includes(value),'Production save→share leaked '+value);
 assert(privateSaved.plan?.checks.includes('Travel research source could not be verified.'),'Production save must retain app-produced source uncertainty');
 assert(privateSaved.plan?.days[0].checks.includes('Yu Garden: opening hours are unverified.'),'Production save must retain app-produced opening uncertainty');
 const personalPublic=await lookupShare(anonClient,personalCapability.token);assert(personalPublic);
 assert(publicText.includes('Opening hours'),'Saved opening uncertainty must remain visible');
 assert(publicText.includes('conflict'),'Saved timing conflict must remain visible');
 assert(publicText.includes('Reservations or admission'),'Saved reservation uncertainty must remain visible');
 assert(publicText.includes('research or sources'),'Saved source uncertainty must remain visible');
 assert(publicText.includes('additional saved itinerary warning'),'Unrecognized uncertainty must remain visible without raw private prose');
 assert(publicText.includes('Yu Garden'));assert(publicText.includes('2026-11-20'));assert(publicText.includes('90'));
 await revokeShare(ownerClient,a,personalId);

 assert.equal((await shareStatus(ownerClient,a,id)).published,false);
 await assert.rejects(publishShare(otherClient,b,id),ShareNotFound);
 const issued=await publishShare(ownerClient,a,id);assert(shareTokenSchema.safeParse(issued.token).success);
 assert.equal((await shareStatus(ownerClient,a,id)).published,true);
 const publicRead=await lookupShare(anonClient,issued.token);assert(publicRead);assert(JSON.stringify(publicRead).includes('Changed saved stop'));
 assert.equal(await lookupShare(anonClient,hashShareToken(issued.token)),null,'A stored hash is not accepted as a capability');
 const renewed=await publishShare(ownerClient,a,id);assert.notEqual(renewed.token,issued.token);assert.equal(await lookupShare(anonClient,issued.token),null);
 await revokeShare(ownerClient,a,id);await revokeShare(ownerClient,a,id);assert.equal(await lookupShare(anonClient,renewed.token),null);
 const unavailable=createClient('https://controlled-share.test','controlled-key',{auth:{persistSession:false},global:{fetch:async()=>Response.json({message:'Unavailable'},{status:503})}});
 await assert.rejects(shareStatus(unavailable,a,id),ShareUnavailable);await assert.rejects(publishShare(unavailable,a,id),ShareUnavailable);await assert.rejects(revokeShare(unavailable,a,id),ShareUnavailable);await assert.rejects(lookupShare(unavailable,issued.token),ShareUnavailable);
 console.log('PASS: sharing random capability/hash, production save→publish privacy counterexample, fixed public warning summaries, SQL whitelist, explicit uncertainty, two-owner RLS, direct-write denial, no anon table access, frozen snapshot, republish rotation and revocation.');
 }finally{await db.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1});
