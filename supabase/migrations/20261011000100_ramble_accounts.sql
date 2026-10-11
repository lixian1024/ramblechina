-- Ramble China uses separate tables from travelagent in this Supabase project.
begin;
create table if not exists public.ramble_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '' check (char_length(full_name) <= 100),
  country text not null default '' check (char_length(country) <= 100),
  preferred_language text not null default 'English' check (char_length(preferred_language) between 1 and 80),
  updated_at timestamptz not null default now()
);
create table if not exists public.ramble_trips (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 240),
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object' and octet_length(snapshot::text) <= 240000),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ramble_trips_owner_updated on public.ramble_trips(user_id, updated_at desc);
create table if not exists public.ramble_guide_requests (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  request jsonb not null check (jsonb_typeof(request) = 'object' and octet_length(request::text) <= 16000),
  reference text generated always as ('RG-' || id::text) stored,
  status text not null default 'new' check (status in ('new','reviewing','contacted','closed')),
  created_at timestamptz not null default now()
);
create index if not exists ramble_guides_owner_created on public.ramble_guide_requests(user_id, created_at desc);
alter table public.ramble_profiles enable row level security;
alter table public.ramble_trips enable row level security;
alter table public.ramble_guide_requests enable row level security;
revoke all on public.ramble_profiles, public.ramble_trips, public.ramble_guide_requests from anon, authenticated;
grant select, insert, update on public.ramble_profiles, public.ramble_trips to authenticated;
grant select on public.ramble_guide_requests to authenticated;
-- Clients cannot set a reviewed status or change a submitted request.
grant insert (id, user_id, request) on public.ramble_guide_requests to authenticated;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='ramble_profiles' and policyname='ramble_profile_owner') then
    create policy ramble_profile_owner on public.ramble_profiles for all to authenticated using ((select auth.uid())=id) with check ((select auth.uid())=id);
    create policy ramble_trip_owner on public.ramble_trips for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
    create policy ramble_guide_read on public.ramble_guide_requests for select to authenticated using ((select auth.uid())=user_id);
    create policy ramble_guide_submit on public.ramble_guide_requests for insert to authenticated with check ((select auth.uid())=user_id and status='new');
  end if;
end $$;
commit;
