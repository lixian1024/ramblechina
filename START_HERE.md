# START_HERE — Run the two loops

现在这套 repo 基础设施不只是文档，而是一个最小 Loop Engine。

## 0. 先看架构

读 `LOOP.md`。

- 外层 Product Loop：人决定 `approve / revise / pivot / stop`；
- 内层 Engineering Loop：Codex 自动 `implement → verify → critic → retry`。

## 1. 校验基础设施

```bash
python3 scripts/bootstrap_loop.py
python3 scripts/validate_loop.py
python3 scripts/test_loop_engine.py
```

新克隆需要初始化本地 `STATE.json`；已有文件不会被覆盖。当前运行结果和下一步见 `docs/workflows/loop-integration.md`。

## 2. 启动真实项目服务

使用本机现有 `.env.local` 配置，不把密钥写入版本库或日志。

```bash
npm run dev -- --hostname 127.0.0.1 --port 3001
```

当前 `loop.config.json` 已显式接入工程回归、上海受控回归、TypeScript 和每个任务的真实行为检查；自动测试发现关闭。行为检查使用实际 `/api/trip-concierge`，保存输入与输出。其断言只是部分验收，独立 Critic 仍可据实际证据判失败。

## 3. 看当前 Product Loop 状态

```bash
python3 scripts/product_loop.py status
```

## 4. 先 dry-run

```bash
./scripts/run-loop --dry-run
```

确认它选中的 Task、Evals 和 prompt 边界正确。

## 5. 真正启动 Engineering Loop

确保 Codex CLI 已安装并登录，检查状态没有未处理的 failed / blocked 后，在另一个终端执行：

```bash
./scripts/run-loop --max-tasks 1
```

它会自动：

`TASKS → relevant EVALS → Codex → deterministic verify → independent Critic → retry/next task`

默认要求 Git 工作区干净。显式保留现有改动运行时可用 `--allow-dirty`；会先保存工作文件、Git diff 和原始状态快照，不自动提交或 stash。首次限定一个任务；省略 `--max-tasks 1` 才会继续整个实验。

failed / blocked 时先阅读 STATE 指向的原始 decision.json；确认具体问题已具备修复条件后用 `product_loop.py resume --note "具体原因与修复方向"` 开启有记录的新一轮。不要覆盖 STATE 或把确定性全绿当作 Critic 通过。

## 6. Engineering 全绿后，人做 Product Gate

```bash
python3 scripts/product_loop.py status
```

然后亲自走 `.loop/evidence/001-core-trip-loop-gate.md` 中的体验路径。

认可：

```bash
python3 scripts/product_loop.py approve --note "这个核心闭环值得继续"
```

发现具体问题，重开某个工程任务：

```bash
python3 scripts/product_loop.py revise --task T-002 --note "修改结果正确，但用户看不出哪里变了"
./scripts/run-loop
```

如果发现产品假设本身错了：

```bash
python3 scripts/product_loop.py pivot --note "用户真正需要的是旅途中实时决策，而不是行前完整规划"
```

此时先改 PRODUCT / DECISIONS / TASKS / experiment，再重新启动，不让 Engineering Loop 自己猜方向。
