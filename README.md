# China Travel × Codex Product Discovery Infrastructure

这是一个为“面向海外游客的中国旅行规划产品”准备的 Codex 开发基础设施。

它的目标不是让 Codex 更快堆功能，而是强制每一轮开发都回答：

> 我们正在验证哪个用户问题？结果有没有让产品假设变得更清楚？

从 [`START_HERE.md`](START_HERE.md) 开始。

核心文件：

- `AGENTS.md` — Codex 长期工作协议
- `PRODUCT.md` — 当前产品认知与假设
- `DECISIONS.md` — 轻量决策记录
- `TASKS.md` — Now / Next / Later 可验收任务
- `EVALS.md` — 产品行为评测集
- `docs/roles/` — Product / Design / Engineering / Critic 四角色
- `docs/workflows/product-loop.md` — 标准产品探索循环
- `docs/experiments/001-core-trip-loop.md` — 第一轮上海核心体验实验
- `evals/cases.json` — 机器可读 Eval 索引

## Loop Engine

本 starter kit 已包含可执行的双循环：

- `Product Loop`：Human Gate 控制产品方向；
- `Engineering Loop`：`TASKS + EVALS + Codex` 自动实现、验证、批评和重试。

从 `START_HERE.md` 和 `LOOP.md` 开始。


### Google Maps migration

Planner and destinations now use Google Maps. Places, nearby dining, photos, walking/driving and static previews use Google server APIs; only Amap weather and transit remain. Configure **both** the website-restricted `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` and a separate `GOOGLE_MAPS_SERVER_API_KEY` for Places API (New), Routes API and Maps Static API. Keep the Amap Web Service key for the two retained services. [Configuration, migration differences and pending live checks](docs/workflows/google-maps-migration.md).

Run `npm run test:map-providers` for controlled provider/coordinate/failure contracts; run `node --import tsx scripts/check-google-access.ts` for a small live permission probe. Neither substitutes for the existing product Evals.


## 1.0.0 版本快照（2026-10-11）

用户指定将当前代码归档为 1.0；包版本为 `1.0.0`，Git 标签为 `v1.0.0`。此编号标记代码快照，产品仍处于 MVP 探索阶段，既有 Human Gate 与待验证事项保留。包含英文网站、目的地与行前准备、行程工作区、Google/高德混合地图、地点身份与照片筛选、Supabase 账户/行程保存，以及本地导游咨询。

本轮验证：生产构建、ESLint 与 21 项受控检查通过，包含 TypeScript、账户/RLS/持久保存、供应商、地点身份、照片筛选、日历、六组上海回归及评测基础设施。未重复付费实时旅行生成或真实账户登录验收。

已知检查失败（保留原断言）：

- `python3 scripts/test_loop_engine.py`：27 个测试中 2 个报错，原因是 `EVALS.md` 已有 E-016，而 `evals/cases.json` 尚未收录；自动 Loop 的校验门槛未通过。
- `python3 scripts/validate-eval-cases.py`：旧校验器要求 `name/type/priority/hard_constraints`，当前索引使用 `title/mode/tags`，两者格式未同步。

环境密钥、私有运行状态与新增 `output/` 验证产物保留在本地；已有跟踪的 PDF 样本保留历史。使用前按 `.env.example` 配置环境，按现有 Supabase 迁移说明准备数据库。下一步优先同步机器索引与校验器并重新验证 Loop，再完成真实账户和旅行核心闭环验收。
