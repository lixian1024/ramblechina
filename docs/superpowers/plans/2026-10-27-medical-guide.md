# Medical Guide Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Publish a complete bilingual thematic medical-care guide within the existing website.

**Architecture:** Shared typed en/zh editorial content, one server-rendered page and CSS module, native details/summary for FAQs and a responsive contents index. Existing shared navigation, locale switching and metadata handle discovery.

**Tech Stack:** Installed Next.js 16, React 19, TypeScript, CSS Modules, existing tsx verification scripts.

**Spec:** docs/superpowers/specs/2026-10-27-medical-guide-design.md

## Global Constraints

- 新增 `/en/medical` 和 `/zh/medical`。
- 不增加依赖；不采集病历，不增加预约交易、医疗中介、支付或 AI 治疗建议。
- 双语内容结构、章节 ID 一致；切换语言保留当前章节锚点。
- 六篇文章主题完整覆盖，未经证实的费用/时间/疗效不作为承诺。
- 原旅行 Evals 与 Human Gate 保留。
- 用户已确认按详细方案实施；当前已在隔离工作树，直接执行并保留可审阅 diff，不额外提交或发布。

## Review Focus

- 读者直接从链接进入折叠问答：关键风险和下一步必须在折叠区外可见。
- 预约取消或英文报告无法确认：必须有可执行恢复步骤。
- 医疗筛查被当作消费套餐：不得通过页面暗示普遍适宜。
- 手机新增导航/长来源链接：320px不应横向溢出。
- 切换语言后的章节位置：英文/中文锚点保持一致。

### Task 1: Sourced bilingual editorial content

**Files:** Create `src/content/medical-guide.ts`, `scripts/verify-medical.ts`; modify `package.json`.

**Interfaces:** `medicalSections` contains stable IDs, en/zh labels/intros, FAQ items, action checklists and source IDs; `medicalSources` contains official URLs, bilingual labels and actual checked dates; `medicalOriginals` maps six supplied article titles to section IDs. `medicalText(value, locale)` resolves bilingual strings.

- [x] Add checks for ten expected IDs, parallel complete bilingual content, valid official source references, six original mappings, and missing-report/cancelled-appointment recovery.
- [x] Run `npm run test:medical`; expected missing module assertion before implementation.
- [x] Read official sources; write edited bilingual content with clinical and policy uncertainties visible. Preserve source inventory and article mapping.
- [x] Run `npm run test:medical`; expected PASS.

### Task 2: Page and website integration

**Files:** Create `src/app/[locale]/medical/page.tsx`, `src/components/medical/MedicalGuide.module.css`; modify `src/components/travel/Shell.tsx`, `src/app/[locale]/essentials/page.tsx`, `src/app/sitemap.ts`, `scripts/verify-chinese-website.ts`.

**Interfaces:** Server page consumes Task 1 content, `pageMetadata`, locale routing. Extend verification with `--url=http://localhost:PORT` for actual SSR checks (ten chapters, Q&A, recovery copy, canonical/hreflang, navigation).

- [x] Add failing integration assertions for bilingual sitemap routes; run and observe failure.
- [x] Build responsive page with visible preparation/risk/action lists and collapsible detailed FAQs; mobile collapsible index and desktop persistent index.
- [x] Add Header/Footer and essentials links, metadata and sitemap; update exact sitemap totals for two legitimate new pages (108→110, zh54→55) without weakening exclusions.
- [x] Verify `test:medical`, i18n, Chinese, editorial, SEO, TypeScript, `npm test` and production build.

### Task 3: Browser verification, independent review and product record

**Files:** Update `PRODUCT.md`, `DECISIONS.md`, `TASKS.md`, `EVALS.md`; evidence under ignored `output/medical/`.

**Interfaces:** Uses built page from Task 2. Runtime checks through actual browser and local HTTP, no provider/medical API calls.

- [x] Test en/zh at desktop, 390px and 320px: no overflow, contents/FAQ keyboard operation, language change preserving hash, menu selection and cancel/report recovery content.
- [x] Review implementation with a fresh reviewer against approved design; fix material defects and repeat affected checks.
- [x] Record source-check limits, original-to-theme mapping, technical evidence and remaining reader-validation questions; retain original travel Evals.
- [x] Deliver local preview and summarize implemented behavior, tests, limitations and next useful reader task.

## Execution record

2026-10-27: User approved execution; implemented inline in the existing managed worktree, with no commit/push/deploy. RED→GREEN observed for missing content, missing sitemap discovery and hidden critical recovery guidance. Independent review found one Important issue (critical local-care instruction collapsed), fixed through a failing regression and real SSR verification; suggested coverage gaps also addressed. No deferred implementation findings. Related regressions, original npm test, TypeScript, lint and production build pass. Eight actual bilingual screen-width checks and keyboard/menu/language-anchor flows pass; source verification and professional/user validation limits remain in the workflow record.
