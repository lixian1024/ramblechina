# Ramble China accounts and persistence

## Setup

The requested project is `https://hhjalaigivnepmtmoixs.supabase.co`. `.env.local` already has the matching URL and public key. Production needs:

```env
NEXT_PUBLIC_SUPABASE_URL=https://hhjalaigivnepmtmoixs.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<project publishable key>
```

Do not put a secret or service-role key in frontend variables. Runtime writes use the authenticated user's cookie session and RLS, not an administrator key.

Execute `supabase/migrations/20261011000100_ramble_accounts.sql` in this project's SQL Editor. It creates only `ramble_profiles`, `ramble_trips`, and `ramble_guide_requests`, so it does not change travelagent's tables. The transaction can be rerun. Existing auth users can use these tables after signing in; a profile row is created when personal details are first saved.

In Authentication → URL Configuration, set Site URL to `https://www.ramblechina.com` and allow the exact callback paths and their query strings on the production, localhost and 127.0.0.1 origins. Follow [domain, Google and verification-email setup](auth-domain-email-setup.md) for the complete values and email template. Live probes on 2026-10-11 confirmed the project still falls back to www.chinatravelagent.cc for default, localhost and new-production redirects; only the 127.0.0.1 callback was accepted. These external settings remain to be saved and rechecked. The callback redirects to a restricted relative English path, retaining the browser's current host so Supabase PKCE cookies remain available.

Email and Google providers were confirmed enabled through the project's public auth settings on 2026-10-11. Email registration reuses travelagent's temporary-password signup → email OTP → user-chosen password flow. The confirmation link also returns to the password step, so registration works with a confirmation-link email template. To show a numeric code in the email, include `{{ .Token }}` in the signup email template. Google uses the existing Supabase provider configuration. Credentials and password entry are performed by the user.

## User workflow

- `/en/login`: email/password sign-in, email verification registration, and Google login when enabled.
- `/en/account`: edit name/country/preferred guide language, list all saved trips and guide requests in pages of 50, and sign out.
- `/en/plan?trip=<UUID>`: load an owned trip and its last 40 chat messages, reacquire map/weather/route data, and continue editing. New conversations and generated/revised plans save automatically after a request finishes. The save indicator distinguishes pending, saving, saved and failed changes.
- `/en/local-guide`: signed-in submission stored with the account owner; receipt links to My account.

Starting a new trip retains the previous saved trip. Save failures keep the draft in memory and expose retry; no browser-cache fallback is written. Internal navigation is blocked until pending changes save; closing/reloading a dirty tab warns the user. A stale edit is not overwritten: the user can reopen the stored version after explicitly choosing to discard their unsaved changes. A lost response can be retried without creating another trip or guide request.

An old `china-unfold-route-concierge-v1` browser draft can be imported explicitly from My account. It is never automatically assigned to whoever logs in; the old key is removed only after database success. The `view=classic` planner branch is retired from the published plan route. Destination bookmarks and historical editorial Daybook settings are separate features, not itinerary persistence.

## Data boundaries and manual review

RLS checks `auth.uid()` against the row owner. Private APIs independently call `getUser()`, filter by owner, require same-origin mutation requests, validate/limit payloads and send `private, no-store`. Clients cannot edit guide status or submitted contact details. Trips use a version compare-and-update; server and client both strip provider maps/photos/addresses/weather/routes before saving. Place IDs, user choices, bookings, all trip dates and sourced research notes remain; provider facts are reacquired when reopening, with failures shown as unverified rather than fabricated.

Staff can review `ramble_guide_requests` through Supabase Table Editor with authorized project access. `status` may be manually updated to `reviewing`, `contacted`, or `closed`; it never means a confirmed booking or payment.

Historical `.data/guide-requests/*.json` files are preserved and are no longer used for new submissions. They have no verified Supabase owner, so they are not assigned merely by matching an email. Any historical migration needs an explicit, verified owner mapping and should retain the original request ID/receipt. No personal requests are silently copied to another account.

## Verification and remaining gate

`npm run test:accounts` first checks actual Supabase SDK signup/resend/Google PKCE requests through a controlled transport for local and production callback origins, unsafe-origin/return-path rejection and email error messages. It then executes the actual SQL in an isolated PGlite PostgreSQL instance, checking migration retry, two-user row isolation, forged-owner denial, anonymous denial, guide status write restrictions, real jsonb storage, ten dates/bookings preserved, optimistic versions, duplicate/conflicting receipts and database failures. A React hook regression checks create/reopen, concurrent edits during an in-flight save, failed-save input retention, retry/version stability, conflict blocking, new-trip separation and load failure. Fixtures are controlled and are not evidence of live Supabase user registration, email delivery or travel quality.

Existing guide validation, map-provider retention rules, trip-calendar, routing, concierge, workbench, editorial and English redirects remain checked. Production compilation and TypeScript passed. Public auth settings, anonymous API rejection and local desktop/mobile registration navigation have been checked. After the user executed the migration on 2026-10-11, all three live tables returned HTTP 401 / `42501` permission denied for anonymous `select=*&limit=0` probes, replacing the earlier `PGRST205` missing-table results. No user records were read. The website remains signed out. Live registration/confirmation, OAuth redirect configuration, account data round trips, two actual users and manual status review remain to be checked after user sign-in. Do not mark this live workflow complete until those checks pass.

Official references: [Supabase SSR clients](https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs), [row level security](https://supabase.com/docs/guides/database/postgres/row-level-security), [email templates](https://supabase.com/docs/guides/auth/auth-email-templates).
