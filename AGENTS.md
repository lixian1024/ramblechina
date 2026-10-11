# AGENTS.md — China Travel Product Operating Contract

> 本文件是 Codex 在本仓库内工作的长期约束。目标不是“尽快把功能做全”，而是通过小步、可验证的产品实验逐步发现真正有价值的产品。

## 0. Product mission

为第一次或不熟悉中国的海外游客，提供**真实可执行、容易理解、可随时修改**的中国旅行规划与旅途中决策支持。

当前阶段：产品探索 / MVP 验证。

## 1. 默认工作模式

每次收到产品或开发任务时，按以下顺序工作：

1. 先读 `PRODUCT.md`、`DECISIONS.md`、`TASKS.md`、`EVALS.md`。
2. 判断任务对应的用户问题，而不是直接把用户原话当实现规格。
3. 明确当前假设与本次要验证的内容。
4. 优先完成一个纵向、可体验闭环；禁止为了“看起来完整”同时铺很多半成品模块。
5. 实现后运行相关测试与 Evals。
6. 更新必要的产品文档与决策记录。
7. 给出剩余未知与下一步最值得验证的问题。

## 2. 开发前必须输出

在修改代码前，用简短格式说明：

```text
用户问题：
当前假设：
本次验证：
计划修改：
成功标准：
```

如果需求和当前产品方向冲突，必须指出冲突，不得机械执行。

## 3. 开发后必须输出

```text
实现了什么：
验证结果：
Evals / tests：
仍未知：
产品文档变化：
下一步建议：
```

不得用“已完成”掩盖尚未验证的产品假设。

## 4. 产品原则

- 优先解决真实用户问题，不以功能数量衡量进度。
- 早期允许 UI、账户、支付、后台等外围能力使用假数据或简化实现，但**核心行程结果不得伪造真实性**。
- 优先纵向切片：输入需求 → 得到行程 → 修改 → 重规划 → 查看路线 / 详情。
- 删除错误功能优先于维护历史代码。
- 可以明确反对不合理需求，并给出更小的可验证方案。
- 所有关键产品假设必须在 `PRODUCT.md` 或实验文档中可见。
- 所有重要取舍必须写入 `DECISIONS.md`。
- 不得未经记录直接推翻已有决策；需要改变时，新增决策记录并说明原因。

## 5. 行程规划的最低质量门槛

涉及 itinerary / recommendation / replanning 的改动，必须至少检查：

- 地理合理性：同一天地点应形成合理空间顺序。
- 时间可行性：交通、停留、吃饭、开闭馆时间不能互相冲突。
- 偏好遵从：明确说“不喜欢”的类别不得偷偷加入。
- 人群适配：儿童、老人、行动能力、饮食限制应改变节奏与推荐。
- 数据可信度：营业时间、临时关闭、预约要求等无法确认时应显示不确定性，不得装作已验证。
- 修改一致性：用户改一项，不应无故推翻其他已确认偏好。
- 解释性：关键安排需要有“为什么这样排”。
- 失败可恢复：数据缺失、API 失败时不能生成看似确定但实际编造的结果。

## 6. Eval gate

任何会改变以下逻辑的改动，都要回归 `EVALS.md` 中相关案例：

- 行程生成
- 景点排序
- 路线规划
- 开放时间过滤
- 偏好 / 约束解析
- 行程修改 / 重规划
- 推荐理由
- 数据回退策略

如果已有 Eval 退化：

1. 不得默默接受；
2. 说明退化原因；
3. 修复或明确记录为有意变更；
4. 有意变更时更新 `DECISIONS.md` 和对应 Eval。

## 7. 四种工作角色

根据任务显式切换角色，具体规则见：

- `docs/roles/product.md`
- `docs/roles/design.md`
- `docs/roles/engineering.md`
- `docs/roles/critic.md`

同一轮可依次扮演多个角色，但不要把“提出产品方案”和“为已有实现辩护”混在一起。

## 8. 禁止事项

- 禁止先搭完整用户系统、后台、支付、消息系统，再验证核心体验。
- 禁止用占位卡片 / Lorem ipsum / 假 AI 结果伪装产品成熟度。
- 禁止因为已有代码很多，就默认现有产品方向正确。
- 禁止把“页面能打开”视为产品验证成功。
- 禁止只写 happy path；至少覆盖一个数据缺失或约束冲突场景。
- 禁止使用无法追溯来源的数据做确定性陈述。

## 9. 默认的下一步选择规则

当有多个任务时，优先级按以下顺序：

1. 阻止用户完成核心闭环的问题；
2. 影响结果可信度的问题；
3. 影响结果可执行性的问题；
4. 影响用户是否理解下一步的问题；
5. 提升速度与便利性；
6. 视觉 polish；
7. 非核心扩展能力。

## 10. Loop Engine contract

当由 `scripts/loop_engine.py` 启动时：

- 当前 Task 与 relevant Evals 是本轮唯一工作边界；
- deterministic verification 是 hard gate，不能由语言解释覆盖；
- Critic 必须独立判断，不为实现辩护；
- Engineering Loop 无权宣布产品假设成立；
- experiment tasks 全绿后必须停止在 Product Human Gate；
- 需要改变 PRODUCT / DECISIONS / EVALS 产品语义时返回 `blocked / needs_human`，不得自行改标准；
- 不得通过删除测试、降低断言、改写 Eval 来制造绿色结果。

详见 `LOOP.md`。


<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
