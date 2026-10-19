# Google Analytics 4

目标：在 GA4 后台查看 Ramble China 的流量来源、用户数、访问次数（Sessions，会话）与页面浏览量（Views）。这轮只接入访问统计；不把访问量当作行程价值或旅行 Evals 通过的证据。

## 1. 创建网站数据流

1. 打开 [Google Analytics](https://analytics.google.com/)，创建账户（已有可复用）和媒体资源 `Ramble China`；选择实际需要的报告时区。
2. 添加 Web / 网站数据流，网址为 `https://www.ramblechina.com`，名称 `Ramble China website`。
3. **关闭这个数据流的 Enhanced measurement / 增强型衡量总开关**。页面浏览由本仓库统一发送，避免自动历史记录浏览重复计数，也避免自动搜索、表单和外链事件携带私人信息。`send_page_view: false` 本身不能关闭增强型衡量的历史记录监听。
4. 复制 `G-…` Measurement ID / 衡量 ID。它是公开统计标识，不是 Google Maps Key、Google Ads ID 或 GA API 密钥。

官方：[创建媒体资源与数据流](https://support.google.com/analytics/answer/9304153)、[手动页面浏览与关闭自动历史记录统计](https://developers.google.com/analytics/devguides/collection/ga4/views)。

## 2. 生产配置与部署

网站所有者已于 2026-10-19 提供真实衡量 ID `G-QBCYPGN6SB`，代码将它作为公开默认值。沿用 GitHub main → Vercel Production 部署即可，不必额外添加 Vercel 变量。

需要替换或停用时，在现有 Vercel 项目的 Settings → Environment Variables 配置覆盖值：

```dotenv
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-QBCYPGN6SB
```

只为 **Production** 配置；显式空字符串停用统计，删除变量则恢复代码默认值。修改后重新构建/部署。不要把示例或测试 ID 发布到生产。变量变更后仅重启旧构建不够；必须重新部署。

显式空值/格式错误时不渲染 Google 脚本；开发模式与 Vercel Preview 不启用。即使生产构建带有 ID，localhost、IP 和其他预览域名也不会初始化 GA 或发送事件；正式采集仅限 HTTPS 的 `www.ramblechina.com` / `ramblechina.com`。本地生产预览可能下载 Google 标签脚本，但不初始化媒体资源。正式域名改变时需同步代码中的域名门槛。

## 3. 采集范围

- 中英文共用根布局，水合后异步加载一次官方 gtag.js。
- 首次访问与 pathname 改变各记录一次 `page_view`；返回已看过页面仍计一次，组件重渲染或只变查询参数/锚点不额外计数。
- GA 自身管理浏览器标识、用户与会话；不发送 Supabase user ID、邮箱、表单、聊天或私人行程内容，不增加登录身份合并。
- 上报地址去掉查询参数和锚点，仅保留 `utm_source` / `utm_medium` / `utm_campaign` 中不超过100字符的英文字母、数字、`_ . ~ -`。推广链接使用这些 slug；不把个人信息放在推广参数内。其他推广参数（例如广告点击 ID）本轮不采集。
- 首次来源只保留 referrer 的站点来源，站内来源保留上一个不带查询参数的页面地址。全局 page_location 同步为清理后的地址，供后续自动会话/互动事件使用。
- 关闭 Google Signals 和广告个性化信号。数据流必须按第1节关闭增强型衡量；不要另外安装重复的 GA/GTM 页面浏览标签。
- 脚本被广告拦截器或网络阻断时，页面照常工作；不向用户显示统计错误，不影响规划或保存。

## 4. 上线验收与读报表

1. 用可连接 Google 且未拦截统计的浏览器打开正式网站，首次页 → 目的地 → 规划 → 中文页 → 后退。
2. 浏览器 Network 中确认 `gtag/js?id=G-…` 与 GA `g/collect` 请求；核对 `tid` 是真实 ID、`en=page_view`、`dl` 不含私人参数，每次真正切页只有一次页面浏览。只变 `?trip=…` 或锚点不应新增浏览。
3. GA Reports → Realtime / 实时报告：确认当前访问及 `page_view`；这是**真实接入验收门槛**，本地队列测试不能替代。
4. 正常报表处理后，在 Reports 中查看（不同业务目标可能使用不同的导航分组，可按报表名查找）：

| 要了解的内容 | 报表 / 指标 |
| --- | --- |
| 多少人访问 | User acquisition / 用户获取；Active users / 活跃用户、New users / 新用户 |
| 访问了多少次 | Traffic acquisition / 流量获取；Sessions / 会话 |
| 从哪里来 | Traffic acquisition；Session source / medium 或 Default channel group |
| 哪些页面热门 | Pages and screens / 网页和屏幕；Views / 浏览量、Active users |
| 现在是否有人访问 | Realtime / 实时报告 |

Sessions 与 Views 是不同指标：同一次访问可浏览多页。浏览器/设备和 Cookie 会影响用户去重；网络和拦截器会使统计少于实际流量。普通报表处理需要时间；先用实时报告判断是否收到访问，不应把空报表直接解读为零访问。

官方：[网页浏览与报表](https://developers.google.com/analytics/devguides/collection/ga4/views)、[会话定义](https://support.google.com/analytics/answer/9191807)。

## 5. 代码验证与当前边界

运行 `npm run test:analytics` 检查首次/站内/中英文/返回浏览、重渲染去重、会话配置复用、推广参数、私人参数/来源清理、无配置/开发/预览门槛及统计失败隔离。测试只检查真实生产函数的命令队列，不向 Google 发送假访问。

2026-10-19：用户确认增强型衡量已关闭，`6cfda4b` 已部署到 Production。真实浏览器观察到正确 ID 的中英文 `g/collect` 页面浏览请求、单份脚本和私人查询/锚点清理。证据 `output/analytics/production-check.json`。可用 GA 浏览器会话仅显示欢迎页，该媒体资源 Realtime 收数仍待用户确认；资源清单不暴露批量 POST 内部事件，不以请求 URL 个数证明全部事件计数。访问统计不改变现有旅行 Evals、Loop 或 Product Human Gate。
