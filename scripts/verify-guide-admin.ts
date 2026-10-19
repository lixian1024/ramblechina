import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {createClient} from '@supabase/supabase-js';
import {guideAdminAccess,readAdminGuideRequests} from '../src/lib/account/guide-admin';
import {safeDestination} from '../src/lib/account/navigation';

async function main() {
  const db = new PGlite();
  const admin = randomUUID(), a = randomUUID(), b = randomUUID();
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to authenticated,anon;`);
  await db.query('insert into auth.users values ($1,$2,now()),($3,$4,now()),($5,$6,now())',
    [admin,'lisabob468@gmail.com',a,'traveler-a@example.invalid',b,'traveler-b@example.invalid']);
  await db.exec(await readFile('supabase/migrations/20261011000100_ramble_accounts.sql','utf8'));
  const migration = await readFile('supabase/migrations/20261019000100_guide_request_admin.sql','utf8');
  await db.exec(migration);
  await db.exec(migration);
  async function as(actor:string, sql:string, values:unknown[]=[]) {
    return db.transaction(async tx=>{
      await tx.exec('set local role authenticated');
      await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[actor]);
      return tx.query<Record<string,unknown>>(sql,values);
    });
  }
  const request = (id:string,destinations:string)=>({requestId:id,name:'Test traveler',email:'traveler@example.invalid',
    destinations,startDate:'',endDate:'',travelers:2,guideLanguage:'English',budget:'',notes:'',consent:true,website:''});
  const first=randomUUID(), second=randomUUID();
  await db.query('insert into public.ramble_guide_requests(id,user_id,request,created_at) values ($1,$2,$3,$4),($5,$6,$7,$8)',
    [first,a,JSON.stringify(request(first,'Shanghai')),'2026-10-18T10:00:00Z',second,b,JSON.stringify(request(second,'Chengdu')),'2026-10-18T11:00:00Z']);
  assert.equal((await as(admin,'select * from public.ramble_guide_requests')).rows.length,2,
    'Designated administrator must be able to read requests belonging to both travelers');
  assert.equal((await as(a,'select * from public.ramble_guide_requests')).rows.length,1);
  assert.equal((await as(b,'select * from public.ramble_guide_requests')).rows.length,1);
  assert.equal((await as(admin,'select public.ramble_is_guide_admin() as allowed')).rows[0].allowed,true);
  assert.equal((await as(a,'select public.ramble_is_guide_admin() as allowed')).rows[0].allowed,false);
  for (const actor of [admin,a]) {
    await assert.rejects(as(actor,'select * from ramble_private.guide_admins'));
    await assert.rejects(as(actor,'insert into ramble_private.guide_admins(user_id) values ($1)',[a]));
    await assert.rejects(as(actor,"update public.ramble_guide_requests set status='contacted'"));
    await assert.rejects(as(actor,'delete from public.ramble_guide_requests'));
  }
  await assert.rejects(db.transaction(async tx=>{await tx.exec('set local role anon');return tx.query('select * from public.ramble_guide_requests');}));
  await assert.rejects(db.transaction(async tx=>{await tx.exec('set local role anon');return tx.query('select public.ramble_is_guide_admin()');}));
  await db.query('insert into public.ramble_profiles(id,full_name) values($1,$2)',[a,'Private profile']);
  await db.query('insert into public.ramble_trips(id,user_id,title,snapshot) values($1,$2,$3,$4)',[randomUUID(),a,'Private trip','{}']);
  assert.equal((await as(admin,'select * from public.ramble_profiles')).rows.length,0);
  assert.equal((await as(admin,'select * from public.ramble_trips')).rows.length,0);
  // Database membership can be revoked without waiting for a JWT refresh.
  await db.query('delete from ramble_private.guide_admins where user_id=$1',[admin]);
  assert.equal((await as(admin,'select * from public.ramble_guide_requests')).rows.length,0);
  await db.exec(migration);
  await db.query('update auth.users set email_confirmed_at=null where id=$1',[admin]);
  assert.equal((await as(admin,'select public.ramble_is_guide_admin() as allowed')).rows[0].allowed,false);
  await assert.rejects(db.exec(migration),/Expected exactly one verified/);
  await db.exec('rollback');
  await db.query('update auth.users set email_confirmed_at=now() where id=$1',[admin]);

  let tableReads = 0;
  function client(actor:string, failure:'none'|'rpc'|'read'|'malformed'='none') {
    return createClient('https://controlled-guide-admin.test','controlled-public-key',{
      auth:{persistSession:false,autoRefreshToken:false},global:{fetch:async(url)=>{
        const parsed=new URL(String(url));
        if (parsed.pathname==='/rest/v1/rpc/ramble_is_guide_admin') {
          if (failure==='rpc') return Response.json({message:'Offline'},{status:503});
          const result=await as(actor,'select public.ramble_is_guide_admin() as allowed');
          return Response.json(result.rows[0].allowed);
        }
        assert.equal(parsed.pathname,'/rest/v1/ramble_guide_requests'); tableReads++;
        if (failure==='read') return Response.json({message:'Offline'},{status:503});
        if (failure==='malformed') return Response.json([{request:null}]);
        const status=parsed.searchParams.get('status')?.replace(/^eq\./,'') ?? null;
        const offset=Number(parsed.searchParams.get('offset')??0),limit=Number(parsed.searchParams.get('limit')??1000);
        const order=parsed.searchParams.get('order')?.split(',').map(value=>{
          assert.match(value,/^(created_at|id)\.(asc|desc)$/);
          return value.replace('.',' ');
        }).join(',') || 'id asc';
        const rows=await as(actor,`select id,reference,request,status,created_at from public.ramble_guide_requests
          where ($1::text is null or status=$1) order by ${order} offset $2 limit $3`,[status,offset,limit]);
        return Response.json(rows.rows);
      }},
    });
  }
  let loaded=await readAdminGuideRequests(client(admin),new URLSearchParams());
  assert.equal(loaded.kind,'ok'); if(loaded.kind!=='ok')throw Error('Expected requests');
  assert.deepEqual(loaded.requests.map(row=>row.request?.destinations),['Chengdu','Shanghai']);
  assert.equal(loaded.hasMore,false,'Two rows must not offer another page');
  const before=tableReads;
  assert.deepEqual(await readAdminGuideRequests(client(a),new URLSearchParams()),{kind:'forbidden'});
  assert.equal(tableReads,before,'A rejected administrator query must not fetch personal requests');
  assert.equal(await guideAdminAccess(client(admin,'rpc')),null);
  for (const mode of ['rpc','read','malformed'] as const) {
    assert.deepEqual(await readAdminGuideRequests(client(admin,mode),new URLSearchParams()),{kind:'unavailable'});
  }
  for(const query of ['page=-1','page=NaN','page=1.5','page=100000','status=unknown']) {
    assert.deepEqual(await readAdminGuideRequests(client(admin),new URLSearchParams(query)),{kind:'invalid'});
  }
  for(let i=0;i<25;i++) {
    const id=randomUUID();
    await db.query('insert into public.ramble_guide_requests(id,user_id,request,status,created_at) values($1,$2,$3,$4,$5)',
      [id,a,JSON.stringify(request(id,`Request ${i}`)),i===0?'closed':'new',new Date(Date.UTC(2026,9,19,0,i)).toISOString()]);
  }
  loaded=await readAdminGuideRequests(client(admin),new URLSearchParams());
  assert.equal(loaded.kind,'ok');if(loaded.kind!=='ok')throw Error('Expected page 1');
  assert.equal(loaded.requests.length,25);assert.equal(loaded.hasMore,true);
  const next=await readAdminGuideRequests(client(admin),new URLSearchParams('page=1'));
  assert.equal(next.kind,'ok');if(next.kind!=='ok')throw Error('Expected page 2');
  assert.equal(next.requests.length,2);assert.equal(next.hasMore,false);
  assert.equal(new Set([...loaded.requests,...next.requests].map(row=>row.id)).size,27);
  const closed=await readAdminGuideRequests(client(admin),new URLSearchParams('status=closed'));
  assert.equal(closed.kind,'ok');if(closed.kind!=='ok')throw Error('Expected filtered result');
  assert.equal(closed.requests.length,1);assert.equal(closed.requests[0].request?.destinations,'Request 0');
  const empty=await readAdminGuideRequests(client(admin),new URLSearchParams('status=reviewing'));
  assert.equal(empty.kind,'ok');if(empty.kind==='ok')assert.equal(empty.requests.length,0);
  const malformedId=randomUUID();
  await as(a,'insert into public.ramble_guide_requests(id,user_id,request) values($1,$2,$3)',[malformedId,a,'{}']);
  await db.query('update public.ramble_guide_requests set created_at=$1 where id=$2',['2026-10-20T00:00:00Z',malformedId]);
  const damaged=await readAdminGuideRequests(client(admin),new URLSearchParams());
  assert.equal(damaged.kind,'ok','One malformed submission must not block review of valid requests');
  if(damaged.kind==='ok') {
    assert.equal(damaged.requests[0].id,malformedId);
    assert.equal(damaged.requests[0].request,null,'Invalid details are explicitly marked instead of fabricated');
    assert(damaged.requests.slice(1).some(row=>row.request?.destinations),'Valid request details remain available');
    assert.equal(damaged.hasMore,true);
  }
  assert.equal(safeDestination('/zh/admin/guide-requests'),'/zh/admin/guide-requests');
  assert.equal(safeDestination('/en/admin/guide-requests'),'/en/admin/guide-requests');
  assert.equal(safeDestination('/en/admin/other'),'/en/account');
  assert.equal(safeDestination('//evil.test/admin/guide-requests'),'/en/account');
  await db.close();
  console.log('PASS: verified-admin bootstrap/rerun, two-owner read, ordinary/anonymous denial, no self-promotion/write/profile/trip access, immediate revoke, unverified denial, production SDK pagination/order/filter/empty/error checks and safe login return.');
}
main().catch(error=>{console.error(error);process.exit(1);});
