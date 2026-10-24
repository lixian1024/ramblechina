# China Trip Pack 审核材料与测试验收

更新：2026-10-24。当前为受邀测试版，正式收费关闭。工程验收不代表 Creem 产品准入、个人 KYC 或收款账户获批。

## 对外材料

| 材料 | 英文公开地址 | 中文公开地址 |
| --- | --- | --- |
| 商品、范围、价格、来源目录 | https://www.ramblechina.com/en/trip-pack | https://www.ramblechina.com/zh/trip-pack |
| 服务条款 | https://www.ramblechina.com/en/terms | https://www.ramblechina.com/zh/terms |
| 隐私政策 | https://www.ramblechina.com/en/privacy | https://www.ramblechina.com/zh/privacy |
| 退款政策 | https://www.ramblechina.com/en/refunds | https://www.ramblechina.com/zh/refunds |
| 带 PREVIEW 标记的合成样例 | https://www.ramblechina.com/trip-pack/sample-en.pdf | https://www.ramblechina.com/trip-pack/sample-zh.pdf |

这些是本次发布目标；是否已上线以本文下方的实际部署记录为准，不能仅凭列出网址认定部署成功。

经营者：Jiang Xianli，以 Ramble China 名义经营的中国个人经营者。支持及退款邮箱：service@ramblechina.com。不在仓库或公开页面放证件、家庭地址、KYC 文件或任何密钥。真实核验资料由经营者本人提交给 Creem。

产品为保存行程的数字 PDF，初版仅支持目录内的上海 1–3 天地点，不覆盖所有上海景点或餐厅。US$9.90 为每份保存行程一次性基础价，适用税费在结账时另计，无订阅。上游规划使用 AI，导出本身是确定性投影与排版；不销售机酒、门票、签证、导游或逐单人工咨询。

首次确认付款后2160小时内，同一行程免费重新导出；期满后最后文件仍可下载，退款、争议或删除除外。付款确认后72小时内收到申请可全额退款，含已下载；之后普通改变主意退款不适用，强制法定权利、重复扣款、未交付及重大不符仍保留。退款申请通过邮箱人工受理，经平台退款后自动撤销后续文件权限；不承诺所有售后完全无人处理。

## 当前验收记录

- 本地严格文档、实际 PDF、真实 SQL、实际生产 route exports 与 UI 测试通过；原产品/账户/分享/增长/SEO/场馆回归通过，原 Evals 和 Human Gate 未改。
- 两种语言公开样例共10页已实际渲染和查看，中文提取、来源、地图链接、PREVIEW 标记与布局检查通过。样例为明确标注的工程演示，不是客户、预订或真实旅行结果。
- 本地桌面及390像素移动页检查通过；未登录的私人预览/下载返回401，响应 no-store/no-referrer。私人订单查询页面 noindex，统计默认未同意不排队/不加载。
- 测试商品已由真实 test API 核对固定990USD/onetime/test；无付款的 API 探针验证了会话网址及返回字段，不能算真实付款验收。
- 私有迁移已应用；三张表 RLS 开启、无客户端表权限，错误网关 secret 实际被拒绝。经营者已确认 Vercel Production 中保存五项仅测试配置；代码仅 off/test，并限制指定账户。
- 最终整体审查的三项恢复问题已修复并获限定复审通过；最终生产构建通过。清除样例合成预订标记后的10页已重新渲染查看。
- **待更新**：确切发布提交/部署、实际测试付款→签名通知或服务器核对→私人 PDF→账户恢复→重新导出→退款撤销，以及正式域名未登录下载拒绝。

## Creem 最终申请前

1. 等待已发送的 General Inquiry 对“新项目、AI 辅助规划、个性化 PDF”的分类确认；不要把产品改名来隐藏 AI，不能虚构处理历史、用户数或退款率。
2. 更新真实可用网站和演示记录；测试付款始终使用 test API、test 商品及公开测试卡，不替经营者用真实银行卡付款。
3. 经营者本人核实商家申报、完成证件/KYC与收款账户。填写过姓名和地址不等于身份已核验，客服咨询不等于正式审核提交。
4. 如审核需要试用，使用经过身份核实且受邀的账户测试；不能公开服务器凭据、绕过账户所有权或把测试权益转成正式权益。当前不支持100%折扣订单自动授予付费权益，不应勾选与实际能力不符的声明。
5. 正式审批完成后，单独实现并验收 live 商品/密钥、税类、回调与退款流程，再开放真实收费；本次 off/test 发布不能直接改一个变量变为 live。

## 重建公开样例

先运行 `npm run test:trip-pack` 生成受控样例 JSON，再运行 `npm run export:trip-pack-samples`。测试 PDF 提取/渲染需要 pypdf 与 Poppler；导出器本身不需要网络或模型密钥。提交到 public/trip-pack 的只是带预览标记的演示文件，私人订单文件始终由认证下载接口提供。
