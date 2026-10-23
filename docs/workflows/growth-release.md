# First-visit growth release

Owner scope: seven acquisition/core-loop improvements. No short-video production, email-for-PDF, influencer/affiliate outreach or paid product work. Spec/plan: `docs/superpowers/`. Product decision: D-035.

## Deployment gates

- Controlled growth, sharing, SEO, original travel/account regressions, typecheck, lint and production build must pass.
- Apply the four timestamped migrations in order: trip shares, growth trial foundation, research requests, signup receipts. Schema is additive and scoped to `ramble_*` / private `ramble_growth`; do not change the project's other applications/tables.
- Set server-only `RAMBLE_GROWTH_SECRET` in Vercel Production (Preview only when an authorized preview needs the same gateway). Its SHA256, never plaintext, belongs in `ramble_growth.settings.secret_hash`. The deployment and database must match. No service-role key or browser secret is needed.
- Set the singleton `key='gateway'` settings `enabled=true` only after the stored secret hash is present. A missing/mismatched secret or store outage denies provider work.
- Deploy; verify formal HTTPS host, both locales, trial status, unsupported scope rejection, one real generated plan/edit within the cap, private save/login recovery, share/anonymous view/revoke, intake receipt and actual GA payloads. Synthetic controlled fixtures are never production itineraries.

## Limits and stop

Private settings defaults: AI provider calls30/global UTC day (including classification, search, repair and photo vision); outer planning requests also limited30/global day, account10, IP6; map lookups120/global and20/IP; concurrency2. Constraints permit lowering but not raising approved ceilings. Guest cookie lifetime and canonical access24hours, one admitted generate and one edit; a new cookie is not proof of a new person. Errors/abort consume admitted attempts because upstream work may already have been charged. Do not reset real counters to make a test pass.

Immediate database stop (owner SQL console):

```sql
update ramble_growth.settings set enabled=false where key='gateway';
```

Lower an allowance using the corresponding `ai_daily_limit`, `account_daily_limit`, `ip_daily_limit`, `map_daily_limit`, `map_ip_limit` or `concurrent_limit` columns. `RAMBLE_AI_PAUSED=1` also stops new paid admissions after environment deployment. Existing verified itinerary display and private saves remain available. Refresh/geometry/photo/static/legacy map endpoints are guarded; public sharing never calls providers. Browser Maps JavaScript is governed separately by existing API/referrer restrictions, so request limits do not guarantee a precise currency budget.

Admissions expire after8minutes; the concierge function is limited to300seconds. Expired work cannot publish a canonical result. Request metadata older than2days and expired trial rows are removed on the next admission; access to expired trial content stops immediately. This is lazy cleanup, not a claim of a background erasure scheduler. Research contacts remain private until the operator handles/erases them according to the form's purpose.

## Search operations

Formal prefix is `https://www.ramblechina.com/`. Google verification meta is bound to the owner's current logged-in account; keep it deployed after successful verification. Submit `https://www.ramblechina.com/sitemap.xml` and record actual status/date. Bing can import the verified GSC property after owner authorization or use its own site tag; never claim import or indexing before success. Robots permits public content and excludes private/API/auth paths; shared links are noindex and excluded from sitemap.

Both Google and Bing manual verification tags are deployed in the locale root metadata. On2026-10-23 the owner explicitly authorized final verification and sitemap submission in the logged-in accounts. GSC ownership was verified; sitemap status is **Success**,108discovered pages. Its Page indexing report is still processing, so the indexed count is unknown. Bing ownership was verified and the sitemap submitted; status **Processing**, no errors/warnings, discovery currently0 and indexed count unknown. These are account-side observations, not an indexing promise. Evidence: `output/growth/search-platforms.json`, `google-sitemap-success.png`, `bing-sitemap-submitted.png` (local, ignored).

## Operator work

The research application is `/en/trip-review` / `/zh/trip-review`. See `docs/research/2026-10-core-loop-study.md` and its blank participant tracker. Review incoming private records in the Supabase SQL console using explicitly selected fields:

```sql
select id, created_at, request
from ramble_growth.research_requests
order by created_at desc limit 25;
```

Use only for the consented human review, avoid copying contact details into analytics or public reports, and distinguish applications from completed sessions. Do not send recruitment posts to communities without current rule checks and explicit authorization to message/post.

GA funnel semantics and cohort limits: `growth-analytics.md`. Sharing publication/revoke and redaction: `itinerary-sharing.md`. First30days targets are hypotheses (1,000visits/50plans/15editors/10traveller conversations), not forecasts or completed outcomes. Prefer generated→edited and recovered failures to raw visits when deciding next product work.

## Release evidence2026-10-23

All four migrations applied successfully to the existing project. Gateway credential matched through the actual modern publishable-key HTTP transport, and five independent HTTP admissions produced2admitted/3busy, then released both leases; no provider calls, synthetic plans, user accounts or research applications were created by that check. Conservative settings were read back as30/10/6/120/20/2 and enabled. Production build, original check:product, new growth/sharing/SEO gates, lint/typecheck and local production HTTP integration passed. Local build HTML confirms both verification tags, one-brand titles and108sitemapURLs. Production site/runtime and account-side search verification are recorded after deployment, not inferred from these gates. Local evidence lives underoutput/growth (ignored).

Commit63821df deployed successfully through GitHub main → Vercel Production. Formal bilingual pages and metadata respond successfully. An explicitly synthetic intake record was saved with a receipt, checked in private storage and deleted by its exact QA id/email/destination; it was never counted as a traveller or interview (`intake-live-test.json`). Actual browser requests and the GA4 Realtime backend show `page_view`, `planner_start` and `itinerary_generated` with the configured stream; QA traffic is included (`live-ga-events.json`, `ga4-realtime-received.png`).

The first real Shanghai sample for Monday2026-11-02 exposed a Yu Garden interior closure violation. Keep `monday-closure-before-fix.png` as failed evidence. Paid admissions were temporarily stopped while adding source-backed date/booking guards; this generated sample is not a quality pass. Follow-up deployment, re-enable and real edit/save/share verification must be recorded below after they occur.

The D-036 follow-up passed fresh production build, complete `check:product`, `test:growth`, `test:venue-access`, all six original Shanghai gates and map-provider/identity/photo checks. Independent critic passed both the rule and the bilingual public error/recovery changes. No original assertions or Human Gate status were weakened.

Commit69b74d8 deployed successfully and the gateway was re-enabled with the original conservative ceilings. A real guest edit removed the interior visit, retained2026-11-02/Shanghai/TheBund and the museum/theme-park exclusions, and produced a mapped Bazaar→Bund route with meal windows and remaining uncertainty. The long original edit first exposed an overconservative scope-parser400 before provider work; a shorter synonymous edit succeeded. The exact long request is now a regression with a narrow local-venue noun fix, preserving unknown-city rejection, and passed independent review, scope/API gates and a fresh production build.

The owner completed existing-account login in the staged browser. The draft restored, refreshed provider details, saved privately and reopened from its saved URL after reload. A previewed generic QA snapshot published successfully; a separate no-cookie HTTP request returned200 with noindex/no-store and only whitelisted stops. Revocation succeeded; browser showed not-found and an independent anonymous HTTP request returned404 with neither stop present. The test link is revoked; the private QA itinerary remains in the owner's account. Realtime additionally received `itinerary_first_edit`, `itinerary_saved`, `share_created` and `share_revoked`. New-account signup is verified by controlled authoritative Auth receipts, not by creating a fake live user. Last checked gateway enabled,4actual model calls today, no counters reset. Evidence: `monday-edit-live.*`, `share-live-before.json`, `share-live-after-revoke.json`, `share-public-live.png`, `share-revoked-live.png`, `ga4-first-edit-live.png`, `ga4-save-share-revoke-live.png`.
