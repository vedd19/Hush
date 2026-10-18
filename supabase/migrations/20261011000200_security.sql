-- Internal helper functions, Row Level Security and table permissions.

-- ---------------------------------------------------------------------------
-- helpers (schema private: not reachable through the API)
-- ---------------------------------------------------------------------------

create function private.age_of(p_birth_date date) returns int
language sql stable set search_path = '' as $$
  select extract(year from age(current_date, p_birth_date))::int;
$$;

-- Rule 4: only ID-verified adults who are not banned may browse, send or receive.
create function private.is_eligible(p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = p_user
      and p.verified_at is not null
      and p.birth_date is not null
      and private.age_of(p.birth_date) >= 18
      and not p.is_banned
  );
$$;

-- Rule 6: a block hides both people from each other, whoever placed it.
create function private.is_blocked(p_a uuid, p_b uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.blocks b
    where (b.blocker_id = p_a and b.blocked_id = p_b)
       or (b.blocker_id = p_b and b.blocked_id = p_a)
  );
$$;

-- Rule 2: distance leaves the database only as one of these labels.
create function private.bucket(p_metres double precision) returns text
language sql immutable set search_path = '' as $$
  select case
    when p_metres is null then null
    when p_metres < 2000 then 'Under 2 km'
    when p_metres < 5000 then '2–5 km'
    when p_metres < 10000 then '5–10 km'
    else '10+ km'
  end;
$$;

-- Rule 2: snap a position to a ~500 m grid (0.005 degrees) before storing it.
create function private.snap(p_lat double precision, p_lng double precision) returns extensions.geography
language sql immutable set search_path = '' as $$
  select extensions.st_setsrid(
    extensions.st_makepoint(round(p_lng / 0.005) * 0.005, round(p_lat / 0.005) * 0.005),
    4326
  )::extensions.geography;
$$;

-- True when the caller belongs to this match, it is still active, and neither
-- side has blocked the other. Used by the messages policies and chat functions.
create function private.is_active_member(p_match uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.matches m
    where m.id = p_match
      and m.unmatched_at is null
      and (select auth.uid()) in (m.user_a, m.user_b)
      and not private.is_blocked(m.user_a, m.user_b)
  );
$$;

-- Rule 5: a photo may be read by its owner or by someone actively matched with them.
-- `p_owner` is the first folder of the storage path (the owner's user id).
create function private.can_view_photo(p_owner text) returns boolean
language sql stable security definer set search_path = '' as $$
  select p_owner = (select auth.uid())::text
    or exists (
      select 1
      from public.matches m
      where m.unmatched_at is null
        and (
          (m.user_a = (select auth.uid()) and m.user_b::text = p_owner)
          or (m.user_b = (select auth.uid()) and m.user_a::text = p_owner)
        )
        and not private.is_blocked(m.user_a, m.user_b)
    );
$$;

-- Everyone `p_me` is allowed to see in Nearby / send a request to, with the
-- exact distance. NEVER expose this directly: callers must convert dist_m to a
-- bucket and return public_id, not profile_id.
create function private.candidates(p_me uuid)
returns table (profile_id uuid, public_id uuid, gender public.gender, age int, dist_m double precision, active boolean)
language sql stable security definer set search_path = '' as $$
  select
    c.id,
    c.public_id,
    c.gender,
    private.age_of(c.birth_date),
    extensions.st_distance(c.location, me.location),
    c.last_active_at > now() - interval '15 minutes'
  from public.profiles me
  join public.profiles c on c.id <> me.id
  where me.id = p_me
    and me.location is not null
    and c.location is not null
    -- both sides verified adults, not banned
    and me.verified_at is not null and not me.is_banned and private.age_of(me.birth_date) >= 18
    and c.verified_at is not null and not c.is_banned and private.age_of(c.birth_date) >= 18
    -- gender preferences must fit in both directions
    and c.gender = any (me.interested_in)
    and me.gender = any (c.interested_in)
    -- age ranges must fit in both directions (60 means "60 and over")
    and private.age_of(c.birth_date) >= me.age_min
    and (me.age_max >= 60 or private.age_of(c.birth_date) <= me.age_max)
    and private.age_of(me.birth_date) >= c.age_min
    and (c.age_max >= 60 or private.age_of(me.birth_date) <= c.age_max)
    -- the other person's "who can send me requests" setting
    and c.request_visibility <> 'paused'
    and (c.request_visibility = 'anyone' or extensions.st_distance(c.location, me.location) < 5000)
    and extensions.st_dwithin(c.location, me.location, 50000)
    and not private.is_blocked(me.id, c.id);
$$;

-- Marks overdue requests as expired. Run every few minutes by pg_cron; every
-- function also checks expires_at itself, so nothing relies on the schedule.
create function private.expire_requests() returns int
language sql security definer set search_path = '' as $$
  with done as (
    update public.requests
    set status = 'expired'
    where status = 'pending' and expires_at <= now()
    returning 1
  )
  select count(*)::int from done;
$$;

-- Turns a pending request into a match. Callers have already checked permissions.
create function private.create_match(p_request uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  r public.requests;
  v_match uuid;
begin
  update public.requests set status = 'accepted' where id = p_request and status = 'pending' returning * into r;
  if not found then
    raise exception 'not_found';
  end if;
  insert into public.matches (user_a, user_b)
  values (least(r.from_id, r.to_id), greatest(r.from_id, r.to_id))
  returning id into v_match;
  return v_match;
end;
$$;

-- Lock down the helpers: only the three that RLS policies call are executable
-- by signed-in users. private.candidates (exact distances) is not.
revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function private.is_eligible(uuid) to authenticated;
grant execute on function private.is_active_member(uuid) to authenticated;
grant execute on function private.can_view_photo(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.requests enable row level security;
alter table public.matches enable row level security;
alter table public.messages enable row level security;
alter table public.blocks enable row level security;
alter table public.reports enable row level security;
alter table public.trusted_contacts enable row level security;
alter table public.check_ins enable row level security;

-- Start from nothing, then grant back the minimum.
revoke all on public.profiles, public.requests, public.matches, public.messages, public.blocks,
  public.reports, public.trusted_contacts, public.check_ins
  from anon, authenticated;

-- profiles: read your own row; edit only the fields a user may choose.
-- Not editable by users: verification, birth date, ban flag, location (use set_location), public_id.
grant select on public.profiles to authenticated;
grant update (first_name, photo_path, gender, interested_in, request_visibility, age_min, age_max)
  on public.profiles to authenticated;
create policy "profiles: read own" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "profiles: update own" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- messages: readable (also over Realtime) and writable only inside an active,
-- unblocked match. sender_id, created_at and read_at cannot be set by the client.
grant select on public.messages to authenticated;
grant insert (match_id, body) on public.messages to authenticated;
create policy "messages: members read" on public.messages
  for select to authenticated using (private.is_active_member(match_id));
create policy "messages: members send" on public.messages
  for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and private.is_active_member(match_id)
    and private.is_eligible((select auth.uid()))
  );

-- trusted contact and check-ins: private to their owner.
grant select, insert, update, delete on public.trusted_contacts to authenticated;
create policy "trusted_contacts: own" on public.trusted_contacts
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

grant select, insert, update, delete on public.check_ins to authenticated;
create policy "check_ins: own" on public.check_ins
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and private.is_active_member(match_id));

-- requests, matches, blocks, reports: no direct access at all. RLS is on with
-- no policies, and no privileges are granted; only the functions touch them.

-- Live chat: deliver new messages over Realtime (still filtered by the policy above).
alter publication supabase_realtime add table public.messages;
