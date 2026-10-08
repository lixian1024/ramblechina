# Verification · 2026-09-25

## Functional evidence
- Next.js production build passed; TypeScript and ESLint passed.
- npm audit: zero vulnerabilities after replacing the inherited PostCSS 8.5.12 override with 8.5.28.
- scripts/verify.ts passed: exact trip length, date validation, unknown cities/sights, full-day sight separation, preference ranking, 42 image records, API errors, anonymous paid-download refusal, sample-only endpoint refusal of full-download requests, and actual PDF bytes.
- IAB browser: homepage search for Shanghai returned one city; saving it appeared on Saved; test save was removed afterwards. Seven-day Beijing/Shanghai plan generated all seven days and one dedicated transfer day. Mobile menu and form checked.
- A fresh IAB tab reported no console errors and no failed loaded images. Older dev-tab logs contained transient errors while npm replaced PostCSS; restarting the dev server and checking a fresh tab resolved them.
- PDF outputs: sample 9 pages; complete editorial draft 88 pages; itinerary preview 4 pages. All text bounding boxes checked, zero characters outside pages. Chinese labels extracted correctly. Rendered PDF pages inspected; fixed variable-font missing glyphs by using static Noto CJK, and replaced letterboxing with proportionate clipping.
- Stripe real payment/refund end-to-end is NOT tested: no merchant credentials supplied. Sales remain disabled. Webhook/order recovery is not implemented.

## Visual fidelity ledger
Reference: ../design/travel-home-concept.png. Browser captures: home-final.png, home-native.png, home-mobile.png, planner-mobile.png. IAB native/reference viewport 1024×1536, desktop 1440×1000, mobile 390×844; also inspected default desktop 1280px. Screenshots read with view_image alongside the concept.

| Comparison | Evidence and resolution |
|---|---|
| Structure | Preserved simple header → landscape hero → three chapter links → destination photography → practical links → dark guide band. |
| Palette | Cream #f8f7f2, forest #203d33, restrained gray-green body copy; no unrelated accent gradients. |
| Typography | Georgia editorial headings, explicit sans-serif controls and captions. Adjusted hero spacing to keep search clear of the image edge at intermediate desktop width. |
| Photos | Genuine licensed photos replace generated scenic illustrations. Replaced a wrongly selected Hong Kong historical map with a night skyline; Chengdu photo now shows pandas at the actual breeding base. |
| Cards/spacing | Kept four destination columns on desktop and two on mobile; captions and stay durations sit below images for readability. These add height compared with the reference. |
| Navigation | Search, region filters and bookmarks work. Mobile nav includes Saved; medium-width header keeps its bookmark icon. |
| Guide band | Uses an editorial image treatment instead of a fabricated physical book mockup, because the product is a PDF. Intentional deviation. |
| Copy | Hero headline and main section titles preserved. User-authorized China Unfold replaces China, slowly. Search placeholder/button, destination captions, functional region labels and availability notices intentionally reflect implemented content. No unaccounted first-screen claims. |
| Responsive | 390px homepage and planner have no horizontal document overflow; desktop and native-width screenshot checked. Narrow-screen hero text was reduced to 38px to preserve two readable lines, and the redundant header bookmark moved into the mobile menu. Temporary viewport overrides reset. |

The editorial system and interaction layout were verified against the reference. Photographic composition, brand, card captions, regional filters and guide artwork are intentional differences; this is not a pixel-identical copy. No known clipped primary content remains.

## Remaining product work
Deepen and verify content, provide real route maps, localize beyond English, add persistent orders/recovery and test live-provider checkout before commercial release. No claim that the editorial draft surpasses Lonely Planet has been made.
