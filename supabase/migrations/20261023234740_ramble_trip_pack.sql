-- Private test entitlements only. Existing verified-server gateway; no new auth surface.
begin;
create table ramble_growth.pack_orders (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
 trip_id uuid not null references public.ramble_trips(id) on delete cascade,
 mode text not null default 'test' check(mode='test'), amount integer not null default 990 check(amount=990), currency text not null default 'USD' check(currency='USD'),
 state text not null default 'prepared' check(state in ('prepared','pending','paid','revoked')),
 version integer not null, locale text not null check(locale in ('en','zh')), revision integer not null default 1,
 document jsonb not null check(jsonb_typeof(document)='object' and octet_length(document::text)<=240000),
 pdf text not null check(octet_length(pdf)<=2796204 and octet_length(decode(pdf,'base64')) between 8 and 2097152),
 digest text not null check(digest ~ '^[a-f0-9]{64}$'), document_digest text not null,
 created_at timestamptz not null default now(), paid_at timestamptz, expires_at timestamptz,
 policy_version text, consent_at timestamptz, create_attempt_at timestamptz,
 checkout_id text unique, checkout_url text, provider_order_id text unique, transaction_id text unique,
 check ((paid_at is null and expires_at is null) or expires_at=paid_at+interval '2160 hours')
);
create unique index pack_one_unfinished on ramble_growth.pack_orders(owner_id,trip_id,mode) where state in ('prepared','pending');
create table ramble_growth.pack_events (
 event_id text primary key check(length(event_id) between 1 and 180), digest text not null check(digest ~ '^[a-f0-9]{64}$'),
 kind text not null check(kind in ('paid','revoked')), checkout_id text, provider_order_id text, transaction_id text,
 created_at timestamptz not null default now(), check(checkout_id is not null or provider_order_id is not null or transaction_id is not null)
);
create index pack_revocations_checkout on ramble_growth.pack_events(checkout_id) where kind='revoked';
create index pack_revocations_order on ramble_growth.pack_events(provider_order_id) where kind='revoked';
create index pack_revocations_transaction on ramble_growth.pack_events(transaction_id) where kind='revoked';
create table ramble_growth.pack_renders (
 token uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
 trip_id uuid not null references public.ramble_trips(id) on delete cascade, version integer not null, order_id uuid references ramble_growth.pack_orders(id) on delete cascade,
 created_at timestamptz not null default now(), used boolean not null default false
);
alter table ramble_growth.pack_orders enable row level security;
alter table ramble_growth.pack_events enable row level security;
alter table ramble_growth.pack_renders enable row level security;
revoke all on ramble_growth.pack_orders,ramble_growth.pack_events,ramble_growth.pack_renders from public,anon,authenticated;

-- This small MVP serializes mutations with a transaction advisory lock. Rendering and HTTP
-- happen outside transactions. This also closes the refund-before-attach race.
create function public.ramble_pack_owner(p_secret text,p_owner uuid,p_action text,p_data jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare t public.ramble_trips; o ramble_growth.pack_orders; r ramble_growth.pack_renders; token uuid; bytes bytea;
begin
 if not ramble_growth.authorized(p_secret) then raise exception 'Unauthorized'; end if;
 if p_owner is null or not exists(select 1 from auth.users where id=p_owner) then return jsonb_build_object('code','not_found'); end if;
 perform pg_advisory_xact_lock(720241024);
 if p_action='orders' then
  return jsonb_build_object('orders',coalesce((select jsonb_agg(x) from (select id,trip_id,mode,state,version,locale,revision,created_at,paid_at,expires_at,checkout_url,create_attempt_at from ramble_growth.pack_orders where owner_id=p_owner order by created_at desc limit 100) x),'[]'::jsonb));
 end if;
 if p_data->>'orderId' is not null then
  select * into o from ramble_growth.pack_orders where id=(p_data->>'orderId')::uuid and owner_id=p_owner for update;
  if o.id is null then return jsonb_build_object('code','not_found'); end if;
  select * into t from public.ramble_trips where id=o.trip_id and user_id=p_owner for share;
  if p_data->>'tripId' is not null and (p_data->>'tripId')::uuid<>o.trip_id then return jsonb_build_object('code','not_found'); end if;
 else
  select * into t from public.ramble_trips where id=(p_data->>'tripId')::uuid and user_id=p_owner for share;
 end if;
 if t.id is null then return jsonb_build_object('code','not_found'); end if;
 if p_action='get' then return jsonb_build_object('order',to_jsonb(o)); end if;
 if p_action='trip' then
  select * into o from ramble_growth.pack_orders where trip_id=t.id and owner_id=p_owner order by created_at desc limit 1;
  return jsonb_build_object('trip',to_jsonb(t),'order',case when o.id is not null then to_jsonb(o) end);
 end if;
 if p_action in ('admit','prepare','regenerate') then
  if (p_data->>'version')::integer is distinct from t.version then return jsonb_build_object('code','conflict'); end if;
 end if;
 if p_action='admit' then
  if o.id is not null and (o.state<>'paid' or o.expires_at<=now()) then return jsonb_build_object('code',case when o.state='revoked' then 'revoked' else 'expired' end); end if;
  delete from ramble_growth.pack_renders where created_at<now()-interval '1 day';
  delete from ramble_growth.pack_orders where owner_id=p_owner and state='prepared' and created_at<now()-interval '24 hours';
  if (select count(*) from ramble_growth.pack_renders where owner_id=p_owner and created_at>now()-interval '1 hour')>=6 then return jsonb_build_object('code','rate_limit'); end if;
  if exists(select 1 from ramble_growth.pack_renders where owner_id=p_owner and not used and created_at>now()-interval '2 minutes') then return jsonb_build_object('code','busy'); end if;
  if o.id is null and not exists(select 1 from ramble_growth.pack_orders where owner_id=p_owner and trip_id=t.id and state in ('prepared','pending')) and (select count(*) from ramble_growth.pack_orders where owner_id=p_owner and state in ('prepared','pending'))>=3 then return jsonb_build_object('code','file_limit'); end if;
  insert into ramble_growth.pack_renders(owner_id,trip_id,version,order_id) values(p_owner,t.id,t.version,o.id) returning pack_renders.token into token;
  return jsonb_build_object('token',token,'trip',to_jsonb(t));
 end if;
 if p_action in ('prepare','regenerate','release') then
  select * into r from ramble_growth.pack_renders where pack_renders.token=(p_data->>'token')::uuid and owner_id=p_owner and trip_id=t.id and not used for update;
  if r.token is null then return jsonb_build_object('code','conflict'); end if;
  update ramble_growth.pack_renders set used=true where pack_renders.token=r.token;
  if p_action='release' then return jsonb_build_object('released',true); end if;
  if r.created_at<=now()-interval '2 minutes' or r.version<>t.version or r.order_id is distinct from o.id then return jsonb_build_object('code','conflict'); end if;
  bytes:=decode(p_data->>'pdf','base64');
  if bytes is null or octet_length(bytes) not between 8 and 2097152 or substring(bytes from 1 for 5)<>convert_to('%PDF-','UTF8') or encode(sha256(bytes),'hex') is distinct from p_data->>'digest' or p_data->'document' is null or jsonb_typeof(p_data->'document')<>'object' or octet_length((p_data->'document')::text)>240000 or p_data->>'locale' not in ('en','zh') then return jsonb_build_object('code','invalid_file'); end if;
  if p_action='regenerate' then
   if o.state<>'paid' then return jsonb_build_object('code','revoked'); end if;
   if o.expires_at<=now() then return jsonb_build_object('code','expired'); end if;
   if o.revision is distinct from (p_data->>'revision')::integer then return jsonb_build_object('code','conflict'); end if;
  else
   select * into o from ramble_growth.pack_orders where owner_id=p_owner and trip_id=t.id and (state in ('prepared','pending') or state='paid' and expires_at>now()) order by created_at desc limit 1 for update;
   if o.state in ('pending','paid') then return jsonb_build_object('order',to_jsonb(o)); end if;
  end if;
  if o.id is null then
   insert into ramble_growth.pack_orders(owner_id,trip_id,version,locale,document,pdf,digest,document_digest) values(p_owner,t.id,t.version,p_data->>'locale',p_data->'document',p_data->>'pdf',p_data->>'digest',encode(sha256(convert_to((p_data->'document')::text,'UTF8')),'hex')) returning * into o;
  else
   update ramble_growth.pack_orders set version=t.version,locale=p_data->>'locale',document=p_data->'document',pdf=p_data->>'pdf',digest=p_data->>'digest',document_digest=encode(sha256(convert_to((p_data->'document')::text,'UTF8')),'hex'),revision=revision+1 where id=o.id returning * into o;
  end if;
  return jsonb_build_object('order',to_jsonb(o));
 end if;
 if p_action='claim' then
  if o.state<>'prepared' then return jsonb_build_object('order',to_jsonb(o),'create',false); end if;
  if o.version<>t.version then return jsonb_build_object('code','conflict'); end if;
  if p_data->>'policyVersion' is distinct from 'trip-pack-2026-10-24-v1' then return jsonb_build_object('code','terms_required'); end if;
  -- A current paid entitlement blocks all new checkout attempts, including stale prepared records.
  if exists(select 1 from ramble_growth.pack_orders where owner_id=p_owner and trip_id=t.id and state='paid' and expires_at>now()) then return jsonb_build_object('code','already_paid'); end if;
  update ramble_growth.pack_orders set state='pending',policy_version=p_data->>'policyVersion',consent_at=now(),create_attempt_at=now() where id=o.id returning * into o;
  return jsonb_build_object('order',to_jsonb(o),'create',true);
 end if;
 if p_action='attach' then
  if o.create_attempt_at is null or o.state not in ('pending','paid','revoked') then return jsonb_build_object('code','conflict'); end if;
  if o.checkout_id is not null and o.checkout_id is distinct from p_data->>'checkoutId' then return jsonb_build_object('code','conflict'); end if;
  if p_data->>'checkoutId' is null or length(p_data->>'checkoutId')>180 or p_data->>'checkoutUrl' is null or length(p_data->>'checkoutUrl')>2000 then return jsonb_build_object('code','conflict'); end if;
  update ramble_growth.pack_orders set checkout_id=p_data->>'checkoutId',checkout_url=p_data->>'checkoutUrl',state=case when exists(select 1 from ramble_growth.pack_events where kind='revoked' and checkout_id=p_data->>'checkoutId') then 'revoked' else state end where id=o.id returning * into o;
  return jsonb_build_object('order',to_jsonb(o));
 end if;
 return jsonb_build_object('code','invalid_action');
end; $$;

create function public.ramble_pack_event(p_secret text,p_event jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare o ramble_growth.pack_orders; previous text; ch text:=nullif(p_event->>'checkoutId',''); po text:=nullif(p_event->>'orderId',''); tr text:=nullif(p_event->>'transactionId','');
begin
 if not ramble_growth.authorized(p_secret) then raise exception 'Unauthorized'; end if;
 perform pg_advisory_xact_lock(720241024);
 if p_event->>'kind' not in ('paid','revoked') or length(ch)>180 or length(po)>180 or length(tr)>180 then raise exception 'Invalid event'; end if;
 select digest into previous from ramble_growth.pack_events where event_id=p_event->>'eventId';
 if previous is not null then
  if previous is distinct from p_event->>'digest' then raise exception 'Event collision'; end if;
  return jsonb_build_object('status','duplicate');
 end if;
 -- Payment confirmation needs the original persisted attempt. request_id allows recovery
 -- after provider POST succeeded but attaching its response failed; it is never idempotency.
 select * into o from ramble_growth.pack_orders where checkout_id=ch or provider_order_id=po or transaction_id=tr or
 (p_event->>'requestId'=id::text and create_attempt_at is not null and checkout_id is null) order by created_at limit 1 for update;
 if p_event->>'kind'='paid' and o.id is null then return jsonb_build_object('status','unmapped'); end if;
 if o.id is not null and ((o.checkout_id is not null and ch is not null and o.checkout_id<>ch) or (o.provider_order_id is not null and po is not null and o.provider_order_id<>po) or (o.transaction_id is not null and tr is not null and o.transaction_id<>tr)) then raise exception 'Payment identifiers changed'; end if;
 insert into ramble_growth.pack_events(event_id,digest,kind,checkout_id,provider_order_id,transaction_id) values(p_event->>'eventId',p_event->>'digest',p_event->>'kind',ch,po,tr);
 if o.id is not null then
  update ramble_growth.pack_orders set checkout_id=coalesce(checkout_id,ch),provider_order_id=coalesce(provider_order_id,po),transaction_id=coalesce(transaction_id,tr),
   state=case when state='revoked' or p_event->>'kind'='revoked' or exists(select 1 from ramble_growth.pack_events where kind='revoked' and (checkout_id=ch or provider_order_id=po or transaction_id=tr)) then 'revoked' else 'paid' end,
   paid_at=case when p_event->>'kind'='paid' then coalesce(paid_at,now()) else paid_at end,
   expires_at=case when p_event->>'kind'='paid' then coalesce(expires_at,now()+interval '2160 hours') else expires_at end where id=o.id;
 end if;
 return jsonb_build_object('status','applied');
end; $$;
revoke all on function public.ramble_pack_owner(text,uuid,text,jsonb),public.ramble_pack_event(text,jsonb) from public;
grant execute on function public.ramble_pack_owner(text,uuid,text,jsonb),public.ramble_pack_event(text,jsonb) to anon,authenticated;
commit;
