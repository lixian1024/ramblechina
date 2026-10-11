# Eval Harness Evolution

当前仓库没有绑定具体技术栈，因此先把产品 Evals 定义为**稳定的行为规格**，不要为了自动化而过早锁定框架。

## 现在怎么用

1. `EVALS.md` 是人可读的规范；
2. `evals/cases.json` 是机器可读的案例索引；
3. `scripts/validate-eval-cases.py` 只检查案例数据完整性，不假装已经验证产品行为；
4. 每次 planner / replan 改动，先人工跑相关案例并记录结果。

## 以后怎么自动化

当产品有稳定的 itinerary API / function 后，建立类似：

```text
input -> planner -> normalized itinerary -> deterministic checks -> LLM judge / human review
```

### 适合程序规则检查

- 城市一致性；
- 每天主要 POI 数量；
- 时间窗口重叠；
- 已知闭馆冲突；
- 用户 hard constraint；
- 修改前后未受影响日期的 diff；
- verified / unverified / conflict 字段完整性。

### 仍适合 LLM / 人工判断

- 行程是否“太赶”；
- 推荐是否真正符合建筑 / 美食偏好；
- 安排理由是否有帮助；
- 替代方案是否自然；
- 用户是否容易理解下一步。

## 重要原则

自动化 Eval 的目标是捕捉回归，不是把所有产品价值压成一个总分。
