# Growth funnel measurement

Use the existing GA4 stream `G-QBCYPGN6SB`. Local, preview and blocked-script traffic is excluded or ignored; analytics must never block planning, authentication or saving.

`src/lib/growth/analytics.ts` only accepts approved event names and bounded locale, actor, operation, failure and day-count parameters. It rejects unknown keys and values at runtime. Raw requests, emails, account/trip UUIDs, share capability tokens, errors and arbitrary campaign strings must never be passed. Optional deduplication keys remain in browser memory. Shared capability paths are reduced to `/en/shared` or `/zh/shared` before page-view globals, current location or later referrer data are recorded.

| Event | Qualifying outcome |
| --- | --- |
| `planner_start` | An admitted UI planning attempt starts; this is not success. |
| `itinerary_generated` | A result arrives and its response stream reaches clean EOF without abort/error. Duplicate terminal lines publish once. |
| `itinerary_first_edit` | The first successful edit in the current planner workspace. Later edits do not increment it. A fresh workspace is a new observation context; use GA4 user/session denominators accordingly. |
| `sign_up` | The authenticated server session claims the first durable receipt for a verified Auth account in the launch cohort. |
| `itinerary_saved` | The authenticated persistence response confirms a save; failure retains the draft. |
| `planner_error` | An attempted operation fails or is stopped. Failure enum contains no provider/user text. |
| `share_created` / `share_revoked` | The respective owner API action succeeds. |
| `research_requested` | Private intake confirms successful or idempotently repeated storage. |

## Restored draft boundaries

Guest trial restoration uses the stripped, temporary server-held draft and explicitly says that map details need verification. A freshly generated in-page result retains its live provider details and does not show this restore notice. Explicit sign-in handoff uses the persistence hook's `restoreDraft(snapshot)`, which marks the imported plan as loaded and invokes the existing authenticated map-refresh path. Both paths retain booking times, booking notes and the original plan when refresh fails. A private save failure retains the staged handoff for retry; only a confirmed private save clears it. Provider refresh and confirmed private persistence are separate outcomes, so a successful save never claims map verification succeeded.

## Verified signup cohort

`POST /api/analytics/signup` enforces same-origin and calls the existing `accountSession()` server verification. The client sends no account id. The server injects its private gateway secret into `ramble_claim_signup` and supplies only the verified session's UUID.

The private `ramble_growth.signup_receipts` table allows at most one claim per Auth UUID across browsers, refreshes and concurrent clients. Eligibility uses authoritative `auth.users.created_at >= 2026-10-23T00:00:00Z` and non-null `email_confirmed_at`; it never infers a new account from similar creation/login timestamps or from editable user metadata. Accounts created before this explicit UTC cutoff are excluded, even when signing in for the first time after deployment. Accounts created on launch day before deployment are intentionally included when they next visit.

`AuthProvider` requests the receipt after a confirmed identity is available, covering confirmed signup OTP, email-link return and Google identities through the same server rule. LoginScreen clicks, unverified signup responses, token refreshes and preexisting-account logins do not independently emit signup. The receipt also protects against duplicate claims from React Strict Mode and multiple tabs. The migration depends on the growth gateway foundation and must be applied before production enables this metric. No new auth protocol, account table access or Google-specific secret is needed.

Delivery is **best effort**. The database marks a receipt claimed before GA4 receives the browser event; a lost HTTP response, closed tab, blocked tag or failed GA network request can undercount. A durable claim proves an eligible identity, not GA delivery, human research participation or product demand. The event is not a billing ledger. Do not report all signups or all first edits measured until live event payloads and coverage are checked in GA4.

## Controlled verification

- `scripts/verify-analytics.ts`: page-view guards and shared-token/referrer removal.
- `scripts/verify-growth-analytics.ts`: bounded event payloads, deduplication and failure-vs-success separation.
- `scripts/verify-guest-handoff.ts`: actual Planner stream, guest/login handoff and persistence integration, including result-then-error/abort and second-edit accounting.
- `scripts/verify-signup-receipts.ts`: actual PostgreSQL migration, launch cutoff, verification, concurrent atomic receipt, table isolation and API session selection.
- `scripts/verify-signup-analytics.ts`: actual AuthProvider/Login components against controlled SDK and receipt transport, including unverified/old/new users and analytics failure recovery.

Fixtures are synthetic and do not contact Google, create real accounts or establish production conversion results.

## Production account evidence2026-10-23

The correct GA4 property Realtime report received actual `page_view`, `planner_start` and `itinerary_generated` from release QA. A private saved Explore named **Ramble China · First visit to saved trip** was reopened to verify five persisted closed, indirectly followed steps: `page_view` → `planner_start` → `itinerary_generated` → `itinerary_first_edit` → `sign_up`. Custom steps use exact Event name filters. The final step measures verified signup, not private saving; `itinerary_saved` remains a separate event. Today is selected initially. Explore currently reports no processed data; this is not evidence of zero conversions. The exploration is not shared, and enhanced measurement/settings/permissions were not changed. Local screenshots: `output/growth/ga4-funnel-reopened.png`, `ga4-funnel-definitions.png`, `ga4-realtime-received.png`.

Subsequent live QA confirmed Realtime receipt of `itinerary_first_edit`, `itinerary_saved`, `share_created` and `share_revoked`. The owner used an existing account; no fake live signup was created. Screenshots: `ga4-first-edit-live.png`, `ga4-save-share-revoke-live.png`.
