-- Read-only guide review. No service-role key or editable user metadata is used.
begin;
create schema if not exists ramble_private;
revoke all on schema ramble_private from public, anon, authenticated;
create table if not exists ramble_private.guide_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table ramble_private.guide_admins enable row level security;
revoke all on table ramble_private.guide_admins from public, anon, authenticated;

create or replace function public.ramble_is_guide_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from ramble_private.guide_admins a
    join auth.users u on u.id = a.user_id
    where a.user_id = (select auth.uid()) and u.email_confirmed_at is not null
  );
$$;
revoke all on function public.ramble_is_guide_admin() from public, anon, authenticated;
grant execute on function public.ramble_is_guide_admin() to authenticated;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public'
      and tablename='ramble_guide_requests' and policyname='ramble_guide_admin_read') then
    create policy ramble_guide_admin_read on public.ramble_guide_requests
      for select to authenticated using ((select public.ramble_is_guide_admin()));
  end if;
end $$;

-- User-approved initial administrator. Bind to a verified Auth UUID, not an email
-- claim supplied by a browser. Stop rather than silently grant to no/wrong user.
do $$
declare matched uuid; matches integer;
begin
  select count(*) into matches from auth.users
    where lower(email) = 'lisabob468@gmail.com' and email_confirmed_at is not null;
  if matches <> 1 then
    raise exception 'Expected exactly one verified lisabob468@gmail.com account. Sign in/verify it first, then rerun.';
  end if;
  select id into matched from auth.users
    where lower(email) = 'lisabob468@gmail.com' and email_confirmed_at is not null;
  insert into ramble_private.guide_admins(user_id) values (matched) on conflict do nothing;
end $$;
commit;
