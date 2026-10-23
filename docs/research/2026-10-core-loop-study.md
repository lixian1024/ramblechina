# First-trip planning research — moderator preparation

Status: recruitment not started. The owner confirmed there is no existing participant list. Target: ten real travellers; the blank tracking file is a planning tool and contains no completed or booked sessions. Code and synthetic test submissions are not participation evidence.

## Who to invite

Adults preparing their first or unfamiliar independent visit to China, ideally with an actual city/date question. Include different English confidence, dates, mobility/family needs and planning experience. Begin with the supported Shanghai 1–3 day guest flow. Record unsupported destinations as unmet needs, without pretending the trial supports them. Do not collect passport, payment, booking confirmation or precise accommodation details.

Use owner introductions and moderator-approved community posts. Get a community moderator's permission before posting; follow its rules. The text below is a draft, not evidence that approval was granted. No unsolicited bulk messages, scraped lists or invented names. Individual follow-up requires participant consent and explicit owner authorization for any sending tools.

## Recruitment copy for moderator approval

**English**

Planning your first trip to China and unsure whether a route is practical? Ramble China is inviting travellers to try its early Shanghai planner and discuss one real planning question. The optional research conversation takes about 25–30 minutes; availability is arranged individually. We are testing the product, not you. You can stop at any time. No booking or purchase is required. Request a manual review at https://www.ramblechina.com/en/trip-review. Submitting does not confirm a session or guarantee a response. Please do not post personal travel documents in this community.

**简体中文**

第一次或不熟悉中国自由行，不确定路线是否可行？Ramble China 希望邀请真实旅行者试用早期上海规划工具，讨论一个实际规划问题。自愿研究交流约 25–30 分钟，是否可安排及具体时间另行商定。我们测试的是产品，不是你；你可随时停止，无需预订或购买。人工复核申请：https://www.ramblechina.com/zh/trip-review。提交不代表已确认场次或保证回复，请勿在社区公开旅行证件等个人资料。

## Before a session

1. Verify the person has a real upcoming planning question; assign an internal participant code after consent. Keep contact details in the private intake store, never this repository or analytics.
2. Explain that generated plans can contain unknown hours, reservations and transport assumptions; the session is not verified travel advice or a booking.
3. Ask separately for consent to participate and permission to take anonymous notes. Recording is off by default; ask separately before any recording, explaining storage and deletion. Refusal to recording must not prevent participation.
4. Explain voluntary withdrawal and deletion via service@ramblechina.com with their request number. Do not promise a response deadline that the team has not staffed.
5. Log consent date and permitted use privately. Do not copy addresses or emails to the tracking CSV. Decide retention with the owner before storing any recording; use no recording until agreed.

## Neutral 25–30 minute script

- **0–5 min:** “What are you planning? Which decision feels hardest? Show how you currently work it out.” Do not lead with a feature pitch.
- **5–12 min:** Ask them to open the planner, enter their actual supported requirements, and think aloud. Observe time until a result they want to inspect; distinguish errors, scope limits and uncertainty from successful generation. No fabricated plan for unsupported requirements.
- **12–19 min:** “What would you change first?” Let them phrase the change. Ask what they expected to remain. Observe whether one supported edit works and whether preferences survive. Do not explain away an inconsistency.
- **19–24 min:** “Would this route work for you? What would you check before following it?” Ask them to find route order, sources, unknown facts and reservation limits. Record exact uncertainty as an anonymous quote only with permission.
- **24–28 min:** “If you wanted to return to this plan, what would you do?” Observe explicit save/login recovery; do not pressure them to register or share. If they choose sharing, explain anyone with the link can read it and show revoke.
- **28–30 min:** “Would you use this again? For which real decision? What would stop you?” Ask permission for follow-up separately.

## Evidence and interpretation

Record observed behaviour, separate participant statements, and moderator interpretation. Each technical error is an observation, not participant failure. Use the existing geography, time, preference, accessibility, sourcing, edit consistency and recoverability criteria in EVALS.md. Preserve any bad plan as private redacted evidence for debugging; do not weaken an Eval to count a session.

After ten actual consented sessions, review: who reached generation, wanted an edit, completed it without losing constraints, understood uncertainty, and independently wished to save/return. Record denominators and failures, not just positive quotes. Ten sessions do not establish market demand or travel safety. The owner makes the Product Human Gate decision; engineering cannot declare H1–H5 proven.

## Private intake operations

`/[locale]/trip-review` posts to `/api/research-requests`. The API checks same-origin, JSON and a 12 KB body limit, validates explicit contact consent and a honeypot, then invokes secret-gated `public.ramble_submit_research_request`. IP addresses are HMAC hashed with the server secret. Never add this table to the guide-request dashboard.

The migration requires the foundation growth migration first. `ramble_growth.research_requests` has RLS and no client grants. Only trusted server admission can submit; no client can list requests. Limit: three new requests per opaque IP/day (UTC). Identical ID/content/IP retries return the same receipt even at the limit; changed content or a different IP with an existing ID returns conflict without disclosing content. Storage/config failure returns 503 and retains form input. No contact email, question or request ID is sent to analytics.

Authorized operators can inspect requests using their existing restricted database tooling. Do not grant browser clients or guide administrators extra access. Until an intake owner and follow-up process are staffed, the page makes no response-time promise. Before production, apply the migration through the normal reviewed release, set the root growth gateway secret, and verify anonymous RPC attempts fail and no request content is readable. Local tests use synthetic data only; no live applicant was created by this work.
