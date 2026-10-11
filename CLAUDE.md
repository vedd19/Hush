# Hush — project brief for Claude Code

## Who you're working with
The founder is not a programmer. Explain what you're doing in plain language, one step at a time.
Before running anything that costs money, creates accounts, or touches production, stop and ask.
Never commit secrets (API keys, service-role keys) to git — use `.env` files that are git-ignored.

## The product
Hush is an 18+ mobile app for adults in India who are interested in each other but hesitant to say so.
- Everyone is ID-verified, but anonymous while browsing.
- Before a match, people see ONLY: gender, age, and a distance RANGE ("Under 2 km", "2–5 km", "5–10 km", "10+ km").
- A user sends a request. The receiver sees the sender's gender, age, and distance range, and can Accept or Ignore.
- If accepted, it's mutual: both users now see each other's first name and photo, and can chat.
- If ignored or unanswered, the request silently expires after 24 hours. The sender is never told "no".
- Revenue later: ads (AdMob) and an ad-free Premium. Neither is part of the MVP.

## Designs
Figma file: https://www.figma.com/design/39ZHa775nhcgj3FOF6Mhju
Screens: 01 Welcome · 02 Verify ID · 03 Hidden profile · 04 Safety controls · 05 Nearby ·
06 Send request · 07 Requests · 08 Mutual reveal · 09 Chat · 10 Block & report · 11 Me.
If the Figma MCP server is connected, read screens from the file. Match them closely.

### Design tokens (from the Figma "Hush / Color" variables)
| Token | Hex |
|---|---|
| bg/base | #0D0A12 |
| bg/surface | #17131D |
| bg/raised | #221C29 |
| border/subtle | #2E2636 |
| text/primary | #F8F2EE |
| text/secondary | #A69DB0 |
| text/tertiary | #8E8599 |
| text/on-brand | #1A0F12 |
| brand/coral (actions) | #FF6F61 |
| brand/lilac (mutual moment) | #C3A6FF |
| status/verified (mint) | #5FD6B4 |

Fonts: Fraunces (headlines, italic for emphasis) and Plus Jakarta Sans (everything else).
Type scale: Display XL 46, Display L 36, Display M 28, Title 17 bold, Body L 16, Body M 14, Body S 13, Caps label 11 bold tracked.
Radii: buttons 18, cards 22, chips fully rounded. Min touch target 44px. Dark theme only for MVP.

## Tech stack
- App: Expo (React Native) + TypeScript + Expo Router. Android first, iOS later.
- Backend: Supabase — phone OTP auth, Postgres + PostGIS, Row Level Security, Realtime (chat), private Storage (photos), Edge Functions.
- Scheduled jobs: pg_cron (expire requests).
- Builds: EAS Build. Fonts via @expo-google-fonts.

## Privacy and safety rules (non-negotiable)
1. Never send another user's coordinates, exact distance, first name, or photo to the client before a mutual match. Enforce this in the database (RLS + SECURITY DEFINER functions), not just the UI.
2. Store location snapped to a coarse grid (~500 m) and compute distance buckets server-side only. The API returns a bucket label, never a number.
3. ID verification goes through a licensed provider (e.g. DigiLocker via HyperVerge, IDfy, or Signzy) inside an Edge Function. Store only `verified_at`, `birth_date`, and the method used. NEVER store an Aadhaar number, ID images, or raw provider responses. Build this behind an interface with a mock provider for development; the founder will choose and pay for the real provider later.
4. Block users under 18 and unverified users from browsing, sending, or receiving requests.
5. Photos live in a private storage bucket. Serve them only as short-lived signed URLs, only to the owner or to a matched user.
6. A blocked user must disappear completely for the blocker, in both directions, including existing matches and chats.
7. Ignoring a request must look identical to "no answer yet" from the sender's side.

## Data model (first draft, refine as needed)
- `profiles`: id (= auth user), first_name, photo_path, gender, interested_in[], birth_date, verified_at, verification_method, request_visibility (anyone | within_5km | paused), age_min, age_max, location (geography, snapped), last_active_at, is_banned.
- `requests`: id, from_id, to_id, status (pending | accepted | expired), created_at, expires_at (created_at + 24h). Unique pending request per pair.
- `matches`: id, user_a, user_b, created_at, unmatched_at.
- `messages`: id, match_id, sender_id, body, created_at, read_at.
- `blocks`: blocker_id, blocked_id, created_at.
- `reports`: id, reporter_id, reported_id, reason, details, status, created_at.
- `trusted_contacts`: user_id, name, phone. `check_ins`: user_id, match_id, due_at, status.

Key RPCs (SECURITY DEFINER, tested):
- `nearby(bucket)` → anonymous cards: opaque id, gender, age, distance bucket, active flag. Respects gender preferences, age ranges, visibility settings, and blocks.
- `send_request(target)` → enforces 10 requests per rolling 24 hours, verification, blocks, and the target's visibility setting.
- `respond_request(request_id, accept)` → accept creates a match; "ignore" just leaves it to expire.
- `match_profile(match_id)` → first name + signed photo URL, only for members of an active match.

## How to work
Build in phases. Finish and demo each phase on the founder's phone (Expo Go or a dev build) before starting the next.
0. Set up the repo, Expo app, theme tokens, fonts, navigation skeleton.
1. Build all 11 screens with mock data, matching Figma.
2. Supabase project: migrations, RLS policies, RPCs, and tests proving the privacy rules above.
3. Phone OTP sign-in, verification flow (mock provider), hidden profile and photo upload.
4. Nearby, send request, requests inbox, 24h expiry, daily limits.
5. Mutual reveal and realtime chat.
6. Safety: block, report, unmatch, trusted contact, safety check-in.
7. Polish, empty states, error handling, privacy policy page, EAS build, Play Store internal testing.

Keep a short `PROGRESS.md` updated with what's done, what's next, and anything the founder must do by hand (accounts, keys, payments).
@AGENTS.md
