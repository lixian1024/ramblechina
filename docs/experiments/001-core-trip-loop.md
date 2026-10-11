# Experiment 001 — Shanghai Core Trip Loop

## User problem

第一次来上海的海外游客知道自己“喜欢美食和建筑”，但不知道如何把偏好变成一份真实走得通、而且可以继续修改的 3 日计划。

## Current assumption

用户真正想要的不是更多景点列表，而是：

1. 第一版足够合理；
2. 可以一句话修改；
3. 修改不会破坏已经满意的部分；
4. 用户能看懂路线为什么合理。

## What we are testing

> “生成 → 局部修改 → 路线解释”是否足以构成海外游客愿意继续使用的第一核心体验？

## Playable slice

### Step A — Generate

输入：

> First time in Shanghai. 3 days. I love food and architecture.

输出：

- 3 天行程；
- 每天主题 / 地理区域；
- 主要停留点；
- 餐饮时间窗口；
- 关键交通 / 开放状态；
- 为什么这样排。

### Step B — Modify

用户：

> No museums on day 2.

系统：

- 只重排 Day 2；
- 保留 Day 1 / 3；
- 继续遵从 food + architecture；
- 显示“改了什么”。

### Step C — Route understanding

用户查看 Day 2：

- 地点顺序；
- 相邻移动逻辑；
- 关键时间 / 风险；
- 替代原因。

## In scope

- 上海；
- 3 日；
- 美食 / 建筑偏好；
- museum 排除修改；
- 一天的路线解释。

## Out of scope

- 登录；
- 支付；
- 机酒预订；
- 全国城市；
- 复杂多人协同；
- 完整实时聊天助手。

## Success signals

在 5–10 个真实或模拟用户测试中重点观察：

- 用户是否无需解释就知道如何开始；
- 第一版是否出现“这基本能用”的反应；
- 用户是否自然尝试修改，而不是重填表单；
- 修改后是否能指出“系统保留了我之前喜欢的东西”；
- 路线解释是否让用户更愿意执行；
- 是否出现“我旅行当天也会再打开”的理由。

## Failure signals

- 用户把结果当灵感清单而不是行程；
- 大量时间花在纠正明显错误；
- 修改后整份行程随机变化；
- 地图 / 路线信息没有增加信任；
- 用户更想要的是“实时下一步助手”而不是提前规划。

## Evals

必跑：E-001、E-002、E-003、E-004、E-007、E-009、E-014。

## Observations to capture

- 用户第一次犹豫的位置；
- 用户最先想修改什么；
- 用户问“真的吗 / 确定吗”的地方；
- 哪个信息用户完全不看；
- 用户愿意保留的最小 30% 功能；
- 用户第二次打开的触发时刻。

## Decision after experiment

- Confirmed：进入真实数据与稳定性强化；
- Refined：缩小 / 改变核心用户路径；
- Rejected：停止把 itinerary-first 当核心入口；
- Unknown：重新设计更有区分度的测试。

## Loop Engine mapping

Machine control: `loop/experiments.json`

Engineering tasks: `T-001 → T-002 → T-003 → T-004`

当四个 Task 的 deterministic verification 与 relevant Evals 都通过后，Engine 必须停止并生成 Human Gate evidence。实验是否成立只能由 Human Gate 决定。

