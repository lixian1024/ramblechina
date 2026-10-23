# First-visit growth loop

The owner authorized the first seven recommendations: search ownership/submission, GA4 funnel, metadata/OG, guest trial, ten-traveller research, two problem-led guides, and revocable itinerary sharing. Preserve the existing verified itinerary engine, providers, booking/date constraints and account isolation. Video, email-for-PDF, influencer/affiliate work and paid products are outside this change.

## Product boundary

Ship one usable flow: discover a sourced guide → open planner → generate a bounded guest trip → revise once → explicitly save through the existing account flow → share a deliberately published read-only version → revoke. Analytics observe meaningful successes and failures without user text or private identifiers. Search indexing and real traveller participation are external outcomes, not checkboxes inferred from code.

## Trial and costs

Use the existing Supabase project, not a new account system. A server-issued HttpOnly token identifies a trial; PostgreSQL atomically enforces shared, persistent quotas. Default global 30 AI requests/day, guest one generation and one revision, authenticated 10 requests/day, IP 6/day and global 2 concurrent reservations. Failed/aborted paid attempts still consume admission. Short leases recover abandoned concurrency. No in-memory or client-only enforcement. Quota storage/configuration failure fails closed before model/provider calls. Quota values are adjustable server configuration, not a promise of an exact currency bill.

The public trial covers Shanghai, one to three days; unsupported cities/durations return an explicit explanation rather than silently changing requirements. Guest revisions must continue the server-held successful result. Existing signed-in planning remains 1–10 days and retains all original Evals. A guest can see source/unknown states and complete one real modification. Saving prompts the existing login; an explicit temporary draft handoff survives auth, is cleared only after a confirmed account save, and never becomes a way to fetch another person's trip. The D-025/D-027 guest boundary is intentionally updated in a new decision.

## Sharing

Only an authenticated owner can publish/revoke a saved trip. Generate a high-entropy capability token. Publish a sanitized snapshot of itinerary dates/cities/stop names/durations/reasons/uncertainty; omit conversation, traveller identity, hotel/address/booking notes and provider photos/temporary data. The confirmation explains anyone with the link can read the published itinerary. No indexing/sitemap inclusion. A shared view is read-only, shows snapshot publication time and original uncertainty, and does not imply revalidated venue facts. Revocation returns unavailable; do not fetch paid providers for every public viewer.

## Acquisition and research

Reuse GA4 G-QBCYPGN6SB. Events distinguish start, successful generation, successful first edit, signup, successful save, failures and share actions. No raw text, email, itinerary UUID or share token in events. OAuth signup is measured after identity confirmation, never from a mere click or an unverified signup response. Track current authenticated flow and subsequent guest conversion honestly.

Repair English/Chinese homepage and city titles/canonical/OG/Twitter previews with real local imagery and credits. Existing city identities and translations remain shared. Keep robots/sitemap accurate and offer optional verification environment values; actually verify Search Console/Bing with the owner's signed-in accounts if accessible. Record submission/coverage evidence separately from crawlability.

Publish two genuinely useful English/Chinese problem-led guides using current official sources, explicit checked dates, limitations, and planner links; keep existing content facts unchanged. No fake example itinerary or claims that FAQ schema guarantees ranking. Research intake offers manual itinerary review through an explicit request, with realistic response wording, private persistence and recovery. Ten completed real sessions require actual travellers; prepare recruitment copy, consent/observation guide and a blank tracking template, without invented participants or unsolicited mass messages.

## Acceptance

Meaningful tests cover quotas across clients/concurrency/retry/storage failure; trial constraint rejection and continuation; draft auth/save failure recovery; RLS owner isolation and token revocation/redaction; genuine analytics success vs abort/error; guide source dates and metadata; real HTTP and desktop/mobile trial/share/intake flows. Run existing trip calendar/requirements/provider/account/language Evals without reducing assertions. Deploy only after deterministic gates pass; record missing external permissions and live-only outcomes explicitly.
