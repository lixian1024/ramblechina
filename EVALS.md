# Ramble China 评测与完成门槛

机器可读场景：evals/ramble-china/cases.json。覆盖四模块、跨模块和多语言，每轮按同一套定义验证，不挑选容易通过的案例。
语言状态与测试矩阵：docs/product/locale-matrix.md。
当前产品评测：全部未运行。工程检查的通过不能替代产品体验或母语审阅。

## 执行
```sh
npm run check:product
npm run eval:validate
npm run test:eval-infra
npm run eval:init -- /tmp/ramble-run.json
# 实际运行产品，按 cases.json 步骤操作，填写逐项证据
npm run eval:gate -- /tmp/ramble-run.json
```

报告需记录测试时间、测试者、build（commit 或本地快照）、环境、模型与 prompt 版本；没有模型时填写 n/a 并说明。每项及每个 coverage 中的语言/模块组合必须有脱敏观察证据与 pass/fail/blocked/not-run 结果；不适用条件须说明是尚未发布版本的回退验证，不能把“没做”写成通过。
门槛要求所有检查通过，有证据且场景版本和指纹一致。任何失败、阻塞、未运行、漏项、重复项、缺证据或旧定义均非零退出。报告验证不自动核实证据真实性，需 QA 复核。
保存脱敏报告到 evals/ramble-china/runs/，任务引用报告；不要存真实订单、证件、密钥或个人资料。

## 工程检查分层
- `npm run check:product`：现有 i18n、editorial、Daybook、planner、concierge 与分流测试；这些是本地内容/规则/模拟服务检查，不等同真实模型、高德、网页 E2E 或语言全文审阅。
- `npm run lint`、`npx tsc --noEmit`：代码变更适用。框架/路由变更读取当前安装 Next.js 指南并运行 build。
- `npm test`：需要运行中的服务器，默认 3001 或 TEST_ORIGIN。对用户指定的 3000 使用 `TEST_ORIGIN=http://localhost:3000 npm test`。不能连接就报告 blocked。
- 地图、模型与导出：实际交互和文件检查。Daybook/PDF 变化须实际渲染导出；不能只看编译成功。下载文件离线能读不代表网站离线可用。
- 多语言：按发布矩阵检查每个模块的目标语言、来源、稳定 ID、中文现场卡、语言切换、内容过期和窄屏布局；新增发布需母语审阅，不凭词条齐全发布。

## 多语言用例的执行范围
DEST/ESS/PLAN/DAY/FLOW 场景默认先跑英语。LANG01 检查 en/ko/zh × 四模块的 12 个路由组合；未发布组合应正确显示英文回退或不可用说明。LANG02、LANG03 按矩阵展开实际已发布组合，逐组合记录证据。新增语言/模块发布时同步扩展这些组合并增加 suiteVersion，使旧报告失效。
其他规划语言在正式接入前验证不被误报已发布，不要求凭空补齐翻译。

## 产品完成定义
对功能、内容、prompt、工具或语言发布的改动：适用工程检查通过，全量产品场景通过，新增行为有验收场景，无旧用例回归，并完成 Critic 审查。高风险动态信息不可用应诚实降级；不能生成虚构通过报告。
真实用户假设单独依据观察记录验证。对本轮这类基础设施改动，只验证设施自身与适用本地回归，明确真实页面评测尚未执行。
修改场景需要增加 suiteVersion，并在 DECISIONS.md 记录理由；不能通过删案例隐藏退化。
