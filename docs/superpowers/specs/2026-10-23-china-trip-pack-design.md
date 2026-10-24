# China Trip Pack — approved product and implementation boundary

Owner approved: Shanghai1–3days, USD9.90 per saved trip, same-trip free re-export for90days, automated payment/download. No per-order human review. The owner is a mainland-China individual without a Stripe account and asked to evaluate Creem/Waffo/Dodo.

## User value and scope

Turn the current saved itinerary into a mobile-readable, printable private PDF: overview, daily sequence/time suggestions, independently sourced Chinese destination cards, online map search links/QR, reservation checklist, sources/review dates and optional user-entered hotel return card. Generate from saved choices; never invent a new route on export. File generation date is separate from fact review date. Known closure/date conflicts and unsupported cities/durations block payment; ordinary unknown facts remain explicit. First version supports a curated Shanghai venue set; unsupported stops are reported, never dropped or silently substituted.

For the intended in-China use, destination QR codes use the official Amap URI keyword search with Shanghai city scope; a Google search link can be an alternative. These are online name searches, not verified routing, entrances or coordinates. No provider API key is embedded. Official interface reviewed: https://lbs.amap.com/api/uri-api/guide/search/search (2026-10-23).

The package is a digital planning artifact. It does not include actual bookings, tickets, visa advice, human checking, live navigation or a promise of verified entry. No model/provider call is necessary to render/re-download it. Existing free planning/sharing/research promises remain.

## Purchase terms

- Fixed base price990USD cents; checkout shows applicable tax/final total. No discounts or client-defined price.
- Purchase binds verified account + saved trip. Ninety consecutive24-hour days from the first confirmed payment, never renewed by webhook retries. Re-export within that period for the same trip is free; new trips require purchase. Date/stop edits within supported scope remain the same trip.
- Existing purchased version remains downloadable after the re-export window unless refunded/disputed/deleted. Previously downloaded files remain the purchaser's copies. A new paid purchase can start a new window after expiry.
- Show a concrete preview and known missing information before payment. Build and validate the PDF before checkout. On regeneration failure keep the previous purchased file. A failed payment or browser success redirect never grants access.
- Private files are account-only and excluded from public itinerary shares/search/analytics. Hotel details are optional and explicitly user-entered; do not export conversation, personalized reasons or supplier photos/geometry/reviews/addresses copied from Google.

## Payment onboarding boundary

Creem is the first candidate because its official documentation explicitly describes mainland individual payout through Alipay. Dodo also supports China individuals, but exact bank/document route and product classification need confirmation. Waffo individual path is Pancake, not its enterprise merchant offering. All require actual KYC and review; travel/AI/ebook policy overlap means this specific product needs written classification approval. Do not claim approved, create an account, accept merchant terms, submit identity documents or send review emails without the owner doing/authorizing those actions. No fake live purchases. Until approved/configured, public pages say sales unavailable and checkout fails closed; preview/sample work normally. Existing Stripe legacy commerce remains separate.

## Architecture

Whitelisted PackDocument v1 from current owner-only saved snapshot + independently researched Shanghai catalog. Deterministic PDF renderer with embedded Chinese font and automatic page flow; no provider tiles/route geometry. Private commerce tables/RPC use existing server gateway secret, verified owner identity and no service-role browser key. Store a bounded validated PDF and its document/hash per order, atomically replace only on successful authorized re-export. Payment adapter uses only current official provider contract, raw-body signatures, authoritative order/product/amount/currency validation, durable event dedupe and monotonic refund/dispute revocation. Local tests use explicit controlled payment transports, never production payment bypasses.

## Success and unknowns

Engineering gate: unsupported/missing input; date/closure; long/bilingual text; PDF rendering; two-owner isolation; no unpaid access; duplicate checkout/webhooks; refunded-first/paid-later; exact90-day edge; failed regeneration preserves prior file; payment return interrupted; enabled/configuration false. Existing product Evals and Human Gate remain unchanged. Actual merchant approval, live payment/payout, willingness to pay, per-order cost and real travel use remain unknown until separately verified.

## 2026-10-24 review-readiness continuation

Owner now explicitly requests completing product/policy pages and the real Creem test payment/download flow while awaiting eligibility feedback. The Creem test store and fixed USD9.90 one-time product already exist. Continue provider-specific development against this actual test resource; merchant approval remains required for live sales. This supersedes the previous implementation pause, not the live-sales gate.

First release supports `RAMBLE_PACK_MODE=off|test` only; no live checkout path. Test API/product/webhook settings use separate `CREEM_TEST_*` names, test orders are explicitly marked and never become live entitlements. Server-configured `RAMBLE_PACK_TESTER_IDS` restrict checkout and regeneration to approved, authenticated account UUIDs; public pages/samples remain available without those credentials. Purchase/download identity is always the saved-trip owner, never a submitted email or browser-return query.

Owner's policy choice: voluntary full-refund requests within 72 hours of confirmed payment, including after downloading. Ordinary change-of-mind requests after that period are excluded. Duplicate charges, failure to deliver, defects/misdescription and applicable mandatory consumer rights remain available; do not claim the 72-hour limit cancels statutory rights or automatically waive digital-content withdrawal rights. A confirmed refund/dispute revokes subsequent download/re-export access; already downloaded files cannot be remotely recalled. Policy operator is Jiang Xianli trading as Ramble China, China, contact service@ramblechina.com; no private home address/identity document is published.

Policies must describe actual first-party/auth/analytics/AI/maps/payment data flows, cross-border processing and practical deletion/contact routes. No unsupported promises about consent, training exclusion, retention schedules or certifications. Review existing analytics consent before publication; do not claim opt-in unless code implements it. The public product page links terms/privacy/refunds and a concrete sample, states coverage and unknowns, and clearly shows sales are not open. Testers see an explicitly labelled test flow.
