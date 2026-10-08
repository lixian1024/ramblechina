# Ramble China

All new website, content, image, PDF, and application work belongs in this project. Do not modify the sibling travelagent project.

Read the relevant Next.js 16 guides in node_modules/next/dist/docs before writing framework code.

Product brief: docs/product-direction.md. Content is draft until verified. Preserve photo attribution and licensing. Do not represent unconfigured payments or unpublished PDFs as available.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Ramble China 产品探索流程（2026-10-07）

当前网站范围为 Destinations、Travel essentials、Plan a trip、Daybook 及多语言版本。不是独立行动助手。开始前读取 PRODUCT.md、DECISIONS.md、TASKS.md、EVALS.md 和 docs/product/locale-matrix.md；旧计划提供实现背景，不自动决定当前队列。保留既有内容核验、许可、诚实付款展示和框架规则。
每轮先说明用户问题、当前假设和验证目标；只完成一个可体验闭环，不同时横向铺开全部模块与语言。Product → Design → Engineering → QA/Critic 为角色切换，不要求建立独立代理。
使用 docs/product/iteration-template.md 记录证据。探索和 Critic 阶段先体验与分析，不修改业务代码。按严重度指出首次使用阻碍，并提出只保留 30% 能力的取舍；不因现有实现而降低标准。
所有关键假设明确标注；mock、估计、未知和过期内容不得伪装核验事实。代码完成、工程检查和用户验证分开记录。
功能、内容、prompt、模型、工具或语言发布变化后执行 EVALS.md 全量产品场景及适用工程检查。任何失败、退化、blocked/not-run 或缺证据不允许标为产品验收通过。基础设施改动验证自身并明确产品评测未运行。
语言发布按“模块 × 语言”提供证据；前缀、词条存在不等于全文已翻译。共享事实、稳定实体、中文现场卡和来源时间应保持一致，未发布版本诚实回退，新增发布扩展评测组合。
开发后更新假设证据、决策、任务与语言矩阵，说明实现、未知项和下一步最值得测试的问题。删除功能优于增加时，依体验证据减少范围。
