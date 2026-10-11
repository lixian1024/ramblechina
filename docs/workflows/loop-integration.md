# Loop integration — 2026-10-09

当前运行契约使用 `loop.config.json.version=1`、`STATE.json.version=1`、`loop/experiments.json` 与 `TASKS.md` 的 T 编号。旧 R001 证据保留在 `.loop/20261008T095839142238Z/`；它未通过验收，不计入上海实验。

## 验证命令

```bash
python3 scripts/bootstrap_loop.py
python3 scripts/validate_loop.py
python3 scripts/test_loop_engine.py
./scripts/run-loop --dry-run
```

`STATE.json` 是本地忽略文件。新克隆仓库用 `bootstrap_loop.py` 从受版本管理的 `loop/state.template.json` 初始化；使用同一文件锁、先校验模板、独占创建。已有状态逐字节保留，不会清空通过记录、失败预算或证据路径。

`loop.config.json` 显式连接已有 i18n、editorial、daybook、planner-workbench、concierge、trip-routing、Eval 基础设施测试及 TypeScript 检查；本轮新增的上海质量、有限修复、餐饮和类别冲突受控回归也进入通用门槛。用 `node --import tsx` 执行同一套 TypeScript 检查，避免 tsx CLI 在受限沙箱内创建 IPC socket 失败。

各任务额外运行 `scripts/verify-core-trip.ts --task T-00X`。T-001/002/003 使用本地真实 `/api/trip-concierge`，禁止 mock 模型输出。每次在 `.loop/product-evals/` 保存请求、响应、行程和结果；脚本通过并不等于完整人工验收。T-004 是带明确 fixture 标签的事实 adapter 故障注入，模块缺失即失败，Critic 还必须检查生产路径真实使用 adapter。

## 首次执行

```bash
npm run dev -- --hostname 127.0.0.1 --port 3001
# 在另一个终端执行；默认只读现有登录状态，不打印密钥
codex login status
./scripts/run-loop --max-tasks 1
```

当前初始仓库存在已导入而未提交的文档。若显式选择保留这些改动并运行，可以使用 `./scripts/run-loop --allow-dirty --max-tasks 1`。Runner 会先在本轮 `.loop/runs/*/baseline/` 保存非忽略文件的 tar、tracked patch、manifest，以及运行前原始 `state.json`，再启动 Codex。状态快照在本轮收尾时加入；下述已完成运行的旧 baseline 没有该文件。不会自动改 Git 历史。忽略的密钥文件不进入快照，恢复时应先检查快照，不能覆盖当前工作。

`--max-tasks 1` 只限制本次推进一个任务；不会把未完成任务标为通过，也不会进入 Product Human Gate。省略该参数则按实验映射继续，直到任务失败、阻塞、达到预算或进入 Human Gate。

## 阻塞恢复与人决策

先阅读 `STATE.json` 和 `tasks.<id>.last_result` 指向的原始证据。服务修复后：

```bash
python3 scripts/product_loop.py resume --note "说明已解决的具体阻塞"
./scripts/run-loop
```

全部任务通过后才能 `approve`；`revise --task T-002 --note ...` 只重开指定任务；`pivot` 和 `stop` 阻止继续工程循环。`resume` 不能绕过 Product Human Gate。多个 runner 与 Product Loop 状态修改共用文件锁。

## 本次尚未证明

上海核心体验是否满足全部 Evals，以及目标游客是否理解、愿意修改并实际执行结果；基础设施通过不代表这些假设成立。

## 首轮实际结果

2026-10-09，限定 `--max-tasks 1`，T-001 停在 **failed**，未进入 Product Human Gate；T-002～T-004 仍 pending。

- 实际运行目录：`.loop/runs/20261009T084711969553Z/`，本批次五次尝试按预算停止。此前 `.loop/runs/20261009T083006224750Z/` 的 Builder 环境阻塞记录也保留，因此 STATE 中 T-001 累计 attempts 为 6。
- 最后确定性验证：`T-001-attempt-5/verification.json`，通用工程检查及实际 E-001、E-002、E-014 接口断言通过；实际响应在 `.loop/product-evals/2026-10-09T10-38-02-270Z-T-001/`。
- 独立审查：`T-001-attempt-5/critic.json`，E-002、E-014 pass，E-001 fail。午餐候选“泽田本家·铜锣烧”被供应商归为日式餐厅，但品牌资料指向甜品专门店；尚无该分店菜单证据支持正餐推荐。
- 实际页面：`T-001-attempt-5/parent-current-ui.txt/png/md`。父会话从空白本地测试行程输入原始 E-001，第一次无可用搜索来源而报错，重试一次后生成三天六个停留。成功和失败均有记录；不能把受控测试当作该页面的证据。
- 当前已实现分区聚类、时段/交通约束、地图来源餐饮候选及不确定性标记，但餐饮分类仍不完整。下一轮先修供应商分类与甜品专门店信号的冲突，新增实际失败样本回归，再重新做真实接口和页面验收；通过后才推进 T-002。

收尾新增初始化、状态快照和回归接线，没有重置 STATE、降低 Evals 或再次启动失败任务。不要删除 STATE 来恢复，也不要用模板覆盖它。

## Builder 无本地网络时的职责

Builder 保持 workspace-write 沙箱；无法访问 localhost 时记录 known_risks，完成实现与受控回归后交由 Runner 执行真实服务检查。独立 Critic 读取实际请求/响应和父会话通过 in-app browser 保存的交互证据。不能把 Builder 的源码检查当成交互；真实检查或 Critic 失败仍阻止通过，不扩大沙箱权限。
