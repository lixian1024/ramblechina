# China Trip Pack Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax.

**Goal:** A private automated Shanghai1–3day USD9.90 Pack with durable90day re-export rights, preview, payment and download recovery.
**Architecture:** Existing Next16/Supabase app; independently sourced catalog + deterministic PDF, private order/file/entitlement RPCs, one approved MoR adapter. Sales fail closed until actual merchant and product review/configuration are complete.
**Tech Stack:** TypeScript, React, pdf-lib/fontkit, PostgreSQL/PGlite, existing Supabase auth and gateway secret.
**Spec:** `docs/superpowers/specs/2026-10-23-china-trip-pack-design.md`

## Global Constraints

- Shanghai1–3days,990USD cents,90consecutive24h from confirmed payment.
- Saved owner-only current snapshot; export never changes route or calls AI.
- Only independent curated venue data/user choices enter PDF; missing/unsupported stops block payment and remain visible.
- No live merchant approval/payment claims from fixtures; no production authorization bypass.
- Preserve original Evals, free sharing/research and legacy commerce boundaries.

## Review Focus

- An existing trip changes during checkout: deliver the purchased prepared version and offer eligible update, never silently bill another version.
- Double click/network timeout creates one payment attempt; retries cannot double-charge or extend rights.
- Refund/dispute arrives before success: late success cannot regrant.
- At exactly90days regeneration stops; original paid file remains downloadable.
- Failed rendering/new snapshot validation cannot erase a previously paid file or consume a paid right.

### Task 1 — truthful document and PDF
Files: create `src/lib/trip-pack/model.ts`, `catalog.ts`, `pdf.ts`; tests `scripts/verify-trip-pack-document.ts`, `verify-trip-pack-pdf.ts`.
Interfaces: export `PackDocument` (schemaVersion1,locale en|zh,generatedAt,startDate,days[{date,stops[{venueId,nameEnglish,nameChinese,pinyin,address?,sourceUrl,reviewedAt,durationMinutes,time?,booked,bookingNote?}]}],warnings:string[],hotel?:{name,address}); `preparePack(snapshot:unknown,locale:'en'|'zh',hotel?:{name:string;address:string},now?:string):{document:PackDocument|null;issues:string[]}`; `renderPackPdf(document:PackDocument,preview?:boolean):Promise<Uint8Array>`; exported schema validates stored documents; root owns fingerprint/server persistence.
- [ ] Write failing document cases for actual1/3day snapshot, all stops/date/order/booking retention, wrong city/days/missing dates/unsupported stops, Monday interior, bazaar distinction, no provider/chat leakage.
- [ ] Research official Shanghai sources; implement strict catalog projection. Time is saved `at` suggestion, not stripped provider schedule. Show source review date, known booking rules and unknowns.
- [ ] Write failing PDF extraction/links/Chinese/long-text/multipage tests; implement renderer. PDF under2MiB for supported input, no remote calls; Chinese font must render and extract correctly.
- [ ] Render representative1/3day bilingual examples and inspect every page; source/copy/date unknowns must be legible.

### Task 2 — private entitlement and purchase lifecycle
Files: CLI-generated migration; create `src/lib/trip-pack/store.ts`, `commerce.ts`, provider adapter; `/api/trip-pack` preview/prepare,checkout,status,download,regenerate and raw webhook routes; tests storage and actual API transports.
Interfaces: authenticated owner trip lookup uses `accountSession`; server calls narrow secret-gated RPC through existing `callGrowthRpc`; no client-supplied user/price/paid/date. Prepared record stores document, bounded PDF/base64/hash and trip version. Events normalized only after official provider verification; one provider adapter, no generic invented API.
- [ ] Write failing PostgreSQL isolation/concurrency/90day/refund-first/idempotency tests.
- [ ] Implement private orders+events, immutable ownership and payment identifiers, explicit prepared/pending/paid/revoked states, original paidAt/expiresAt and successful regeneration compare-and-swap.
- [ ] Write failing actual route tests for auth/origin/config/malformed payload/fake redirects/signature/price/currency/duplicate/cross-owner/file limits/failure retention.
- [ ] Implement pre-render-before-checkout, provider status validation, signed webhook durable ack, interrupted return reconciliation and download private/no-store/no-referrer. Until merchant acceptance and secrets exist, checkout returns unavailable while previews remain usable.

2026-10-24 Task 2 implementation contract:
- Creem is selected and its actual test store/product are provisioned. Implement only `off|test`; live money is unavailable in this release regardless of credentials. Read official Creem create/retrieve checkout, get product, raw webhook and test-mode docs. REST is acceptable if it avoids another SDK; never invent payload fields or assume request_id is a documented idempotency guarantee.
- Config names: `RAMBLE_PACK_MODE`, `CREEM_TEST_API_KEY`, `CREEM_TEST_PRODUCT_ID`, `CREEM_TEST_WEBHOOK_SECRET`, `RAMBLE_PACK_TESTER_IDS` (comma-separated approved Auth UUIDs). Only allowlisted authenticated owners can start test checkout/regenerate; no client override. Test files/rights are labelled and cannot become live entitlements. Existing Stripe routes are untouched.
- Export stable public API types for Task 3 in `src/lib/trip-pack/api-types.ts`. Endpoints: GET `/api/trip-pack?trip=<uuid>&locale=en|zh` (owner saved-trip preview/config/latest order); POST `/api/trip-pack/prepare` (tripId,version,locale,optional explicitly entered hotel); POST `/api/trip-pack/checkout` (orderId,acceptedTerms:true,policyVersion); GET `/api/trip-pack/status?order=<uuid>`; GET `/api/trip-pack/download?order=<uuid>`; POST `/api/trip-pack/regenerate` (orderId,version,locale,optional hotel); POST `/api/trip-pack/webhook` (raw provider body). Account recovery via GET `/api/trip-pack/orders`. Keep response shapes small, documented in exported types, errors with stable code and human message, private/no-store/no-referrer. Anonymous samples handled in Task 3.
- Prepare validates current owner trip/version and calls existing preparePack/renderPackPdf before creating any checkout; bounded 2MiB private PDF and document, content hash, stored trip version/locale. Use existing growth gateway secret for narrowly scoped private `ramble_growth` tables/RPC, never service-role in browser. The database must verify the trip belongs to the passed verified server owner. Keep original stored PDF bytes for later download; do not validate historical paid files against today's venue catalog.
- Store owner, trip, provider mode, fixed990USD cents, file revision, document/file digest, created/first-confirmed-paid/expiry timestamps, policy version/consent, checkout/order/transaction IDs and state. No raw chat, customer payment/card data or hotel fields in provider metadata/analytics. Delete trip/account should purge private PDF per existing ownership deletion; disclose effect in UI later.
- SQL must lock/uniquely constrain prepare reuse and one active checkout per owner/trip/mode so different locale/version/hotel or tabs cannot buy overlapping rights. Reuse pending checkout; after paid return existing entitlement for same trip rather than recharging. A new purchase is allowed after expiry. Hold a persisted create-attempt lock before the provider POST and attach the provider ID/URL durably before returning it. If creation's outcome is unknown, do not repeat POST; return a recoverable support/reconciliation state rather than assume provider idempotency.
- Validate fixed product has990USD/onetime/no pay-what-you-want, provider checkout product/quantity/currency/subtotal/status and mode before granting. Applicable tax may increase final total. Browser return is never proof. Reconcile pending status server-side using provider retrieve checkout so an interrupted webhook/return can recover.
- HMAC-SHA256 raw body signature with constant-time comparison and bounded request body. Persist event dedup/digest and identifiers, not whole sensitive payloads. First verified paid confirmation activates immutable 2160-hour window; repeated/reordered success never extends it. Successful positive refunds or disputes revoke monotonically. Preserve revocation tombstones for refund-before-success even when payment IDs are not locally mapped yet. Ignore unrelated product events without touching unrelated app/commerce data.
- Regenerate uses same immutable trip/order only, confirms paid/not revoked/current window, validates/renders BEFORE atomic revision compare-and-swap, rechecks authorization/time inside SQL, preserves old file on every failure. Exactly expiry is denied. Original download remains after expiry unless revoked/deleted. Rate-limit PDF preparation per account before rendering and cap unpurchased files; no public bypass or fake paid switch.
- CLI-create one additive migration first (`supabase migration new`), then develop/test locally with existing PGlite role fixtures. Do not apply remote migrations, commit, deploy, read/write env secrets, modify package files, docs or Task1 files; root owns those. No subagents. Tests must exercise actual SQL, signed events and actual production route exports with controlled HTTP transports; do not call real payment/AI providers in fixtures. Include isolation, attacker params, config, failure/timeout/duplicates/revocation, exact90days and prior-file retention.
- Policy version: `trip-pack-2026-10-24-v1`. Policy text will use owner-selected72-hour voluntary full-refund window, preserving mandatory rights. Root owns policy content and public operator name.

### Task 3 — owner experience and publish
Files: `src/app/[locale]/trip-pack/page.tsx`, pack client/preview; Planner saved-trip link; account order/download list; localized copy; analytics bounded pack events; docs/product decisions.
- [ ] Write failing component tests for unsaved/loading/unsupported, visible990USD price/90days, checkout unavailable, return pending/paid/error, retry, regeneration expired, previous download retained.
- [ ] Implement current saved-trip preview, optional private hotel card, prepare/pay/download workflow and account recovery; no implementation jargon in product UI.
- [ ] Run document/PDF/storage/API/UI tests, relevant original product/i18n/analytics tests, lint/typecheck/build and independent review. Apply reviewed additive migration, deploy safe disabled sales until external gates pass, inspect real browser desktop/mobile/PDF and no-cookie paid download denial.
- [ ] Prepare actual sample/review materials and merchant onboarding steps. User completes terms/KYC/secrets; only then enable and verify real provider test flow/live checkout without charging a real card on the user's behalf.

2026-10-24 Task 3 extension: add bilingual `/terms`, `/privacy`, `/refunds` and public `/trip-pack` product/sample content, footer links and policy consent to checkout. Operator/refund choices in current spec bind copy. Record actual analytics consent/cookie and AI processor behavior; implement a real analytics consent mechanism if claiming opt-in. Capture exact policies accepted per order, preserve private URL hygiene in GA and noindex private orders. A safe production review build may expose public pages with paid sales closed and allowlisted test checkout only. Separate engineering readiness, actual test-mode payment evidence and external merchant approval in final reporting.

## Execution ruling

The owner explicitly approved the product and requested implementation/deployment. Proceed with the approved vertical slice without an extra plan-approval pause. Merchant onboarding is an external prerequisite, not something green fixtures can satisfy. Independent domain/PDF work can progress while provider eligibility is researched.

2026-10-23 execution status: Task 1 is implemented and undergoing review. Task 2/3 remain pending, not completed: official policies do not establish this new AI-assisted travel product's acceptance. Prepare concrete samples and the truthful pre-review brief first, then resume provider-specific purchase integration with an actual eligible test account. Do not manufacture credentials, payment evidence or a production bypass. The current production site is unchanged.

2026-10-24 resumption: Task 1 is reviewed complete per ledger. Owner created Creem test store/product and expressly directs completing test integration, public product and policy pages now. Resume at Task 2; previous deferral is superseded for test development only. Root continues credential setup, research, policy preparation and release; one implementation subagent at a time, followed by scoped independent review.
