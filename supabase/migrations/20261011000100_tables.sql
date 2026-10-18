-- Hush core tables.
--
-- Privacy model: clients never read other people's rows from these tables.
-- Row Level Security lets a user read only their own profile, their own
-- safety settings and the messages of their active matches. Everything that
-- involves another person goes through the SECURITY DEFINER functions in the
-- next migrations, which return only what the privacy rules allow.

create extension if not exists postgis with schema extensions;

-- Internal helpers live here. This schema is not exposed through the API.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

create type public.gender as enum ('woman', 'man', 'nonbinary');
create type public.request_status as enum ('pending', 'accepted', 'expired');
create type public.request_visibility as enum ('anyone', 'within_5km', 'paused');
create type public.report_reason as enum ('harassment', 'fake_profile', 'underage', 'asking_for_money', 'other');
create type public.report_status as enum ('open', 'reviewing', 'resolved');
create type public.check_in_status as enum ('scheduled', 'confirmed', 'missed', 'cancelled');

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  -- The only identifier other users ever receive before a match.
  public_id uuid not null unique default gen_random_uuid(),
  first_name text check (char_length(first_name) between 1 and 40),
  -- Object path in the private "photos" bucket; must sit in the owner's folder.
  photo_path text,
  gender public.gender,
  interested_in public.gender[] not null default '{}',
  -- Verification: written only by the verification Edge Function (service role).
  -- No Aadhaar number, ID image or provider response is ever stored.
  birth_date date,
  verified_at timestamptz,
  verification_method text,
  request_visibility public.request_visibility not null default 'anyone',
  age_min int not null default 18 check (age_min >= 18),
  -- 60 means "60 and over".
  age_max int not null default 60 check (age_max between 18 and 60),
  -- Snapped to a ~500 m grid by set_location(); the raw position is never stored.
  location extensions.geography (point, 4326),
  location_updated_at timestamptz,
  last_active_at timestamptz not null default now(),
  is_banned boolean not null default false,
  created_at timestamptz not null default now(),
  check (age_max >= age_min),
  check (photo_path is null or photo_path like id::text || '/%')
);
create index profiles_location_idx on public.profiles using gist (location);

-- Every new auth user gets an (empty, unverified) profile.
create function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- ---------------------------------------------------------------------------
-- requests
-- ---------------------------------------------------------------------------
create table public.requests (
  id uuid primary key default gen_random_uuid(),
  from_id uuid not null references public.profiles (id) on delete cascade,
  to_id uuid not null references public.profiles (id) on delete cascade,
  status public.request_status not null default 'pending',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '24 hours',
  -- Set when the receiver taps Ignore. Receiver-side only: it hides the request
  -- from their inbox and is never returned to the sender, who keeps seeing
  -- "pending" until the normal 24h expiry.
  ignored_at timestamptz,
  check (from_id <> to_id)
);
-- At most one pending request between two people, in either direction.
create unique index requests_one_pending_per_pair
  on public.requests (least(from_id, to_id), greatest(from_id, to_id))
  where status = 'pending';
create index requests_from_created_idx on public.requests (from_id, created_at desc);
create index requests_to_pending_idx on public.requests (to_id) where status = 'pending';

-- ---------------------------------------------------------------------------
-- matches
-- ---------------------------------------------------------------------------
create table public.matches (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profiles (id) on delete cascade,
  user_b uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unmatched_at timestamptz,
  check (user_a < user_b)
);
create unique index matches_one_active_per_pair on public.matches (user_a, user_b) where unmatched_at is null;
create index matches_user_b_idx on public.matches (user_b);

-- ---------------------------------------------------------------------------
-- messages
-- ---------------------------------------------------------------------------
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches (id) on delete cascade,
  sender_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index messages_match_created_idx on public.messages (match_id, created_at);

-- ---------------------------------------------------------------------------
-- blocks, reports
-- ---------------------------------------------------------------------------
create table public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index blocks_blocked_idx on public.blocks (blocked_id);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reported_id uuid not null references public.profiles (id) on delete cascade,
  reason public.report_reason not null,
  details text check (char_length(details) <= 2000),
  status public.report_status not null default 'open',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- safety: trusted contact and check-ins (used from Phase 6)
-- ---------------------------------------------------------------------------
create table public.trusted_contacts (
  user_id uuid primary key default auth.uid() references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  phone text not null check (phone ~ '^\+?[0-9]{8,15}$'),
  updated_at timestamptz not null default now()
);

create table public.check_ins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  match_id uuid not null references public.matches (id) on delete cascade,
  due_at timestamptz not null,
  status public.check_in_status not null default 'scheduled',
  created_at timestamptz not null default now()
);
create index check_ins_due_idx on public.check_ins (due_at) where status = 'scheduled';
