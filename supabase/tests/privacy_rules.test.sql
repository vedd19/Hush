-- Proves the non-negotiable privacy and safety rules from CLAUDE.md.
-- Run with: npx supabase test db
--
-- Everything runs in one transaction that is rolled back, so no data is left
-- behind. Each check runs "as" a particular signed-in user through
-- tests.run_as(), which switches to the same database role the app uses.

begin;
create extension if not exists pgtap with schema extensions;
select plan(65);

create schema tests;
grant usage on schema tests to authenticated, anon;

-- Runs a query as a signed-in user (or as an anonymous visitor when p_user is
-- null) and returns its rows as JSON, or {"error": "..."} if it was refused.
create function tests.run_as(p_user uuid, p_query text) returns jsonb
language plpgsql as $$
declare
  v_result jsonb;
begin
  begin
    perform set_config('request.jwt.claims',
      case when p_user is null then '{"role":"anon"}'
           else json_build_object('sub', p_user, 'role', 'authenticated')::text end, true);
    execute format('set local role %I', case when p_user is null then 'anon' else 'authenticated' end);
    execute format('select coalesce(jsonb_agg(to_jsonb(t)), ''[]''::jsonb) from (%s) t', p_query) into v_result;
  exception when others then
    v_result := jsonb_build_object('error', sqlerrm);
  end;
  reset role;
  perform set_config('request.jwt.claims', '', true);
  return v_result;
end;
$$;

-- Same, for statements that change data (returns "ok" or the error).
create function tests.exec_as(p_user uuid, p_statement text) returns text
language plpgsql as $$
declare
  v_result text := 'ok';
begin
  begin
    perform set_config('request.jwt.claims',
      case when p_user is null then '{"role":"anon"}'
           else json_build_object('sub', p_user, 'role', 'authenticated')::text end, true);
    execute format('set local role %I', case when p_user is null then 'anon' else 'authenticated' end);
    execute p_statement;
  exception when others then
    v_result := sqlerrm;
  end;
  reset role;
  perform set_config('request.jwt.claims', '', true);
  return v_result;
end;
$$;

-- Creates a verified user at a position `p_km_east` kilometres east of a fixed point in Bengaluru.
create function tests.make_user(
  p_name text,
  p_gender public.gender,
  p_interested public.gender[],
  p_age int,
  p_km_east double precision,
  p_verified boolean default true
) returns uuid
language plpgsql as $$
declare
  v_id uuid := gen_random_uuid();
begin
  insert into auth.users (id, email) values (v_id, p_name || '@test.hush');
  update public.profiles
  set first_name = p_name,
      photo_path = v_id || '/me.jpg',
      gender = p_gender,
      interested_in = p_interested,
      birth_date = (current_date - make_interval(years => p_age, days => 30))::date,
      verified_at = case when p_verified then now() end,
      verification_method = case when p_verified then 'mock' end,
      -- 1 km east at latitude 12.97 is about 0.00922 degrees of longitude
      location = private.snap(12.97, 77.59 + p_km_east * 0.00922)
  where id = v_id;
  return v_id;
end;
$$;

create function tests.pub(p_user uuid) returns uuid language sql as $$
  select public_id from public.profiles where id = p_user;
$$;

-- Cast of characters ---------------------------------------------------------
create temp table u as
select
  tests.make_user('Aarav',  'man',   '{woman}', 27, 0)        as aarav,   -- the viewer
  tests.make_user('Riya',   'woman', '{man}',   24, 1)        as riya,    -- ~1 km
  tests.make_user('Meera',  'woman', '{man}',   26, 3)        as meera,   -- ~3 km
  tests.make_user('Zoya',   'woman', '{man}',   29, 7)        as zoya,    -- ~7 km
  tests.make_user('Ananya', 'woman', '{man}',   31, 15)       as ananya,  -- ~15 km
  tests.make_user('Kabir',  'man',   '{woman}', 30, 1)        as kabir,   -- another man nearby
  tests.make_user('Tara',   'woman', '{woman}', 25, 1)        as tara,    -- not interested in men
  tests.make_user('Nisha',  'woman', '{man}',   25, 1, false) as nisha,   -- not verified
  tests.make_user('Minor',  'woman', '{man}',   17, 1)        as minor,   -- under 18
  tests.make_user('Banned', 'woman', '{man}',   25, 1)        as banned;
update public.profiles set is_banned = true where id = (select banned from u);
grant select on u to authenticated, anon;

-- ===========================================================================
-- Rule 1 + 2: before a match, only gender / age / distance bucket are exposed
-- ===========================================================================

select is(
  tests.run_as((select aarav from u), 'select count(*) as n from public.profiles'),
  '[{"n": 1}]'::jsonb,
  'profiles: a user can read exactly one row — their own'
);

select is(
  tests.run_as((select aarav from u), format('select first_name from public.profiles where id = %L', (select riya from u))),
  '[]'::jsonb,
  'profiles: another user''s name is not readable directly'
);

select is(
  tests.run_as(null, 'select count(*) as n from public.profiles') ? 'error',
  true,
  'profiles: anonymous visitors are refused'
);

select is(
  (select array_agg(k order by k) from jsonb_object_keys(
    tests.run_as((select aarav from u), 'select * from public.nearby()') -> 0) k),
  array['active', 'age', 'distance_bucket', 'gender', 'id'],
  'nearby: returns only id, gender, age, distance bucket and active flag'
);

select is(
  tests.run_as((select aarav from u), 'select gender, age, distance_bucket from public.nearby() order by age'),
  '[{"gender":"woman","age":24,"distance_bucket":"Under 2 km"},
    {"gender":"woman","age":26,"distance_bucket":"2–5 km"},
    {"gender":"woman","age":29,"distance_bucket":"5–10 km"},
    {"gender":"woman","age":31,"distance_bucket":"10+ km"}]'::jsonb,
  'nearby: distance is a label per person, never a number'
);

select is(
  tests.run_as((select aarav from u), format(
    'select count(*) as n from public.nearby() where id in (%L, %L, %L, %L)',
    (select riya from u), (select meera from u), (select zoya from u), (select ananya from u))),
  '[{"n": 0}]'::jsonb,
  'nearby: the id is opaque — it is not the person''s account id'
);

select is(
  tests.run_as((select aarav from u), 'select age from public.nearby(''2–5 km'')'),
  '[{"age": 26}]'::jsonb,
  'nearby: the bucket filter works'
);

select is(
  tests.run_as((select aarav from u), format('select * from private.candidates(%L)', (select aarav from u))) ? 'error',
  true,
  'exact distances (private.candidates) cannot be called by users'
);

-- Location is snapped to the grid and can't be written directly.
select is(
  tests.exec_as((select kabir from u), 'select public.set_location(12.971599, 77.594566)'),
  'ok',
  'set_location: accepted'
);
select is(
  (select round(extensions.st_y(location::extensions.geometry)::numeric, 6) || ',' ||
          round(extensions.st_x(location::extensions.geometry)::numeric, 6)
   from public.profiles where id = (select kabir from u)),
  '12.970000,77.595000',
  'set_location: the stored position is snapped to the ~500 m grid, not the real one'
);
select is(
  tests.exec_as((select kabir from u), 'select public.set_location(12.98, 77.60)'),
  'too_soon',
  'set_location: a second update within a minute is refused'
);
select matches(
  tests.exec_as((select kabir from u), 'update public.profiles set location = null'),
  'permission denied',
  'profiles: location cannot be written directly'
);

-- ===========================================================================
-- Rule 4: under-18, unverified and banned users are locked out
-- ===========================================================================

select is(
  tests.run_as((select aarav from u), format(
    'select count(*) as n from public.nearby() where id in (%L, %L, %L)',
    tests.pub((select nisha from u)), tests.pub((select minor from u)), tests.pub((select banned from u)))),
  '[{"n": 0}]'::jsonb,
  'nearby: unverified, under-18 and banned people are never listed'
);
select is(
  tests.run_as((select nisha from u), 'select * from public.nearby()'),
  '{"error": "not_eligible"}'::jsonb,
  'nearby: an unverified user cannot browse'
);
select is(
  tests.run_as((select minor from u), 'select * from public.nearby()'),
  '{"error": "not_eligible"}'::jsonb,
  'nearby: an under-18 user cannot browse, even if marked verified'
);
select is(
  tests.run_as((select banned from u), 'select * from public.nearby()'),
  '{"error": "not_eligible"}'::jsonb,
  'nearby: a banned user cannot browse'
);
select is(
  tests.exec_as((select nisha from u), format('select public.send_request(%L)', tests.pub((select aarav from u)))),
  'not_eligible',
  'send_request: an unverified user cannot send'
);
select is(
  tests.exec_as((select aarav from u), format('select public.send_request(%L)', tests.pub((select nisha from u)))),
  'not_available',
  'send_request: an unverified user cannot receive'
);
select is(
  tests.exec_as((select aarav from u), format('select public.send_request(%L)', tests.pub((select minor from u)))),
  'not_available',
  'send_request: an under-18 user cannot receive'
);

-- Users cannot verify themselves or change protected fields.
select matches(
  tests.exec_as((select nisha from u), 'update public.profiles set verified_at = now()'),
  'permission denied',
  'profiles: a user cannot mark themselves verified'
);
select matches(
  tests.exec_as((select minor from u), 'update public.profiles set birth_date = ''1990-01-01'''),
  'permission denied',
  'profiles: a user cannot change their birth date'
);
select matches(
  tests.exec_as((select banned from u), 'update public.profiles set is_banned = false'),
  'permission denied',
  'profiles: a user cannot un-ban themselves'
);
select matches(
  tests.exec_as((select nisha from u), format('select public.set_verification(%L, ''1990-01-01'', ''fake'')', (select nisha from u))),
  'permission denied',
  'set_verification: only the server (service role) can record a verification'
);
select is(
  tests.exec_as((select aarav from u), 'update public.profiles set age_min = 21, age_max = 40'),
  'ok',
  'profiles: a user can change their own preferences'
);
update public.profiles set age_min = 18, age_max = 60 where id = (select aarav from u);

-- Verification outcome stores only birth date, method and time.
select is(public.set_verification((select nisha from u), '2012-05-05', 'mock'), false, 'set_verification: reports an under-18 result');
select is(
  (select verified_at is null and birth_date = '2012-05-05' from public.profiles where id = (select nisha from u)),
  true,
  'set_verification: an under-18 user is stored but not verified'
);

-- ===========================================================================
-- nearby respects preferences, age ranges and visibility
-- ===========================================================================

select is(
  tests.run_as((select aarav from u), format(
    'select count(*) as n from public.nearby() where id in (%L, %L)',
    tests.pub((select tara from u)), tests.pub((select kabir from u)))),
  '[{"n": 0}]'::jsonb,
  'nearby: gender preferences must fit both ways'
);

update public.profiles set age_min = 30 where id = (select riya from u);
select is(
  tests.run_as((select aarav from u), format('select count(*) as n from public.nearby() where id = %L', tests.pub((select riya from u)))),
  '[{"n": 0}]'::jsonb,
  'nearby: hidden when the viewer is outside the other person''s age range'
);
update public.profiles set age_min = 18 where id = (select riya from u);

update public.profiles set age_max = 25 where id = (select aarav from u);
select is(
  tests.run_as((select aarav from u), 'select age from public.nearby()'),
  '[{"age": 24}]'::jsonb,
  'nearby: the viewer''s own age range is applied'
);
update public.profiles set age_max = 60 where id = (select aarav from u);

update public.profiles set request_visibility = 'paused' where id = (select riya from u);
select is(
  tests.run_as((select aarav from u), format('select count(*) as n from public.nearby() where id = %L', tests.pub((select riya from u)))),
  '[{"n": 0}]'::jsonb,
  'nearby: paused people are hidden'
);
select is(
  tests.exec_as((select aarav from u), format('select public.send_request(%L)', tests.pub((select riya from u)))),
  'not_available',
  'send_request: paused people cannot be requested'
);
update public.profiles set request_visibility = 'anyone' where id = (select riya from u);

update public.profiles set request_visibility = 'within_5km' where id = (select zoya from u);
select is(
  tests.exec_as((select aarav from u), format('select public.send_request(%L)', tests.pub((select zoya from u)))),
  'not_available',
  'send_request: "within 5 km" refuses senders who are further away'
);
update public.profiles set request_visibility = 'anyone' where id = (select zoya from u);

-- ===========================================================================
-- Requests: tables are closed, the inbox is anonymous
-- ===========================================================================

select is(
  tests.exec_as((select aarav from u), format('select public.send_request(%L)', tests.pub((select riya from u)))),
  'ok',
  'send_request: Aarav asks Riya'
);
select is(
  tests.exec_as((select aarav from u), format('select public.send_request(%L)', tests.pub((select riya from u)))),
  'already_requested',
  'send_request: no second request to the same person'
);
select is(
  tests.run_as((select aarav from u), 'select * from public.requests') ? 'error',
  true,
  'requests table: not readable directly, even by the sender'
);
select is(
  tests.run_as((select riya from u), 'select gender, age, distance_bucket from public.incoming_requests()'),
  '[{"gender":"man","age":27,"distance_bucket":"Under 2 km"}]'::jsonb,
  'incoming_requests: the receiver sees gender, age and distance bucket'
);
select is(
  (select array_agg(k order by k) from jsonb_object_keys(
    tests.run_as((select riya from u), 'select * from public.incoming_requests()') -> 0) k),
  array['age', 'distance_bucket', 'expires_at', 'gender', 'request_id', 'sender_id'],
  'incoming_requests: no name, photo or coordinates'
);
select is(
  tests.run_as((select riya from u), format('select count(*) as n from public.incoming_requests() where sender_id = %L', (select aarav from u))),
  '[{"n": 0}]'::jsonb,
  'incoming_requests: the sender id is opaque'
);
select is(
  tests.run_as((select kabir from u), format(
    'select public.respond_request(%L, true)', (select id from public.requests where from_id = (select aarav from u)))),
  '{"error": "not_found"}'::jsonb,
  'respond_request: only the receiver can answer'
);

-- ===========================================================================
-- Rule 7: ignoring looks identical to "no answer yet" for the sender
-- ===========================================================================

create temp table sent_before as
select tests.run_as((select aarav from u), 'select * from public.sent_requests()') as j;

select is(
  tests.exec_as((select riya from u), format(
    'select public.respond_request(%L, false)', (select id from public.requests where from_id = (select aarav from u)))),
  'ok',
  'respond_request: Riya ignores'
);
select is(
  tests.run_as((select riya from u), 'select count(*) as n from public.incoming_requests()'),
  '[{"n": 0}]'::jsonb,
  'ignore: the request leaves the receiver''s inbox'
);
select is(
  tests.run_as((select aarav from u), 'select * from public.sent_requests()'),
  (select j from sent_before),
  'ignore: what the sender can see is byte-for-byte unchanged'
);
select is(
  (select array_agg(k order by k) from jsonb_object_keys((select j from sent_before) -> 0) k),
  array['age', 'distance_bucket', 'expires_at', 'gender', 'request_id'],
  'sent_requests: carries no status or answer field at all'
);

-- 24h expiry
update public.requests set expires_at = now() - interval '1 minute' where from_id = (select aarav from u);
select is(
  tests.run_as((select aarav from u), 'select count(*) as n from public.sent_requests()'),
  '[{"n": 0}]'::jsonb,
  'expiry: an unanswered request disappears after 24 hours'
);
select is(private.expire_requests(), 1, 'expiry: the scheduled job marks it expired');

-- ===========================================================================
-- Daily limit: 10 requests per rolling 24 hours
-- ===========================================================================

create temp table crowd as
select tests.make_user('Crowd' || g, 'woman', '{man}', 25, 1) as id from generate_series(1, 10) g;
grant select on crowd to authenticated;

-- Aarav has used 1 (Riya). Nine more are allowed, the next is refused.
select is(
  (select count(*) filter (where r = 'ok')::int from (
     select tests.exec_as((select aarav from u), format('select public.send_request(%L)', tests.pub(c.id))) as r
     from (select id from crowd order by id limit 9) c) x),
  9,
  'daily limit: requests 2 to 10 are accepted'
);
select is(
  tests.exec_as((select aarav from u), format('select public.send_request(%L)',
    tests.pub((select id from crowd order by id desc limit 1)))),
  'daily_limit',
  'daily limit: the 11th request in 24 hours is refused'
);
select is(
  tests.run_as((select aarav from u), 'select public.requests_left() as n'),
  '[{"n": 0}]'::jsonb,
  'daily limit: requests_left reports 0'
);

-- ===========================================================================
-- Mutual match: only now are name and photo visible, and only to the two of them
-- ===========================================================================

select is(
  tests.exec_as((select meera from u), format('select public.send_request(%L)', tests.pub((select kabir from u)))),
  'ok',
  'Meera asks Kabir'
);
select is(
  tests.run_as((select kabir from u), 'select count(*) as n from public.my_matches()'),
  '[{"n": 0}]'::jsonb,
  'before accepting: no match, so no name'
);
create temp table mk as
select (tests.run_as((select kabir from u), format(
  'select public.respond_request(%L, true) as id', (select id from public.requests where from_id = (select meera from u)))
) -> 0 ->> 'id')::uuid as match_id;
grant select on mk to authenticated;

select isnt((select match_id from mk), null, 'respond_request: accepting creates a match');
select is(
  tests.run_as((select kabir from u), format('select first_name, age from public.match_profile(%L)', (select match_id from mk))),
  '[{"first_name":"Meera","age":26}]'::jsonb,
  'match_profile: a member sees the other person''s first name'
);
select is(
  tests.run_as((select meera from u), format('select first_name from public.match_profile(%L)', (select match_id from mk))),
  '[{"first_name":"Kabir"}]'::jsonb,
  'match_profile: and the other member sees theirs'
);
select is(
  tests.run_as((select aarav from u), format('select * from public.match_profile(%L)', (select match_id from mk))),
  '[]'::jsonb,
  'match_profile: an outsider gets nothing'
);
select is(
  tests.run_as((select aarav from u), 'select * from public.matches') ? 'error',
  true,
  'matches table: not readable directly'
);

-- Chat and photos
select is(
  tests.exec_as((select kabir from u), format('insert into public.messages (match_id, body) values (%L, ''Hello!'')', (select match_id from mk))),
  'ok',
  'messages: a member can send'
);
select is(
  tests.run_as((select meera from u), 'select body from public.messages'),
  '[{"body":"Hello!"}]'::jsonb,
  'messages: the other member can read'
);
select is(
  tests.run_as((select aarav from u), 'select count(*) as n from public.messages'),
  '[{"n": 0}]'::jsonb,
  'messages: outsiders read nothing'
);
select matches(
  tests.exec_as((select aarav from u), format('insert into public.messages (match_id, body) values (%L, ''hi'')', (select match_id from mk))),
  'row-level security',
  'messages: outsiders cannot send'
);
select matches(
  tests.exec_as((select kabir from u), format(
    'insert into public.messages (match_id, body, sender_id) values (%L, ''fake'', %L)', (select match_id from mk), (select meera from u))),
  'permission denied',
  'messages: nobody can send as someone else'
);

-- Rule 5: photo access follows the match
select is(
  tests.run_as((select kabir from u), format('select private.can_view_photo(%L) as ok', (select meera from u)::text)),
  '[{"ok": true}]'::jsonb,
  'photos: a matched user may read the other''s photo'
);
select is(
  tests.run_as((select aarav from u), format('select private.can_view_photo(%L) as ok', (select meera from u)::text)),
  '[{"ok": false}]'::jsonb,
  'photos: an unmatched user may not'
);

-- ===========================================================================
-- Rule 6: a block makes two people disappear from each other entirely
-- ===========================================================================

select is(
  tests.exec_as((select meera from u), format('select public.block_user(%L)', tests.pub((select kabir from u)))),
  'ok',
  'Meera blocks Kabir'
);
select is(
  jsonb_build_array(
    tests.run_as((select meera from u), 'select count(*) as n from public.my_matches()'),
    tests.run_as((select kabir from u), 'select count(*) as n from public.my_matches()'),
    tests.run_as((select meera from u), 'select count(*) as n from public.messages'),
    tests.run_as((select kabir from u), 'select count(*) as n from public.messages'),
    tests.run_as((select kabir from u), format('select count(*) as n from public.match_profile(%L)', (select match_id from mk))),
    tests.run_as((select kabir from u), format('select private.can_view_photo(%L) as n', (select meera from u)::text)),
    tests.run_as((select kabir from u), format('select count(*) as n from public.nearby() where id = %L', tests.pub((select meera from u)))),
    tests.run_as((select meera from u), format('select count(*) as n from public.nearby() where id = %L', tests.pub((select kabir from u))))
  ),
  '[[{"n":0}],[{"n":0}],[{"n":0}],[{"n":0}],[{"n":0}],[{"n":false}],[{"n":0}],[{"n":0}]]'::jsonb,
  'block: match, chat, name, photo and Nearby card vanish for both people'
);
select is(
  tests.exec_as((select kabir from u), format('select public.send_request(%L)', tests.pub((select meera from u)))),
  'not_available',
  'block: the blocked person cannot send a new request (and isn''t told why)'
);

select * from finish();
rollback;
