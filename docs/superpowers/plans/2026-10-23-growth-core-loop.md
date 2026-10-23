# First-visit Growth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement the coupled core task; independent acquisition/content work may use parallel agents under dispatching-parallel-agents.

**Goal:** Deliver the seven owner-approved improvements around an observable generate → edit → save → share loop.
**Architecture:** Existing Next.js/GA4/Supabase with durable PostgreSQL admission and capability-based public snapshots; no new analytics or account service.
**Tech Stack:** Next.js 16, React 19, TypeScript, Supabase/PostgreSQL, PGlite controlled tests.
**Spec:** `docs/superpowers/specs/2026-10-23-growth-core-loop.md`

## Global Constraints

- Keep original travel Evals, failure recovery, RLS and date/booking behavior; no fabricated travel facts or people.
- Server reservations precede paid work; storage/config failure denies paid work.
- No private text/identifiers in analytics, share snapshots or public indexing.
- Quotas and trial scope exactly match the spec until the owner supplies different limits.

## Review Focus

- Parallel requests cannot overspend a visitor/global limit or reuse a consumed generation.
- A changed visitor payload cannot supply a fake previous plan or obtain another visitor's continuation.
- Login/callback failure must preserve the explicit guest draft; saved-trip URLs stay private.
- A public token must not leak private fields and must stop working after revoke.
- An abort, partial stream, signup click or failed save must never count as success.

## Tasks

### 1. Durable trial admission and account handoff
Files: `src/lib/trial/*`, `src/app/api/trial/*`, `src/app/api/trip-concierge/route.ts`, `src/components/travel/Planner.tsx`, account persistence/handoff, timestamped Supabase migration, `scripts/verify-trial.ts`.
- [x] Write failing PostgreSQL concurrency/limits/expiry/authorization tests and unsupported-trial/continuation tests.
- [x] Implement an atomic quota/lease store and server token, guarded request admission and successful canonical continuation.
- [x] Permit the bounded guest UI; retain current signed-in flow and implement explicit login/save recovery.
- [x] Verify trial failure, real generation/edit and login handoff; run existing relevant Evals.

### 2. Revocable public snapshots
Files: `src/lib/sharing/*`, `src/app/api/trips/[id]/share/route.ts`, `src/app/[locale]/shared/[token]/page.tsx`, owner controls and `scripts/verify-sharing.ts`.
- [x] Write redaction, two-owner isolation, token and revoke tests first.
- [x] Implement explicit owner publication/revocation and a noindex, read-only, dated public view.
- [x] Verify all source/uncertainty fields remain honest and no paid lookup occurs on public reads.

### 3. GA4 funnel and metadata
Files: analytics module/helper, planner/auth/persistence integration, metadata/home/city/OG routes, `scripts/verify-growth-analytics.ts`, `scripts/verify-seo.ts`.
- [x] Test success/abort/failure counting and no private payloads; implement bounded event API.
- [x] Test and implement branded localized metadata and image previews.
- [x] Integrate events at confirmed outcomes in the core task; verify actual production payloads.

### 4. Sourced guides and research intake
Files: dedicated guide data/routes/styles, research intake route/form, research workflow and blank template.
- [x] Research two current official-source topics; review factual boundaries and dated citations.
- [x] Publish bilingual guides with real planner entry, metadata, source links and sitemap entries.
- [x] Build a private/recoverable review-request intake and prepare human recruitment/interview artifacts.
- [x] Verify malformed requests/storage failure/retries and no invented participants.

### 5. External setup, integration and release
- [x] Verify Google/Bing ownership, submit current sitemap, inspect coverage using available owner sessions; record concrete blockers if unavailable.
- [x] Inspect existing production database/environment, apply tested scoped migration, configure secrets privately and verify anon/owner boundaries.
- [x] Run full relevant regression, production build, and independent critic review; fix failures without lowering standards.
- [x] Deploy and verify real metadata, intake, trial/edit/share/revoke and GA4 events. Update PRODUCT/DECISIONS/TASKS/EVALS and report human research separately.

## Evidence boundary

Engineering and account-side configuration/technical flow gates above were executed. The first live plan failed a Monday-access rule and remains failed evidence; its subsequent corrected edit/save/share/revoke passed. Search indexing and processed conversion counts remain pending platform data. Ten real traveller sessions are not completed: the owner authorized an application entry in their absence. No synthetic participant or new production Auth user was invented.
