# Engineering Loop — Autonomous convergence loop

## Purpose

在固定产品目标下，让 Codex 根据验证证据反复修复，直到通过或触发升级条件。

## One iteration

1. 读取 AGENTS / PRODUCT / DECISIONS / current Task / relevant Evals；
2. 带上上一轮失败 delta；
3. Codex 只解决当前 Task；
4. 运行 deterministic verification；
5. 独立 Critic 评估 relevant Evals；
6. 通过则 task done；失败则把证据写入下一轮 prompt；
7. 同类失败重复或触及产品取舍则停止并升级。

## Why two verifiers

- **deterministic verifier**：编译、类型检查、单测、集成测试、lint、项目自定义 eval runner；
- **Critic**：检查“测试没有表达出来的产品问题”，但不能覆盖 deterministic failure。

任何 deterministic failure 都是 hard fail。Critic 不能把红灯解释成绿灯。

## Required evidence

每轮保存：

- prompt；
- Codex structured answer；
- stdout / stderr；
- verification result；
- Critic result；
- git diff summary；
- failure fingerprint。
