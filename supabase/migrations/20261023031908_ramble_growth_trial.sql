-- Paid work is admitted durably before contacting any provider. Missing settings deny it.
create schema if not exists ramble_growth;
revoke all on schema ramble_growth from public, anon, authenticated;
create table if not exists ramble_growth.settings (
 key text primary key check (key='gateway'), secret_hash text not null,
 enabled boolean not null default false
);
-- Limits are private, adjustable server configuration; defaults are the approved conservative ceilings.
alter table ramble_growth.settings add column if not exists ai_daily_limit integer not null default 30 check(ai_daily_limit between 0 and 30);
alter table ramble_growth.settings add column if not exists account_daily_limit integer not null default 10 check(account_daily_limit between 0 and 10);
alter table ramble_growth.settings add column if not exists ip_daily_limit integer not null default 6 check(ip_daily_limit between 0 and 6);
alter table ramble_growth.settings add column if not exists map_daily_limit integer not null default 120 check(map_daily_limit between 0 and 120);
alter table ramble_growth.settings add column if not exists map_ip_limit integer not null default 20 check(map_ip_limit between 0 and 20);
alter table ramble_growth.settings add column if not exists concurrent_limit integer not null default 2 check(concurrent_limit between 0 and 2);
create table if not exists ramble_growth.trials (
 actor_hash text primary key, generations integer not null default 0,
 revisions integer not null default 0, plan jsonb, messages jsonb,
 expires_at timestamptz not null default now()+interval '24 hours'
);
create table if not exists ramble_growth.requests (
 id uuid primary key, actor_hash text not null, ip_hash text not null,
 guest boolean not null, operation text not null check(operation in ('generate','edit','lookup')),
 created_at timestamptz not null default now(), lease_until timestamptz not null default now()+interval '8 minutes',
 status text not null default 'pending' check(status in ('pending','finished'))
);
create index if not exists ramble_growth_requests_created on ramble_growth.requests(created_at);
alter table ramble_growth.settings enable row level security;
alter table ramble_growth.trials enable row level security;
alter table ramble_growth.requests enable row level security;
revoke all on all tables in schema ramble_growth from public, anon, authenticated;

create or replace function ramble_growth.authorized(p_secret text) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from ramble_growth.settings where key='gateway'
 and length(p_secret)>=1 and secret_hash=encode(sha256(convert_to(p_secret,'UTF8')),'hex'));
$$;
revoke all on function ramble_growth.authorized(text) from public,anon,authenticated;

create or replace function public.ramble_growth_admit(p_secret text,p_actor text,p_ip text,p_guest boolean,p_operation text,p_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare cfg ramble_growth.settings; trial ramble_growth.trials; start_at timestamptz:=date_trunc('day',now() at time zone 'UTC') at time zone 'UTC';
begin
 if not ramble_growth.authorized(p_secret) then raise exception 'Unauthorized'; end if;
 if p_actor !~ '^[a-f0-9]{64}$' or p_ip !~ '^[a-f0-9]{64}$' or p_guest is null or p_operation not in ('generate','edit','lookup') or p_id is null then raise exception 'Invalid admission'; end if;
 select * into cfg from ramble_growth.settings where key='gateway' for update;
 if not cfg.enabled then return jsonb_build_object('status','disabled'); end if;
 -- All admissions serialize on the settings row, including independent server instances.
 delete from ramble_growth.requests where created_at<now()-interval '2 days';
 delete from ramble_growth.trials where expires_at<now();
 if p_guest then
   insert into ramble_growth.trials(actor_hash) values(p_actor) on conflict do nothing;
   select * into trial from ramble_growth.trials where actor_hash=p_actor;
   if p_operation='generate' and trial.generations>=1 or p_operation='edit' and trial.revisions>=1 then return jsonb_build_object('status','guest_limit'); end if;
   if p_operation='edit' and trial.plan is null then return jsonb_build_object('status','busy'); end if;
   if p_operation='lookup' then return jsonb_build_object('status','sign_in'); end if;
 end if;
 if (select count(*) from ramble_growth.requests where created_at>=start_at and (operation='lookup')=(p_operation='lookup')) >= (case when p_operation='lookup' then cfg.map_daily_limit else cfg.ai_daily_limit end) then return jsonb_build_object('status','daily_limit'); end if;
 if not p_guest and (select count(*) from ramble_growth.requests where actor_hash=p_actor and created_at>=start_at and operation<>'lookup')>=cfg.account_daily_limit and p_operation<>'lookup' then return jsonb_build_object('status','account_limit'); end if;
 if (select count(*) from ramble_growth.requests where ip_hash=p_ip and created_at>=start_at and (operation='lookup')=(p_operation='lookup'))>=(case when p_operation='lookup' then cfg.map_ip_limit else cfg.ip_daily_limit end) then return jsonb_build_object('status','ip_limit'); end if;
 if (select count(*) from ramble_growth.requests where status='pending' and lease_until>now())>=cfg.concurrent_limit then return jsonb_build_object('status','busy'); end if;
 if exists(select 1 from ramble_growth.requests where actor_hash=p_actor and status='pending' and lease_until>now()) then return jsonb_build_object('status','busy'); end if;
 insert into ramble_growth.requests(id,actor_hash,ip_hash,guest,operation) values(p_id,p_actor,p_ip,p_guest,p_operation);
 if p_guest then update ramble_growth.trials set generations=generations+case when p_operation='generate' then 1 else 0 end,revisions=revisions+case when p_operation='edit' then 1 else 0 end where actor_hash=p_actor; end if;
 return jsonb_build_object('status','admitted','requestId',p_id,'plan',case when p_guest then trial.plan end,'messages',case when p_guest then trial.messages end);
end; $$;

create or replace function public.ramble_growth_finish(p_secret text,p_id uuid,p_plan jsonb,p_messages jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare req ramble_growth.requests;
begin
 if not ramble_growth.authorized(p_secret) then raise exception 'Unauthorized'; end if;
 select * into req from ramble_growth.requests where id=p_id for update;
 if req.status<>'pending' then return; end if;
 if req.guest and p_plan is not null and req.lease_until<=now() then raise exception 'Trial request expired'; end if;
 if req.guest and p_plan is not null and req.lease_until>now() then
   if octet_length(p_plan::text)>500000 or jsonb_typeof(p_plan)<>'object' or jsonb_typeof(p_messages)<>'array' then raise exception 'Invalid trial result'; end if;
   update ramble_growth.trials set plan=p_plan,messages=p_messages where actor_hash=req.actor_hash;
 end if;
 update ramble_growth.requests set status='finished' where id=p_id;
end; $$;

create or replace function public.ramble_growth_status(p_secret text,p_actor text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare trial ramble_growth.trials; enabled boolean;
begin
 if not ramble_growth.authorized(p_secret) then raise exception 'Unauthorized'; end if;
 select settings.enabled into enabled from ramble_growth.settings where key='gateway';
 select * into trial from ramble_growth.trials where actor_hash=p_actor and expires_at>now();
 return jsonb_build_object('enabled',enabled,'generated',coalesce(trial.generations,0)>0,'edited',coalesce(trial.revisions,0)>0,'plan',trial.plan,'messages',trial.messages);
end; $$;
revoke all on function public.ramble_growth_admit(text,text,text,boolean,text,uuid) from public;
revoke all on function public.ramble_growth_finish(text,uuid,jsonb,jsonb) from public;
revoke all on function public.ramble_growth_status(text,text) from public;
grant execute on function public.ramble_growth_admit(text,text,text,boolean,text,uuid),public.ramble_growth_finish(text,uuid,jsonb,jsonb),public.ramble_growth_status(text,text) to anon,authenticated;

-- The outer request can invoke classification, research, repair and photo models.
-- Count every attempted provider call as well, including models inside map lookups.
create table if not exists ramble_growth.model_calls (
 id bigint generated always as identity primary key,
 request_id uuid not null references ramble_growth.requests(id) on delete cascade,
 created_at timestamptz not null default now()
);
create index if not exists ramble_growth_model_created on ramble_growth.model_calls(created_at);
alter table ramble_growth.model_calls enable row level security;
revoke all on ramble_growth.model_calls from public,anon,authenticated;
create or replace function public.ramble_growth_model_admit(p_secret text,p_request uuid)
returns text language plpgsql security definer set search_path='' as $$
declare cfg ramble_growth.settings;
begin
 if not ramble_growth.authorized(p_secret) then raise exception 'Unauthorized'; end if;
 select * into cfg from ramble_growth.settings where key='gateway' for update;
 if not cfg.enabled then return 'disabled'; end if;
 if not exists(select 1 from ramble_growth.requests where id=p_request and status='pending' and lease_until>now()) then return 'expired'; end if;
 if (select count(*) from ramble_growth.model_calls where created_at>=date_trunc('day',now() at time zone 'UTC') at time zone 'UTC')>=cfg.ai_daily_limit then return 'daily_limit'; end if;
 insert into ramble_growth.model_calls(request_id) values(p_request);
 return 'admitted';
end; $$;
revoke all on function public.ramble_growth_model_admit(text,uuid) from public;
grant execute on function public.ramble_growth_model_admit(text,uuid) to anon,authenticated;
