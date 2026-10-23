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

Both Google and Bing manual verification tags are staged in the locale root metadata; no cross-service GSC import is needed. Current pending external evidence: GSC verification/submission/coverage, Bing authorization/verification/submission/coverage. New properties may have no coverage history yet; sitemap accepted is not indexed. A published source file/HTML check alone does not satisfy an account-side verification gate.

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
