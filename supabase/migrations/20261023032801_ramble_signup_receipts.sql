-- Verified accounts created from the growth experiment's launch day onward.
-- UTC cutoff is explicit: preexisting accounts must never become signup conversions.
create table if not exists ramble_growth.signup_receipts (
 user_id uuid primary key references auth.users(id) on delete cascade,
 emitted_at timestamptz not null default now()
);
alter table ramble_growth.signup_receipts enable row level security;
revoke all on ramble_growth.signup_receipts from public,anon,authenticated;

-- The trusted API obtains p_user from accountSession(), never the request body.
create or replace function public.ramble_claim_signup(p_secret text,p_user uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare inserted integer;
begin
 if not ramble_growth.authorized(p_secret) then raise exception 'Unauthorized'; end if;
 if not exists(select 1 from auth.users where id=p_user
   and created_at>='2026-10-23T00:00:00Z'::timestamptz and email_confirmed_at is not null) then return false; end if;
 insert into ramble_growth.signup_receipts(user_id) values(p_user) on conflict do nothing;
 get diagnostics inserted = row_count;
 return inserted=1;
end;
$$;
revoke all on function public.ramble_claim_signup(text,uuid) from public;
grant execute on function public.ramble_claim_signup(text,uuid) to anon,authenticated;
