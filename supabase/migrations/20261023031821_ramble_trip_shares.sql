-- Fixed public snapshots. No anon SELECT on either private trips or share rows.
begin;
create or replace function public.ramble_share_text(value text, private_terms text[])
returns text language plpgsql immutable security invoker set search_path='' as $$
declare term text;
begin
  if value is null or btrim(value)='' then return null; end if;
  -- Do not publish contact information, URLs, addresses or booking/hotel prose.
  if value ~* '(@|https?://|www\.|[0-9]{7,}|[0-9]+[[:space:]]+[^,]+(street|road|lane|avenue)|hotel|booking|passport|酒店|旅馆|护照|订单|预订号)' then return null; end if;
  foreach term in array private_terms loop
    if length(term)>2 and position(lower(term) in lower(value))>0 then return null; end if;
  end loop;
  return left(value,1000);
end $$;
revoke all on function public.ramble_share_text(text,text[]) from public,anon;
grant execute on function public.ramble_share_text(text,text[]) to authenticated;

-- Public uncertainty is a fixed summary, never raw warning prose: warnings
-- can contain personalized requests, reservation notes or hotel aliases.
create or replace function public.ramble_share_warnings(warnings jsonb)
returns jsonb language plpgsql immutable security invoker set search_path='' as $$
declare warning text; category text; result jsonb:='[]';
begin
 if jsonb_typeof(warnings) is distinct from 'array' then return result;end if;
 for warning in select jsonb_array_elements_text(warnings) loop
  category:=case
   when warning ~* '(overlap|conflict|runs past|buffer|suggested start|冲突|超过|缓冲|开始时间调整)' then 'Timing or fixed reservations may conflict; review the private itinerary before travel.'
   when warning ~* '(opening|hours|closed|closure|开放|闭馆)' then 'Opening hours or closure restrictions require attention; check current official information.'
   when warning ~* '(reservation|booking|admission|entrance|预约|入场|门票|票务)' then 'Reservations or admission requirements need confirmation; do not rely on this snapshot for entry.'
   when warning ~* '(location|place search|unmatched|地图位置|地点查询|位置待确认)' then 'Some map locations are unconfirmed or could not be checked.'
   when warning ~* '(weather|forecast|天气|预报)' then 'Weather conditions are unverified or unavailable; check again before travel.'
   when warning ~* '(route|transport|travel time|service|transit|路线|交通|车次|行车|时刻)' then 'Transport routes, schedules or travel times are unverified or need attention.'
   when warning ~* '(research|citation|source|资料|引用|来源)' then 'Some travel research or sources could not be verified.'
   else 'An additional saved itinerary warning needs review in the private plan.'
  end;
  if not result @> jsonb_build_array(category) then result:=result||jsonb_build_array(category);end if;
 end loop;
 return result;
end $$;
revoke all on function public.ramble_share_warnings(jsonb) from public,anon;
grant execute on function public.ramble_share_warnings(jsonb) to authenticated;

create or replace function public.ramble_sanitize_shared_snapshot(input jsonb, identity_terms text[] default array[]::text[])
returns jsonb language plpgsql immutable security invoker set search_path='' as $$
declare plan jsonb:=input->'plan'; day jsonb; stop jsonb;
  private_terms text[]:=coalesce(identity_terms,array[]::text[]); days jsonb:='[]'; stops jsonb; checks jsonb; day_checks jsonb;
  city text; stop_name text; duration numeric; entry jsonb;
begin
  if jsonb_typeof(plan->'days') is distinct from 'array' or jsonb_array_length(plan->'days') not between 1 and 10 then return null; end if;
  for day in select value from jsonb_array_elements(plan->'days') loop
    private_terms:=private_terms||array[day->>'hotel',day->'hotelPlace'->>'address'];
    if jsonb_typeof(day->'stops')='array' then
      for stop in select value from jsonb_array_elements(day->'stops') loop
        private_terms:=private_terms||array[stop->>'bookingNote',stop->'place'->>'address'];
      end loop;
    end if;
  end loop;
  checks:=jsonb_build_array('Snapshot only: venue hours, reservations and transport remain unverified; check current official information before travel.');
  checks:=checks||public.ramble_share_warnings(plan->'checks');
  for day in select value from jsonb_array_elements(plan->'days') loop
    city:=public.ramble_share_text(day->>'city',private_terms);if city is null then return null;end if;
    stops:='[]';day_checks:='[]';
    day_checks:=public.ramble_share_warnings(day->'checks');
    if jsonb_typeof(day->'stops')='array' then
      for stop in select value from jsonb_array_elements(day->'stops') limit 30 loop
        stop_name:=public.ramble_share_text(stop->>'name',private_terms);
        if stop_name is null then continue;end if;
        duration:=case when jsonb_typeof(stop->'durationMinutes')='number' then (stop->>'durationMinutes')::numeric else null end;
        if duration is null or duration<0 or duration>1440 then return null;end if;
        entry:=jsonb_build_object('name',left(stop_name,240),'durationMinutes',duration,'uncertainty',jsonb_build_array('Venue location, opening hours and admission are unverified in this saved snapshot.'));
        stops:=stops||jsonb_build_array(entry);
      end loop;
    end if;
    entry:=jsonb_build_object('city',left(city,160),'stops',stops,'uncertainty',day_checks);
    if day->>'date' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then entry:=entry||jsonb_build_object('date',day->>'date');end if;
    days:=days||jsonb_build_array(entry);
  end loop;
  return jsonb_build_object('schemaVersion',1,'days',days,'uncertainty',checks);
end $$;
revoke all on function public.ramble_sanitize_shared_snapshot(jsonb,text[]) from public,anon;
grant execute on function public.ramble_sanitize_shared_snapshot(jsonb,text[]) to authenticated;

-- Profile identity is excluded even when it appears inside itinerary prose.
create or replace function public.ramble_share_identity_terms()
returns text[] language sql stable security invoker set search_path='' as $$
 select array[(select p.full_name from public.ramble_profiles p where p.id=(select auth.uid())),nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'email'];
$$;
revoke all on function public.ramble_share_identity_terms() from public,anon;
grant execute on function public.ramble_share_identity_terms() to authenticated;

create table if not exists public.ramble_trip_shares(
 trip_id uuid primary key references public.ramble_trips(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 token_hash text not null unique check(token_hash ~ '^[0-9a-f]{64}$'),
 snapshot jsonb not null default '{}'::jsonb check(jsonb_typeof(snapshot)='object' and octet_length(snapshot::text)<=240000),
 published_at timestamptz not null default now()
);
alter table public.ramble_trip_shares enable row level security;
revoke all on public.ramble_trip_shares from public,anon,authenticated;
grant select,delete on public.ramble_trip_shares to authenticated;
-- No caller can write the snapshot or publication date; the trigger reads an owned saved trip.
grant insert(trip_id,user_id,token_hash),update(trip_id,user_id,token_hash) on public.ramble_trip_shares to authenticated;
create or replace function public.ramble_publish_trip_share()
returns trigger language plpgsql security invoker set search_path='' as $$
declare saved jsonb;
begin
 if new.user_id is distinct from (select auth.uid()) then raise exception 'Trip not found' using errcode='42501';end if;
 select t.snapshot into saved from public.ramble_trips t where t.id=new.trip_id and t.user_id=(select auth.uid());
 if saved is null then raise exception 'Trip not found' using errcode='42501';end if;
 new.snapshot:=public.ramble_sanitize_shared_snapshot(saved,public.ramble_share_identity_terms());
 if new.snapshot is null then raise exception 'No publishable itinerary' using errcode='22023';end if;
 new.published_at:=clock_timestamp();return new;
end $$;
revoke all on function public.ramble_publish_trip_share() from public,anon,authenticated;
drop trigger if exists ramble_publish_trip_share on public.ramble_trip_shares;
create trigger ramble_publish_trip_share before insert or update on public.ramble_trip_shares for each row execute function public.ramble_publish_trip_share();
drop policy if exists ramble_share_owner on public.ramble_trip_shares;
create policy ramble_share_owner on public.ramble_trip_shares for all to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id and exists(select 1 from public.ramble_trips t where t.id=trip_id and t.user_id=(select auth.uid())));

create or replace function public.ramble_share_preview(requested_trip uuid)
returns jsonb language sql stable security invoker set search_path='' as $$
 select public.ramble_sanitize_shared_snapshot(t.snapshot,public.ramble_share_identity_terms()) from public.ramble_trips t where t.id=requested_trip and t.user_id=(select auth.uid());
$$;
revoke all on function public.ramble_share_preview(uuid) from public,anon;
grant execute on function public.ramble_share_preview(uuid) to authenticated;

-- Intentional capability boundary: the only anonymous entry point. It returns
-- a generated whitelist snapshot and date, never row IDs, hashes or user data.
create or replace function public.ramble_read_trip_share(capability text)
returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('snapshot',s.snapshot,'publishedAt',s.published_at)
 from public.ramble_trip_shares s
 where capability ~ '^[A-Za-z0-9_-]{43}$'
 and s.token_hash=encode(sha256(convert_to(capability,'UTF8')),'hex');
$$;
revoke all on function public.ramble_read_trip_share(text) from public,anon,authenticated;
grant execute on function public.ramble_read_trip_share(text) to anon,authenticated;
commit;
