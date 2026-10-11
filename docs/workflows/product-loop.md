# Product Loop — Human-in-the-loop product discovery

## Purpose

Product Loop 不是 backlog runner。它负责验证：**我们是不是在解决一个值得解决的问题。**

## Standard cycle

1. **Hypothesis** — 在 experiment 文档写清用户、场景、假设、成功信号；
2. **Scope** — 把 experiment 映射到最小 Tasks；
3. **Engineering Loop** — 自动实现并逼近验收条件；
4. **Evidence packet** — 聚合 tests / Evals / Critic / 未知；
5. **Human experience** — 人亲自走一次核心路径；
6. **Human Gate** — `approve / revise / pivot / stop`；
7. **Update product truth** — 必要时更新 PRODUCT / DECISIONS / TASKS / EVALS。

## Gate rule

没有 Human Gate，experiment 永远只能是 `engineering_passed`，不能叫 `validated`。

## When to approve

不是“没有 bug”，而是至少能回答：

- 核心用户问题确实被更好地解决；
- 用户路径比替代方式有明显价值；
- 主要信任风险可接受；
- 下一轮投入有清楚理由。

## When to revise

产品假设仍值得测试，但证据指出了一个可被工程修复的具体缺口。

## When to pivot

问题本身、目标用户、核心路径或价值假设发生变化。Pivot 后先更新产品文档，不允许 Engineering Loop 自己猜新方向。
