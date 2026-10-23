-- Depends on ramble_growth.authorized from the growth gateway foundation.
-- Applicant details are private: no client reads, no guide-admin dashboard policy.
create table if not exists ramble_growth.research_requests (
  id uuid primary key,
  ip_hash text not null check (ip_hash ~ '^[a-f0-9]{64}$'),
  request jsonb not null check (jsonb_typeof(request)='object'),
  created_at timestamptz not null default now()
);
create index if not exists ramble_research_requests_ip_day on ramble_growth.research_requests(ip_hash,created_at);
alter table ramble_growth.research_requests enable row level security;
revoke all on ramble_growth.research_requests from public,anon,authenticated;

-- A secret-gated bridge is necessary for unauthenticated form submissions.
-- The server alone possesses the gateway secret; the private table is never exposed.
create or replace function public.ramble_submit_research_request(
  p_secret text,p_request_id uuid,p_ip_hash text,p_request jsonb
) returns jsonb language plpgsql security definer set search_path='' as $$
declare existing ramble_growth.research_requests;
  start_at timestamptz:=date_trunc('day',now() at time zone 'UTC') at time zone 'UTC';
begin
  if not ramble_growth.authorized(p_secret) then raise exception 'Unauthorized'; end if;
  if p_request_id is null or p_ip_hash is null or p_ip_hash !~ '^[a-f0-9]{64}$'
    or p_request is null or jsonb_typeof(p_request)<>'object' or octet_length(p_request::text)>12000 then
    raise exception 'Invalid request';
  end if;
  if (p_request->'consent') is distinct from 'true'::jsonb
    or coalesce(p_request->>'language','') not in ('en','zh')
    or coalesce(p_request->>'email','') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or length(p_request->>'email')>254
    or coalesce(length(trim(p_request->>'destination')),0) not between 1 and 200
    or coalesce(length(trim(p_request->>'question')),0) not between 1 and 2000
    or coalesce(length(p_request->>'travelWindow'),0)>200
    or exists(select 1 from jsonb_object_keys(p_request) k where k not in ('email','destination','travelWindow','question','language','consent'))
    or exists(select 1 from jsonb_each(p_request) where key<>'consent' and jsonb_typeof(value)<>'string') then
    raise exception 'Invalid request';
  end if;
  -- Lock retry identity first, then IP; independent requests share an atomic daily cap.
  perform pg_advisory_xact_lock(hashtextextended('research:id:'||p_request_id::text,0));
  select * into existing from ramble_growth.research_requests where id=p_request_id;
  if found then
    return jsonb_build_object('status',case when existing.ip_hash=p_ip_hash and existing.request=p_request then 'duplicate' else 'conflict' end,'requestId',p_request_id);
  end if;
  perform pg_advisory_xact_lock(hashtextextended('research:ip:'||p_ip_hash,0));
  if (select count(*) from ramble_growth.research_requests where ip_hash=p_ip_hash and created_at>=start_at)>=3 then
    return jsonb_build_object('status','rate_limited','requestId',p_request_id);
  end if;
  insert into ramble_growth.research_requests(id,ip_hash,request) values(p_request_id,p_ip_hash,p_request);
  return jsonb_build_object('status','created','requestId',p_request_id);
end;
$$;
revoke all on function public.ramble_submit_research_request(text,uuid,text,jsonb) from public;
grant execute on function public.ramble_submit_research_request(text,uuid,text,jsonb) to anon,authenticated;
