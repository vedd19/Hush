# Hush — progress

## Done
**Phase 0 — skeleton (2026-09-29)**
- Expo app (SDK 57, TypeScript, Expo Router) in the repo root. Code lives in `src/`.
- Design tokens (colors, type scale, radii) in `src/theme/tokens.ts`, copied from Figma.
- Fonts: Fraunces + Plus Jakarta Sans, loaded in `src/app/_layout.tsx`.
- Navigation for all 11 screens as placeholders you can tap through:
  - Onboarding: Welcome → Verify ID → Hidden profile → Safety controls
  - Tabs: Nearby · Requests · Chats · Me (Lucide icons, coral active tab)
  - On top of tabs: Send request (sheet), Mutual reveal, Chat, Block & report (sheet)
- Checks passing: typecheck, lint, expo-doctor (21/21), Android bundle builds.
- `.env` files are git-ignored.

**Phase 1 — all 11 screens with mock data (2026-10-07)**
- Text styles in `src/theme/tokens.ts` match Figma exactly.
- Shared pieces: `Screen`/`Glows`, `StepHeader`, `Icon`, `people.tsx` (avatars, cards, verified line),
  `controls.tsx` (chips, segmented control, switch, radio, age slider), `Button` (primary / secondary /
  outline / ghost).
- Fake data lives in `src/mock/store.ts`, shaped like the future server data (strangers have no names).
  Actions carry across screens: sending uses a request, accepting creates a match, block/unmatch
  removes the chat, the Requests badge updates.
- 01–04 built from Figma's exported code; 05–11 from Figma screenshots + saved layer sizes/text
  (Figma's free plan ran out of reads), icons from the Lucide set.
- Chats list has no Figma frame, so it follows the style of Requests and Chat.
- Checks passing: typecheck, lint, Android bundle builds. Clicked through in a browser preview.

## Not real yet (by design — later phases)
- ID check, photo upload, sign-in (Phase 3). "Report" and "Share my meet-up plan" just close the
  sheet; safety check-in is a simple on/off (Phase 6). Trusted contact / Notifications / Privacy /
  Help rows in Me don't open anything yet.

## Next
- Founder: try Phase 1 on your phone (see "How to run" below) and tell me what looks off.
- Phase 2: Supabase project — needs a Supabase account (free tier is fine to start).

## How to run on your phone
1. Install **Expo Go** from the Play Store.
2. In this folder, run `npx expo start`.
3. Scan the QR code with Expo Go (phone and computer on the same Wi-Fi).

## Founder to-dos (by hand)
- Figma's free plan allows only 20 design reads/month via Claude. Fine for now; consider upgrading if designs change a lot.
- Coming later: Supabase account (Phase 2), Expo/EAS account (Phase 7),
  ID-verification provider choice (Phase 3, mock until then), Google Play developer account (Phase 7).

## Notes
- Android package name (e.g. `com.yourcompany.hush`) isn't set yet. It's needed before the first
  Play Store build and can't be changed after publishing, so decide it before Phase 7.
