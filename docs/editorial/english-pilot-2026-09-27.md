# English field-guide pilot · 2026-09-27

This is the current content architecture and publication record for the English pilot. The older 42-city guide remains available. These three cities demonstrate the richer field-guide model and do not imply that the other 39 cities have the same depth.

## Source of truth and rendering

- `src/content/editorial/en/cities.ts` holds stable IDs and English editorial copy for Beijing, Shanghai and Xi’an. Each edition has 12 monthly notes, 1–4 day pacing, neighbourhood trade-offs, experiences, food with Chinese names, transport, checks, Chinese map queries, routes and sources.
- `src/content/editorial/en/essentials.ts` holds 11 Before China topics and seven bilingual toolkit cards. Each topic carries primary-source links and a fallback action.
- `src/components/travel/CityFieldGuide.tsx` and `src/app/[locale]/essentials/page.tsx` are reusable renderers. Content is not duplicated in the page tree. `src/app/[locale]/destinations/[slug]/page.tsx` chooses a field edition where present and retains the existing guide for other cities.
- `src/lib/travel/planner.ts` reads the same city editions to enrich sightseeing and transfer days with Chinese names, map searches, access and reservation notes, luggage advice and a Plan B. It does not currently compute live travel times or opening-hour-constrained routes.
- `src/lib/travel/photos.json` and `public/travel/` hold real location photographs and per-file attribution; `src/app/[locale]/credits/page.tsx` lists the full credits. New Wikimedia downloads are reproducible through `scripts/fetch-editorial-photos.py`.
- Amap query links open Chinese place searches. The existing server-side Amap API remains scoped to the Beijing imperial daybook; these new city cards do not imply that Amap has verified each exact entrance or route.

## Editorial scope

| Area | Pilot delivered | Still required before a paid Travel OS |
| --- | --- | --- |
| Before China | 11 practical chapters, decision steps, fallbacks and primary links | Passport-specific eligibility flow; date-specific policy refresh; device testing |
| Toolkit | Seven Chinese cards; browser print-to-PDF and screenshot path | True offline web bundle, personal addresses and professionally reviewed allergy cards |
| Destinations | Three 11-chapter editions; 8 Beijing, 9 Shanghai, 8 Xi’an experiences; route order diagrams | Venue-by-venue entrance coordinates, measured route maps, current ticket/price checks, more photos and human field review |
| Plan a trip | Field notes on preview days for pilot cities, group estimate and warning language | Verified per-leg times, daily actual budgets, opening-hour validation, editable bookings and a full illustrated personal book |
| PDFs | English itinerary preview now adds a field-notes page per supported day, using the shared Chinese place query, photograph, access, booking, luggage, Plan B and group allowance; the old full guide layout remains | Full 10-day editorial sample, route maps, exact time and cost verification, payment-ready fulfillment; multilingual PDF intentionally deferred |

The maps on these pages are Amap searches, and the route diagrams show order only. They are not spatial mini-maps. The planner's displayed daily allowance is an average of a broad group estimate, not a daily quotation. Exact trains and ticket times are intentionally absent until confirmed against a live source or the user's booking.

## Publication gate

Run `npm run test:editorial` after editing the source data. It checks chapter completeness, stable route references, image files and license links, and that the planner receives operational notes. `npm run build` runs this check and the i18n check before compiling. A passing test means the data is internally consistent, not that dynamic travel rules have been independently rechecked.

For access or entry claims, prefer the venue operator or government page. At this review the most sensitive examples were cross-checked against the [NIA policy index](https://en.nia.gov.cn/n147418/n147463/index.html), [Beijing Palace Museum visitor guidance](https://english.beijing.gov.cn/12345hotline/faqs/all/202506/t20250620_4117980.html), [Qin mausoleum official ticket guidance](https://www.bmy.com.cn/jingtai/bmyweb/ticketing.html), [Shanghai Museum People's Square](https://www.shanghaimuseum.cn/mu/frontend/pg/en/service/visit-west) and [Shanghai Museum East](https://www.shanghaimuseum.cn/mu/frontend/pg/en/service/visit-east). Recheck them near the travel date. The Shanghai Museum branches have different current exhibition, ticket and reservation rules; the guide treats them as separate experiences.

## Next content production sequence

**Product decision:** Freeze PDF development and export work until the website content is complete. During this phase, edit and verify source content, photographs, Chinese cards, place/route data and web presentation only. Revisit PDF schema, layout and multilingual output together after content production is finished. The existing PDF prototypes remain historical previews, not the acceptance target for new content.

1. Human editor and one foreign first-time visitor should attempt the Beijing, Shanghai and Xi’an cards on a phone, recording ambiguous names, signs, map results and missing fallback details.
2. Record exact entrances and legal pickup points with source, coordinates, reviewed date and confidence; add true small maps only for verified paths.
3. Complete the English web content city by city, with source checks, licensed photography, Chinese cards and useful route details. Translate only reviewed source content; keep IDs, coordinates, source dates and operational facts shared across locales.
4. After the complete content set is approved, return to the personal travel book and PDF design as a separate phase.
