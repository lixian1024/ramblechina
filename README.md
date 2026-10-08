# Ramble China

Independent illustrated China travel website. All work lives in this project; the sibling travelagent project is untouched.

## Run

```sh
npm ci
npm run dev -- --port 3001
```

Open http://localhost:3001 (redirects to a published language), or choose `/en`, `/ko` or `/zh` directly. Korean and Simplified Chinese currently cover the homepage and Beijing daybook; other pages use the English edition. No API keys are needed for destination browsing, itinerary generation or preview PDFs.

## Language architecture

A single `[locale]` route tree and shared components serve English, Korean and the Simplified Chinese pilot. Stable place IDs, Chinese on-site cards and verified facts are shared; English, Korean and Chinese editorial copy live separately in `src/content/locales/`. `src/content/resolve-beijing.ts` feeds the same localized view to the Beijing page and PDF. Language publication is explicit: `src/i18n/publication.ts` and `src/content/publication-manifest.json`. The eleven planned languages are listed in `src/i18n/locales.ts`; `en`, `ko` and `zh` are public for the homepage and Beijing sample. Chinese PDF is deferred and the Chinese page offers PNG pocket cards only. Run `npm run test:i18n` after content changes; `npm run build` enforces its fact-fingerprint check. See `docs/multilingual-architecture.md` for the full design and rollout.

## Implemented

- Responsive editorial homepage, searchable/filterable 42-city directory, detail pages and browser-local saved places. Each city now includes 8 sights/areas, 3 food introductions, 2 accommodation areas, arrival/local/excursion transport notes, route groupings and source links.
- 86 licensed photographs (42 destination images and 44 sight images), attribution and license links.
- An English Before China guide with 11 practical chapters and seven printable Chinese toolkit cards. Three richer city field editions (Beijing, Shanghai and Xi’an) share one content schema and renderer; the other 39 cities retain the earlier guide. See `docs/editorial/english-pilot-2026-09-27.md`.
- Server-validated itinerary builder: days, people, CNY group budget, date window, city order, preferences and selected sights. Dedicated intercity days and full-day excursions, pacing and budget warnings. This is a curated rules-based planner, not an LLM integration or live booking service.
- Server-generated illustrated PDF: expanded three-city guide sample, complete 42-city editorial draft, and an itinerary booklet. Noto Sans CJK Chinese place labels, linked contents, map links and photo credits.
- Stripe-hosted Checkout and payment-verified downloads, browser-bound buyer token, price/product verification and refund rejection. Sales default OFF.

## Checks and editorial exports

```sh
npm run build
npm run lint
npm test                 # requires local server on port 3001 (or TEST_ORIGIN)
npm run export:sample
npm run export:pdf
```

Exports are under output/pdf. These local editorial exports are not public download routes. Public /api/pdf only returns samples; /api/download requires verified payment.

## Payments and release readiness

Copy .env.example to .env.local and configure a supported Stripe merchant account, one-time Price IDs, and the exact NEXT_PUBLIC_APP_URL origin. Prices are read from Stripe. CONTENT_REVIEWED must remain false until the content, fulfillment and checkout have been reviewed. A configured test account is still required for payment success/refund end-to-end testing.

Current entitlement delivery is synchronous, same-browser download verification. Before commercial launch, add durable order records, signed webhook processing, email recovery/download access across browsers, and policies for refunds and customer support. STRIPE_WEBHOOK_SECRET is reserved; no webhook handler is implemented yet. Do not turn on sales solely because API keys exist.

## Editorial status

English working version. Other requested languages and native iOS are not implemented. The three English field editions are deeper editorial drafts; the other 39 cities remain introductions, not a professionally researched replacement for a comprehensive guidebook. Opening hours, prices, station-to-station timing and reservation availability are not live data. The full PDF needs deeper editorial content and location-specific route maps before sale. Current planner follows the user's city order; it does not optimize a rail/flight network.

See docs/product-direction.md and docs/qa/verification.md. The visual reference is docs/design/travel-home-concept.png; the old brand in that concept was updated to Ramble China; the project directory remains `china-unfold`.

## Assets

Photo source/license records: src/lib/travel/photos.json and public/travel/*.json. Each image retains its individual license. Images are cropped for web/PDF display. Font source: https://github.com/notofonts/noto-cjk (Noto Sans CJK SC, SIL Open Font License, public/fonts/OFL.txt). Do not run seed-travel.py over edited content without reviewing the resulting changes.

## Expanded city guides

`src/lib/travel/guides.json` contains original English planning notes for all 42 destinations. Each chapter supplies five additional sights (eight total with the original selection), three food notes, two accommodation areas, three transport sections, and two route groupings. `scripts/expand-city-guides.py` is the explicit editorial source generator; it does not automatically publish scraped content.

The information structure draws on TravelChinaGuide's city / attractions / dining / transport sections and the first-visit questions raised by The Historian Traveller. Per-city references and access dates are shown on the website and in the PDF. Raw research is retained under `docs/research/`; it is not imported by the application. Referenced pages are secondary sources, not a venue-by-venue operational verification. Do not market this collection as exhaustive or fully verified.

Photographs are independently sourced from Wikimedia with author and licence records. Additional chapter photographs are mapped to actual subjects in `data.ts`; unsuitable or ambiguous candidates were excluded. The PDF uses measured text blocks and automatic continuation pages, with live page-number links in its contents.

## 当前开发基础：四模块多语言网站（2026-10-07）

Ramble China 包含 Destinations、Travel essentials、Plan a trip 和 Daybook；多语言贯穿四模块。先读 [PRODUCT.md](PRODUCT.md)、[DECISIONS.md](DECISIONS.md)、[TASKS.md](TASKS.md)、[EVALS.md](EVALS.md) 与 [模块语言矩阵](docs/product/locale-matrix.md)。每轮使用 [探索记录模板](docs/product/iteration-template.md)，按一个完整用户任务迭代。

```sh
npm run check:product      # 六组现有本地工程/内容/模拟服务检查
npm run eval:validate      # 产品场景定义检查
npm run test:eval-infra    # 报告门槛自身测试
npm run eval:init -- /tmp/ramble-run.json
# 按场景实际操作，填写逐项结果及语言/模块 coverage 证据
npm run eval:gate -- /tmp/ramble-run.json
```

报告门槛不自动操作浏览器或证明证据真实，真实用户体验仍需执行。en/ko/zh 是当前语言前缀，模块发布范围不同，其他八种语言仍在规划中。用户给出的本地地址使用 3000；开发命令可用 `npm run dev -- --port 3000`，服务器测试对应 `TEST_ORIGIN=http://localhost:3000 npm test`。
