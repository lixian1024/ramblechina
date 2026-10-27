# 来华就医指南：来源、维护与验收

2026-10-27；D-039。设计和范围经用户确认；本地实现，未部署。

## 文件与修改方式

- `src/content/medical-guide.ts`：十个主题、30 个双语问答、准备事项、预算项目、官方来源及六篇文章的主题映射。
- `src/app/[locale]/medical/page.tsx`：共享 en/zh 服务端页面；保留稳定章节 ID，不把健康资料送到服务端。
- `src/components/medical/MedicalGuide.module.css`：桌面目录、手机可折叠目录和原生问答样式。
- `scripts/verify-medical.ts`：内容关系、语言锚点、发现入口及可选真实 HTTP 检查。

新增或更新事实时读取支持该段落的官方页面；核对日期只记录实际读取，不等于个人资格或服务可用性已通过。修改中文或英文时同时复核另一语言、链接和恢复路径。症状恶化时就近求助、准备清单及下一步不要只放在折叠内容里。

## 编辑输入

六篇用户提供的 HTML 位于 `/Users/xianli/codex/china-unfold/medical/`；工作树未自带该未跟踪目录。不提交原页面的微信脚本、样式或追踪资源。下面是读取时原始文件的 SHA-256；内容中保留标题及主题映射。

| 原文章主题 | SHA-256 |
| --- | --- |
| 成本、等待时间与设备优势 | `312befa524f96ddea74640ce2c45563f5194bf4bbecb4f09152c7bfea973b15a` |
| 三甲与医院选择 | `c524c285924b58e795cc16beba8da1e67542ad4ed7530432c67a518923ce8e0a` |
| 医疗与出行总预算 | `83429945b90e21a4c79d74e261578b6945eb548fac7afe4361bccec35d2bf1a0` |
| 风险与 DIY/协助对比 | `f2c09f861f43c4d836c125b54847df00b325f59beece21b21b69014d0042f1c6` |
| 项目适用与不适用边界 | `267144297f68af0f2a1d993b735eeed35ccf0cd066eba83f60fc86e32346fa27` |
| 出行、清单与语言 | `293c83ddec076656d255635a5fae32949285385ade22b6626f294d8df60d1074` |

## 官方核对与限制

2026-10-27 实际读取 CDC 医疗旅行、CDC Yellow Book 保险、NCI CT/PET-CT、北京协和国际患者服务、驻伊朗使馆签证说明、政府网 2023 健康申报公告、北京市急救号码说明。准确 URL、段落引用及核对日期保存在内容文件和页面中。

- 只核对公开资料，没有测试医院登录预约、号源、报价、直接理赔或个人签证准入。
- 协和页的保险名单包含较早日期，不能认为当前保单自动覆盖；页面明确要求逐人确认。
- 签证材料仅作为一个领区的示例，未将其资金、人数等要求推广为全球规则。
- NCI 的筛查边界用于修正原文广泛推广影像套餐的表述，不判断个人是否需要检查。
- 搜索工具读取遇到 429，改用直接读取官方页面。卫健委评审页返回 412，未以其为已核对来源；未发布具体当前评审数量/复审周期或 JCI 中国市场结论。
- 原文价格没有可靠报价日期/范围，首版提供预算核对表而非数字行情。第三方宣传不作为 Ramble 合作或服务承诺。

## 验证与证据

运行：

```sh
npm run test:medical
node --import tsx scripts/verify-medical.ts --url=http://127.0.0.1:3107
node --import tsx scripts/verify-i18n.ts
node --import tsx scripts/verify-chinese-website.ts
node --import tsx scripts/verify-editorial.ts
node --import tsx scripts/verify-seo.ts
node --import tsx scripts/verify-travel-tips.ts
TEST_ORIGIN=http://127.0.0.1:3107 npm test
npx tsc --noEmit
npm run build
```

预览服务：`npm run dev -- --hostname 127.0.0.1 --port 3107`。沙箱内 tsx CLI 创建管道及本机网络访问可能被拦截；本轮在获得执行权限后运行，不修改测试来绕过断言。

结果：以上检查通过，相关 ESLint 和 `git diff --check` 通过。新内容不存在→内容回归失败、sitemap 缺入口→集成断言失败、恶化指引只在折叠中→可见行动断言失败，均已观察到并分别修正。

实际浏览器核对 en/zh × 1440/1280/390/320px：八组 `scrollWidth == clientWidth`；30 个问答存在，当前导航选中。手机目录及保险问答 Enter 展开，双向语言切换保留 `#costs-insurance`；手机菜单点选就医入口后关闭。取消预约及缺报告恢复默认展开，恶化求医默认可见。浏览器错误日志为空。

本地证据位于忽略的 `output/medical/`：`browser-checks.json`、`en-1440.jpg`、`zh-1440.jpg`、`en-320.jpg`、`zh-320.jpg`、`build.log` 等。独立审阅的一项重要问题已通过失败→通过的回归修复；没有未解决的重要实现问题。专业医疗内容充分性不由代码审阅替代。

## 下一步验证

正式部署后复验两个页面、菜单、canonical/hreflang、sitemap 和来源链接；请合适的专业人员继续复核内容。请中英文读者分别找出官方预约方式、完整预算及保险/随访确认步骤，观察是否能正确说明下一步和未确认事项。当前没有这些真实读者结果，不把测试通过写成 H7 成立。

2026-10-27 展示跟进：用户要求删除“六篇原始文章如何整理到本指南”部分，已从 en/zh 页面移除。原文章映射仅作为内部编辑资料保留；官方来源列表正常显示。

## 生产发布准备（2026-10-27）

用户明确授权将本次指南部署线上并检查中英文。已确认既有 Vercel 项目 `ramblechina`（`prj_cMG5CfDNKgYceGADYwkcG6CWaRSM`）、正式域名 `www.ramblechina.com` 及 GitHub `lixian1024/ramblechina` 的 main 自动发布路径。远端 main 与本轮基线 `dab769c` 一致；发布前重新执行指南/双语/SEO/原 npm test、相关 ESLint 和生产构建。此次不改环境变量、数据库或支付模式。发布结果与正式域名检查另记，不能仅凭 push 推定部署成功。
