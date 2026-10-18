-- Public API functions (called from the app with supabase.rpc).
--
-- These are the only way one user learns anything about another. Each runs as
-- SECURITY DEFINER, identifies the caller with auth.uid(), and returns only
-- what the privacy rules allow:
--   * before a match: an opaque id, gender, age, distance bucket, active flag
--   * after a match:  first name and photo path, to the two members only
--
-- Errors raised for the app to translate:
--   not_eligible      caller is not a verified adult (or is banned)
--   not_available     target can't be requested (deliberately vague: covers
--                     blocked, paused, out of range, unverified, unknown id)
--   already_requested caller already asked this person in the last 7 days
--   daily_limit       10 requests in the last 24 hours
--   not_found         request/match doesn't exist for this caller
--   too_soon          location was updated less than a minute ago
--   invalid_input     bad arguments

create function private.require_eligible() returns uuid
language plpgsql stable security definer set search_path = '' as $$
declare
  v_me uuid := auth.uid();
begin
  if v_me is null or not private.is_eligible(v_me) then
    raise exception 'not_eligible' using errcode = '42501';
  end if;
  return v_me;
end;
$$;

-- ---------------------------------------------------------------------------
-- location
-- ---------------------------------------------------------------------------

-- Stores the caller's position snapped to a ~500 m grid. Limited to one update
-- a minute so the distance buckets can't be probed by hopping around.
create function public.set_location(p_lat double precision, p_lng double precision) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := auth.uid();
begin
  if v_me is null then
    raise exception 'not_eligible' using errcode = '42501';
  end if;
  if p_lat is null or p_lng is null or p_lat not between -90 and 90 or p_lng not between -180 and 180 then
    raise exception 'invalid_input';
  end if;
  if exists (
    select 1 from public.profiles p
    where p.id = v_me and p.location_updated_at > now() - interval '1 minute'
  ) then
    raise exception 'too_soon';
  end if;
  update public.profiles
  set location = private.snap(p_lat, p_lng), location_updated_at = now(), last_active_at = now()
  where id = v_me;
end;
$$;

-- ---------------------------------------------------------------------------
-- nearby
-- ---------------------------------------------------------------------------

-- Anonymous cards for the Nearby screen. `p_bucket` optionally filters to one
-- distance label. Ordering never uses the exact distance inside a bucket.
create function public.nearby(p_bucket text default null)
returns table (id uuid, gender public.gender, age int, distance_bucket text, active boolean)
language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := private.require_eligible();
begin
  update public.profiles p set last_active_at = now() where p.id = v_me;

  return query
  select c.public_id, c.gender, c.age, private.bucket(c.dist_m), c.active
  from private.candidates(v_me) c
  where (p_bucket is null or private.bucket(c.dist_m) = p_bucket)
    -- already matched
    and not exists (
      select 1 from public.matches m
      where m.unmatched_at is null
        and m.user_a = least(v_me, c.profile_id) and m.user_b = greatest(v_me, c.profile_id)
    )
    -- already asked in the last 7 days (answered or not: identical either way)
    and not exists (
      select 1 from public.requests r
      where r.from_id = v_me and r.to_id = c.profile_id and r.created_at > now() - interval '7 days'
    )
  order by
    case private.bucket(c.dist_m) when 'Under 2 km' then 1 when '2–5 km' then 2 when '5–10 km' then 3 else 4 end,
    c.active desc,
    md5(c.public_id::text || current_date::text)
  limit 60;
end;
$$;

-- ---------------------------------------------------------------------------
-- requests
-- ---------------------------------------------------------------------------

create function public.requests_left() returns int
language sql stable security definer set search_path = '' as $$
  select greatest(
    0,
    10 - (
      select count(*)::int from public.requests r
      where r.from_id = (select auth.uid()) and r.created_at > now() - interval '24 hours'
    )
  );
$$;

-- Sends a request to someone from Nearby (`p_target` is the opaque id).
-- If that person has already asked the caller, it's mutual and becomes a match.
-- Returns {"status": "sent" | "matched", "match_id": uuid | null, "requests_left": n}.
create function public.send_request(p_target uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := private.require_eligible();
  v_target uuid;
  v_reverse uuid;
  v_match uuid;
begin
  -- One request at a time per sender, so the daily limit can't be raced.
  perform pg_advisory_xact_lock(hashtextextended(v_me::text, 0));

  -- Same rules as Nearby: preferences, age ranges, visibility, blocks, verification.
  select c.profile_id into v_target from private.candidates(v_me) c where c.public_id = p_target;
  if v_target is null then
    raise exception 'not_available';
  end if;

  if exists (
    select 1 from public.matches m
    where m.unmatched_at is null
      and m.user_a = least(v_me, v_target) and m.user_b = greatest(v_me, v_target)
  ) then
    raise exception 'not_available';
  end if;

  -- Clear any overdue request between the two that the scheduler hasn't reached yet.
  update public.requests r
  set status = 'expired'
  where r.status = 'pending' and r.expires_at <= now()
    and least(r.from_id, r.to_id) = least(v_me, v_target)
    and greatest(r.from_id, r.to_id) = greatest(v_me, v_target);

  -- They already asked me: both said yes.
  select r.id into v_reverse
  from public.requests r
  where r.from_id = v_target and r.to_id = v_me and r.status = 'pending'
  for update;
  if v_reverse is not null then
    v_match := private.create_match(v_reverse);
    return jsonb_build_object('status', 'matched', 'match_id', v_match, 'requests_left', public.requests_left());
  end if;

  if exists (
    select 1 from public.requests r
    where r.from_id = v_me and r.to_id = v_target and r.created_at > now() - interval '7 days'
  ) then
    raise exception 'already_requested';
  end if;

  if (
    select count(*) from public.requests r
    where r.from_id = v_me and r.created_at > now() - interval '24 hours'
  ) >= 10 then
    raise exception 'daily_limit';
  end if;

  begin
    insert into public.requests (from_id, to_id) values (v_me, v_target);
  exception when unique_violation then
    raise exception 'not_available';
  end;

  return jsonb_build_object('status', 'sent', 'match_id', null, 'requests_left', public.requests_left());
end;
$$;

-- Requests waiting for the caller's answer. Ignored, expired and blocked ones are gone.
create function public.incoming_requests()
returns table (request_id uuid, sender_id uuid, gender public.gender, age int, distance_bucket text, expires_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select
    r.id,
    s.public_id,
    s.gender,
    private.age_of(s.birth_date),
    private.bucket(extensions.st_distance(s.location, me.location)),
    r.expires_at
  from public.requests r
  join public.profiles me on me.id = r.to_id
  join public.profiles s on s.id = r.from_id
  where r.to_id = (select auth.uid())
    and private.is_eligible(me.id)
    and r.status = 'pending'
    and r.expires_at > now()
    and r.ignored_at is null
    and private.is_eligible(s.id)
    and not private.is_blocked(me.id, s.id)
  order by r.expires_at;
$$;

-- Requests the caller has sent that are still inside their 24 hours.
-- Rule 7: this reads nothing that changes when the receiver ignores (or blocks,
-- or is banned) — every unanswered request looks the same until it expires.
create function public.sent_requests()
returns table (request_id uuid, gender public.gender, age int, distance_bucket text, expires_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select
    r.id,
    t.gender,
    private.age_of(t.birth_date),
    private.bucket(extensions.st_distance(t.location, me.location)),
    r.expires_at
  from public.requests r
  join public.profiles me on me.id = r.from_id
  join public.profiles t on t.id = r.to_id
  where r.from_id = (select auth.uid())
    and r.status = 'pending'
    and r.expires_at > now()
    -- hidden only by the caller's own block
    and not exists (select 1 from public.blocks b where b.blocker_id = me.id and b.blocked_id = t.id)
  order by r.expires_at;
$$;

-- Accept → creates the match and returns its id. Ignore → hides the request
-- from the caller's inbox and returns null; the sender is told nothing.
create function public.respond_request(p_request uuid, p_accept boolean) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := private.require_eligible();
  r public.requests;
begin
  select * into r
  from public.requests q
  where q.id = p_request and q.to_id = v_me
    and q.status = 'pending' and q.expires_at > now() and q.ignored_at is null
  for update;
  if not found or private.is_blocked(v_me, r.from_id) or not private.is_eligible(r.from_id) then
    raise exception 'not_found';
  end if;

  if p_accept then
    return private.create_match(r.id);
  end if;

  update public.requests set ignored_at = now() where id = r.id;
  return null;
end;
$$;

-- ---------------------------------------------------------------------------
-- matches and chat
-- ---------------------------------------------------------------------------

-- The caller's active matches, for the Chats list.
create function public.my_matches()
returns table (
  match_id uuid,
  person_id uuid,
  first_name text,
  age int,
  distance_bucket text,
  matched_at timestamptz,
  last_message text,
  last_message_at timestamptz,
  unread_count int
)
language sql stable security definer set search_path = '' as $$
  select
    m.id,
    o.public_id,
    o.first_name,
    private.age_of(o.birth_date),
    private.bucket(extensions.st_distance(o.location, me.location)),
    m.created_at,
    lm.body,
    lm.created_at,
    (
      select count(*)::int from public.messages x
      where x.match_id = m.id and x.sender_id <> me.id and x.read_at is null
    )
  from public.matches m
  join public.profiles me on me.id = (select auth.uid())
  join public.profiles o on o.id = case when m.user_a = me.id then m.user_b else m.user_a end
  left join lateral (
    select x.body, x.created_at from public.messages x
    where x.match_id = m.id order by x.created_at desc limit 1
  ) lm on true
  where me.id in (m.user_a, m.user_b)
    and m.unmatched_at is null
    and not o.is_banned
    and not private.is_blocked(m.user_a, m.user_b)
  order by coalesce(lm.created_at, m.created_at) desc;
$$;

-- Rule 1: the first name and photo of the other person, only for the two
-- members of an active match. The app turns photo_path into a short-lived
-- signed URL; storage policies allow that only for the owner or a match.
create function public.match_profile(p_match uuid)
returns table (person_id uuid, first_name text, age int, photo_path text, distance_bucket text, matched_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select
    o.public_id,
    o.first_name,
    private.age_of(o.birth_date),
    o.photo_path,
    private.bucket(extensions.st_distance(o.location, me.location)),
    m.created_at
  from public.matches m
  join public.profiles me on me.id = (select auth.uid())
  join public.profiles o on o.id = case when m.user_a = me.id then m.user_b else m.user_a end
  where m.id = p_match
    and private.is_active_member(m.id);
$$;

create function public.mark_read(p_match uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_active_member(p_match) then
    raise exception 'not_found';
  end if;
  update public.messages
  set read_at = now()
  where match_id = p_match and sender_id <> auth.uid() and read_at is null;
end;
$$;

create function public.unmatch(p_match uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.matches m
  set unmatched_at = now()
  where m.id = p_match and m.unmatched_at is null and auth.uid() in (m.user_a, m.user_b);
  if not found then
    raise exception 'not_found';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- block and report (`p_target` is the opaque id from nearby/requests/matches)
-- ---------------------------------------------------------------------------

create function private.resolve_public_id(p_public uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select p.id from public.profiles p where p.public_id = p_public;
$$;

-- Rule 6: after this the two people never see each other again — Nearby,
-- requests, matches and chat all filter on blocks in both directions.
create function public.block_user(p_target uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := auth.uid();
  v_target uuid := private.resolve_public_id(p_target);
begin
  if v_me is null then
    raise exception 'not_eligible' using errcode = '42501';
  end if;
  -- Unknown ids succeed silently so this can't be used to test whether an id exists.
  if v_target is null or v_target = v_me then
    return;
  end if;
  insert into public.blocks (blocker_id, blocked_id) values (v_me, v_target) on conflict do nothing;
  update public.matches m
  set unmatched_at = now()
  where m.unmatched_at is null
    and m.user_a = least(v_me, v_target) and m.user_b = greatest(v_me, v_target);
end;
$$;

create function public.report_user(p_target uuid, p_reason public.report_reason, p_details text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := auth.uid();
  v_target uuid := private.resolve_public_id(p_target);
begin
  if v_me is null then
    raise exception 'not_eligible' using errcode = '42501';
  end if;
  if v_target is null or v_target = v_me then
    return;
  end if;
  insert into public.reports (reporter_id, reported_id, reason, details)
  values (v_me, v_target, p_reason, nullif(trim(p_details), ''));
end;
$$;

-- ---------------------------------------------------------------------------
-- verification (service role only — called by the verification Edge Function)
-- ---------------------------------------------------------------------------

-- Rule 3: records the outcome of an ID check and nothing else — the date of
-- birth, the method, and when. Under-18s get a birth date but no verified_at,
-- so they stay locked out.
create function public.set_verification(p_user uuid, p_birth_date date, p_method text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_adult boolean := private.age_of(p_birth_date) >= 18;
begin
  if p_birth_date is null or p_method is null then
    raise exception 'invalid_input';
  end if;
  update public.profiles
  set birth_date = p_birth_date,
      verification_method = p_method,
      verified_at = case when v_adult then now() else null end
  where id = p_user;
  if not found then
    raise exception 'not_found';
  end if;
  return v_adult;
end;
$$;

-- ---------------------------------------------------------------------------
-- permissions: nothing for anonymous visitors; signed-in users get the app
-- functions; only the service role may record a verification.
-- ---------------------------------------------------------------------------
revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function private.is_eligible(uuid) to authenticated;
grant execute on function private.is_active_member(uuid) to authenticated;
grant execute on function private.can_view_photo(text) to authenticated;

revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function
  public.set_location(double precision, double precision),
  public.nearby(text),
  public.requests_left(),
  public.send_request(uuid),
  public.incoming_requests(),
  public.sent_requests(),
  public.respond_request(uuid, boolean),
  public.my_matches(),
  public.match_profile(uuid),
  public.mark_read(uuid),
  public.unmatch(uuid),
  public.block_user(uuid),
  public.report_user(uuid, public.report_reason, text)
  to authenticated;
grant execute on function public.set_verification(uuid, date, text) to service_role;
