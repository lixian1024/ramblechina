# LOOP.md — Product Loop + Engineering Loop

这套系统把“产品发现”和“工程收敛”分成两个不同的循环。

```text
Human / Product judgment
        │
        ▼
┌──────────────────────────────┐
│        PRODUCT LOOP          │
│ Hypothesis → Experiment      │
│      ↑          ↓            │
│ Revise ← Human Gate ← Evidence│
└──────────────┬───────────────┘
               │ approved experiment scope
               ▼
┌──────────────────────────────┐
│      ENGINEERING LOOP        │
│ Task → Codex → Verify        │
│  ↑                ↓          │
│  └── Fix ← Critic / Evals    │
│                 ↓ pass       │
│              Next task       │
└──────────────────────────────┘
```

## 1. 外层 Product Loop：人负责改变目标

Product Loop 回答的是：**这个产品假设值不值得继续？**

它不因为测试通过就自动宣布产品成功。Engineering Loop 只负责把实验做成、把可验证证据整理好，随后必须停在 Human Gate。

Human Gate 只有四种正式决策：

- `approve`：证据足够，当前假设继续成立；
- `revise`：方向大体正确，但需要带着明确反馈重新进入 Engineering Loop；
- `pivot`：假设或核心路径需要改变；暂停自动工程循环，先更新 `PRODUCT.md / DECISIONS.md / TASKS.md / experiment`；
- `stop`：停止当前实验。

### Product Loop 状态

`ready → engineering → awaiting_human → approved/revise/pivoted/stopped`

### Human Gate 的输入

引擎会生成 `.loop/evidence/<experiment>-gate.md`，至少包含：

- 当前假设；
- 实际完成的 Tasks；
- 测试与 Eval 证据；
- Critic 仍然担心什么；
- 哪些东西仍然没有被证明；
- 建议你亲自体验的路径。

## 2. 内层 Engineering Loop：机器负责逼近目标

Engineering Loop 回答的是：**在不改变产品目标的前提下，怎样让实现通过当前 Gate？**

每轮只处理一个 Task：

```text
从 TASKS.md 读取当前 task
        ↓
提取该 task 关联的 EVALS
        ↓
Codex 实现 / 修复
        ↓
Deterministic verification
        ↓
Codex Critic 独立检查
        ↓
Gate pass?
   ├─ NO → 把具体 delta 带入下一轮
   └─ YES → task passed → 下一个 task
```

### Engineering Loop 自动停止条件

以下任何一个发生都会停止自动重试并升级给人：

1. 当前 Task 通过；
2. 达到 `max_attempts_per_task`；
3. 同一失败指纹连续出现 `same_failure_limit` 次；
4. Critic 返回 `blocked` 或 `needs_human`；
5. Codex CLI / 测试环境本身不可用；
6. 需要产品取舍而不是代码修复；
7. 当前 experiment 全部 tasks 通过，此时进入 Product Human Gate。

## 3. 谁能改什么

### Engineering Loop 可以

- 修改实现代码；
- 新增/修复自动化测试；
- 做最小必要重构；
- 根据已有 `TASKS + EVALS + DECISIONS` 修复结果；
- 记录运行证据。

### Engineering Loop 不可以

- 自己扩展产品范围；
- 静默修改核心产品假设；
- 为了让测试通过而弱化 Eval；
- 删除失败测试来“通过”；
- 把 `blocked` 当作 `pass`；
- 在 Human Gate 前自动宣布 experiment validated。

### Product Loop / Human Gate 才可以

- 改变产品假设；
- 删除或新增核心用户路径；
- 接受一个有意识的退化；
- 修改 Eval 的产品含义；
- pivot / stop。

## 4. 状态与真相来源

- `PRODUCT.md`：产品方向；
- `DECISIONS.md`：已经做出的重要取舍；
- `TASKS.md`：可执行工作；
- `EVALS.md`：产品质量标准；
- `docs/experiments/*.md`：单次产品实验；
- `loop/experiments.json`：实验到 Task 的机器映射；
- `STATE.json`：Loop 的运行状态，不是产品定义；
- `.loop/runs/`：每轮 Codex / verify / critic 原始证据；
- `.loop/evidence/`：Human Gate 摘要。

## 5. 最短使用方式

```bash
# 1) 检查 Loop 基础设施
python3 scripts/validate_loop.py

# 2) 查看外层状态
python3 scripts/product_loop.py status

# 3) 启动当前实验（如果已经是 active 可跳过）
python3 scripts/product_loop.py start 001-core-trip-loop

# 4) 自动跑 Engineering Loop
./scripts/run-loop

# 5) 全部 task 通过后查看 Human Gate evidence
python3 scripts/product_loop.py status

# 6a) 认可假设
python3 scripts/product_loop.py approve --note "核心闭环值得继续"

# 6b) 或带反馈重新进入工程循环
python3 scripts/product_loop.py revise --task T-002 --note "重规划虽然正确，但用户看不出改了什么"
./scripts/run-loop
```

首次在真实 repo 中启用时，先编辑 `loop.config.json` 的验证命令。不要让纯 LLM review 成为唯一 Gate。
