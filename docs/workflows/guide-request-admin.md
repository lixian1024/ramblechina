# Local guide request review

## Enable the designated administrator

The user selected `lisabob468@gmail.com`. Use its existing Ramble China login;
there is no separate administrator password or authentication system.

1. Confirm that this address has a verified account in the existing Supabase
   project `hhjalaigivnepmtmoixs` (email confirmation or Google sign-in).
2. Open the project's SQL Editor and execute the whole file
   `supabase/migrations/20261019000100_guide_request_admin.sql` after the original
   `20261011000100_ramble_accounts.sql` migration.
3. The script requires exactly one matching verified Auth account. If absent or
   ambiguous, the transaction fails rather than reporting an effective grant.
   Finish verification/correct the account and rerun. The script is idempotent.
4. Sign in to Ramble China with that account. In My account, choose **Manage guide
   requests / 管理导游需求**, or open `/en/admin/guide-requests` or
   `/zh/admin/guide-requests` directly.

The migration has been checked in isolated PostgreSQL, **not applied to live
Supabase by this implementation**. Running it is a real authorization change:
the selected account may read all submitted guide requests and contact details.
It receives no new write/delete permissions or access to other users' profiles
and trips. No service-role secret or new env key is needed.

## Review workflow

Requests appear newest first, with a UUID tie-breaker, 25 per page. Filter by all,
received, reviewing, contacted, or closed. Expand details to read dates, group
size, guide language, budget and notes. Contact information and receipt number
are visible on the card. Timestamps use Asia/Shanghai; submitted travel dates
remain the user's date strings. Blank optional fields say not provided.

The first version is read-only. Status changes remain an authorized Supabase
Table Editor operation; this page does not send messages, assign guides, quote
prices, confirm bookings or collect payment. Historical private JSON files are
not imported or silently given account ownership.

Network/setup errors show Retry, separate from a genuine empty result. A row
with invalid request details gets an explicit warning and reference for manual
inspection while valid rows and pagination remain usable. Request text is React
text, not HTML. Switching accounts unmounts the private view; switching filters
cancels/ignores previous responses and hides the old results while loading.

## Permission boundaries

`ramble_private.guide_admins` binds the approved user UUID to read permission.
The schema/table have no PUBLIC, anon or authenticated privileges and the table
has RLS enabled with no client policies. Users cannot register themselves as
staff or change membership through profile/user metadata.

`ramble_is_guide_admin()` is a zero-argument boolean-only SECURITY DEFINER function
with an empty search_path and fully qualified tables. PUBLIC/anon cannot execute
it. Authenticated users can only check their own membership; the function also
requires the Auth account's confirmed-email timestamp. The policy only adds
SELECT on `ramble_guide_requests`; original owner policies remain.

The server endpoint `/api/admin/guide-requests` verifies the current user using
`getUser()`, then checks membership before querying any requests. A non-admin
gets 403, a signed-out caller 401, invalid filters 400, and a database/setup
failure 503. Responses use `private, no-store`; the page has noindex/nofollow and
is not in the sitemap. The My account entry is a convenience, not authorization.

To revoke this administrator in the SQL Editor:

```sql
delete from ramble_private.guide_admins
where user_id in (
  select id from auth.users where lower(email) = 'lisabob468@gmail.com'
);
```

The database checks current membership, so subsequent reads are denied without
waiting for token refresh. Already delivered browser data cannot be recalled.
Rerunning the bootstrap migration deliberately reauthorizes the selected verified
account; do not use it as a recurring synchronization job after revocation.

## Verification

`npm run test:accounts` includes the existing authentication/storage checks plus:

- `verify-guide-admin.ts`: actual SQL migration/rerun and verified bootstrap,
  two-owner admin access, ordinary/anonymous isolation, forbidden self-promotion,
  no writes/profile/trip access, immediate revocation, unverified denial; real
  Supabase SDK queries over controlled PostgreSQL transport for newest-first
  order, filter/page bounds, exact last page, empty results, database and malformed
  data failures, and a malformed owner's insert that cannot block valid rows.
- `verify-guide-admin-ui.ts`: production component with controlled HTTP replies
  for details, invalid rows, pagination/filter reset, retry, late responses,
  denied access and Chinese text. It uses the existing react-test-renderer
  tooling, which currently emits a deprecation notice.

These are controlled fixtures, not real customer records. The local signed-out
page/login return and API401 can be checked independently. Live SQL grant,
authenticated inbox rendering, administrator account entry, a second real user's
denial, and desktop/mobile review of actual submissions remain deployment checks.

Reference: [Supabase row level security](https://supabase.com/docs/guides/database/postgres/row-level-security).

2026-10-19 deployment follow-up: the user reports executing the authorization SQL and authorizes GitHub/Vercel production deployment. This is user-reported completion, not an independent authenticated membership/data check. The agent did not run the live migration.
