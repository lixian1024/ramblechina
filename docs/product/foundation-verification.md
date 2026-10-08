# Ramble China 基础设施验证

日期：2026-10-07（Asia/Shanghai）。范围：四模块多语言产品流程文档、任务、场景定义、报告门槛与已有工程测试的统一入口。未修改业务页面、API、事实、语言发布配置或模型 prompt。

| 检查 | 实际结果 |
| --- | --- |
| npm run check:product | 六组全部通过：i18n、editorial、Daybook、planner、concierge、trip-routing |
| npm run eval:validate | 13 场景、39 判据定义有效；报告另要求38次语言/模块覆盖观察 |
| npm run test:eval-infra | 6 个测试通过；含旧版本、定义变更、漏项、重复、失败、阻塞、缺证据、语言组合漏测 |
| eslint scripts/product-evals.mjs scripts/product-evals.test.mjs | 退出码0 |
| eval:init | 全量初始化为not-run，不覆盖已有文件 |
| eval:gate 初始报告 | 预期拒绝，退出码1；未运行与缺证据没有被误判通过 |
| 范围审计 | 行动助手约束已撤销；上一轮生成的专用场景、脚本和模板已移除；四模块与语言矩阵生效 |

check:product 首次受沙箱对 tsx IPC 管道的限制（EPERM），扩大执行权限后完整通过；不是产品测试失败。
六组工程检查采用本地内容和模拟服务，不能证明真实Qwen/高德、浏览器体验、母语质量或PDF视觉达标。
用户提供的 http://localhost:3000/en/destinations 连接失败（curl退出码7）。没有启动服务器或运行浏览器产品评测，没有生成或审核导出文件。本轮未执行全站lint、build和网页E2E，因为未改变对应业务代码。

全量产品场景：**未运行**。H1–H5：**未验证**。母语审阅：**未完成**。
本报告只完成TASKS.md的R000。下一步R001：启动网站后从首次用户视角走北京跨模块任务，依据实际阻碍决定下轮改动。
