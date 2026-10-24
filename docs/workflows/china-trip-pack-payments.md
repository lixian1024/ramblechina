# China Trip Pack：大陆个人收款准入

核查日期：2026-10-23。当前只有产品设计和本地 PDF 原型；没有商家审核通过、正式支付、订单授权或线上下载验收。以下是供应商候选与申请材料，不代表已获准销售。

## 当前选择

优先向 **Creem** 申请商品分类预审。它的官方资料明确列出中国个人通过支付宝结算，路径比另外两家清楚。**支持大陆个人不等于接受本产品**：生成式 AI 和服务类属于 restricted，官方要求额外尽调和既有经营记录；本项目必须如实说明尚无支付历史，不能虚构记录或把 AI 产品改名成普通 PDF 来绕过审核。

| 候选 | 已有官方依据 | 仍需确认 |
| --- | --- | --- |
| Creem | 中国个人收款人为 Alipay；受益人须匹配 KYC；PDF 是可支持品类；生成式 AI / 服务需额外审查。 | AI 规划网站中的自动行程资料包能否批准；全新项目没有支付历史是否可审；大陆个人证件及支付宝材料、适用结算费。 |
| Dodo Payments | 商户名单包含 China，允许未注册公司的 Individual；KYC 和本人名下账户核验。 | 旅行服务受禁售限制，下载指南和 AI 内容需审查；本商品具体分类、可接受的中国证件与个人银行路线。 |
| Waffo Pancake | 服务条款面向个人开发者；不是企业版 Waffo 的同一开户/费率说明。 | Travel services 在禁售列表；电子书与 AI 内容需额外审查；本商品分类及大陆个人实际出款资格。 |

官方依据：

- [Creem 中国个人出款](https://docs.creem.io/merchant-of-record/finance/payouts)、[审核及受限产品](https://docs.creem.io/merchant-of-record/account-reviews/account-reviews)、[收款账户审核](https://docs.creem.io/merchant-of-record/finance/payout-accounts)。
- [Dodo 商户国家资格](https://docs.dodopayments.com/miscellaneous/accepted-countries-and-territories)、[个人验证](https://docs.dodopayments.com/miscellaneous/verification-process)、[商户接受政策](https://docs.dodopayments.com/miscellaneous/merchant-acceptance)。
- [Waffo Pancake 个人开发者条款](https://www.waffo.ai/developer-terms)、[旅行/AI/电子书政策](https://www.waffo.ai/acceptable-use-policy)。

## 成本口径

Creem 公布的标准处理费是 3.9% + US$0.40。假设最终无附加税的订单总额为 US$9.90，算得处理费约 US$0.79，余额约 US$9.11；这不是净利润，未扣出款、汇兑、退款、服务成本和经营者自己的税费。官方银行出款说明的最低 US$7 或 1% 不能直接当成中国支付宝最终费率，需要开户时确认。最低可申请出款余额为 US$50，每月 1 日 / 15 日窗口。依据：[费率](https://www.creem.io/pricing)、[出款](https://docs.creem.io/merchant-of-record/finance/payouts)。

## 可复制的英文产品预审说明

以下保留预审说明参考稿；实际咨询已于 2026-10-24 经官网 General Inquiry 发出，未附文件。正式申请前应确认演示、政策和交付体验一致。收件人可用 Creem 官方条款列出的 support@creem.io；备选 Dodo 为其官方政策列出的 compliance@dodopayments.com。

Subject: Product eligibility pre-check — automated China Trip Pack, mainland China individual

Hello,

I am an individual based in mainland China, without a registered company. I operate Ramble China at https://www.ramblechina.com/ and would like to confirm product eligibility before integrating live payments.

The website offers an AI-assisted travel itinerary planner. The proposed paid product, China Trip Pack, is an automatically delivered digital PDF based on a traveller's saved itinerary. The initial scope is Shanghai, one to three days, at a base price of US$9.90 per saved trip, with free re-exports of that same trip for 90 days from payment. Any applicable tax would be disclosed at checkout. It is not a subscription.

The PDF contains the traveller's saved stop sequence and time suggestions, bilingual destination cards, independently sourced Chinese place labels, online map search links and QR codes, reservation reminders, and source/review dates. An optional hotel return card uses information explicitly entered by the traveller. The PDF does not include supplier photos or map tiles. The export itself is deterministic; it does not call an AI model or create a new itinerary. The upstream planning feature does use AI, and we do not want to conceal that from review.

The Pack does not include flight, accommodation or ticket sales, reservation handling, visa or immigration services, guided tours, transport arrangements, or per-order human consultation. The broader website also has a separate local-guide enquiry form and a free research invitation; these are not included in the paid Pack. Unknown travel facts are labelled, and unsupported destinations or known closure conflicts block export rather than inventing details.

This is a new product without prior payment-processing history or chargeback statistics. Attached samples are controlled engineering demonstrations, not customer trips or bookings. The PDF prototype is available locally; the purchase and entitlement flow is not live yet. We plan account-bound delivery, payment confirmation before download, recovery of purchases, and refund/dispute handling.

Could you please confirm:

1. Whether this specific product is eligible as a digital planning tool/publication, given your travel-service and AI-product policies, and which category applies?
2. Whether a new product with no previous payment processor can be reviewed, and what evidence or changes are needed?
3. Which identity documents and payout method are currently supported for a mainland China individual, including name matching and all payout/FX fees?
4. Which tax category and customer refund/disclosure requirements apply to this automatically delivered PDF and its 90-day re-export entitlement?

Website support contact: service@ramblechina.com.

Thank you.

## 开户和接通顺序

1. 经营者本人在 [Creem](https://www.creem.io/) 注册，真实选择个人及中国大陆；本人阅读条款并完成必要 KYC。不得把身份证、验证码、密码、API 密钥发到聊天。
2. 用以上真实说明和样本确认商品分类，保留平台对这个网站、商品及主体的审核结果。网站公开价格、交付范围、Terms、Privacy、退款和联络方式需与提交内容一致。
3. 等待审核期间，可在真正的隔离 Test Mode 中创建 US$9.90 固定商品并完成测试；明确税类与含税/税外模式。接入服务器 checkout、原始请求验签、数据库订单去重、退款/争议撤销、90 天授权及私人下载。正式收费仍须先获准。
4. 通过双账号隔离、未付款禁止下载、重复/乱序通知、恰好 90 天边界、重导出失败保留旧文件、断线购买恢复等验证，再配置 live key 和最终回调。只有全部实际通过后开放正式支付。

当前状态：第 1–2 步的外部准入未完成；没有开启收费。PDF 原型可继续检查，数据库/支付/下载闭环按实施计划保留待办。

## 2026-10-24 开户进度

经营者本人已完成 Creem 注册与商店创建，并在业务详情中填写个人法定身份、地址；这些私人资料不记入仓库。商家类型为个人、中国。经营/产品说明已如实填写 AI 规划、US$9.90、90 天同一行程重导出，以及购买/交付仍未上线的事实。业务详情保留在最后确认页，**正式审核未提交，KYC 未验证**；填写身份字段不能当成证件核验完成。

此前根据 DOM 中隐藏横幅误判环境，第一件商品实际建立在 Live 目录，未发生付款。2026-10-24 已明确切换测试开关（可见横幅与开关均确认），重新创建独立测试商品；实际测试 API 返回 mode=test、price=990、currency=USD、billing_type=onetime、tax_mode=exclusive。应用只使用新测试商品，首发仅 off/test，不能接受真实付款。旧 Live 目录商品未用于集成，后已归档（未发生销售、付款链接已禁用），商家审核仍未完成；没有把静态样本冒充个人交付。

正式审核确认页要求申报产品符合审核清单，并提示拒绝后 3 个月不再审核。现有付费交付仍未就绪，不代为勾选未成立的申报。经营者明确授权后，已通过 Creem 官网 General Inquiry 发送商品资格及 KYC 顺序咨询，回信地址 service@ramblechina.com；页面实际显示 Message Sent!，并称工作日期间 24–48 小时回复。没有发送证件、私人地址、收款资料或 PDF 附件。草稿、发送回执和本地流程状态保存在忽略的 output/creem-onboarding/；这仅证明客服咨询已发送，不是正式审核已提交、KYC 完成或商品获批。

## 工程交接注意

新增依赖是固定版本 fontkit 2.0.4 和 qrcode 1.5.4；已有 fontkit 包用于旧导出器，未替换其行为。npm 官方 audit 同时报告 9 项现有依赖问题，其中 Next 16.3.6 有 critical 通告，其他涉及 sharp、glob、ip-address、source-map-js。它们的版本与本轮基线完全相同，新 PDF 依赖未列入报告。当前配置未检出 use cache、Server Actions 或 dangerouslyAllowSVG，不足以据此认定所有通告不可触达。正式收费发布前需单独核对通告及修补，不使用 audit fix --force 自动降级或跨版本改架构。当前没有发布或打开新的支付接口。

## 2026-10-24 测试集成推进

经营者要求等待客服回复期间继续完成测试交付。真正 Test Mode 商品经实际 API 确认为990USD、onetime、test；Pay what you want在界面关闭（当前商品API不返回此标记，需运营保持关闭；服务端另核对实际支付小计）。已由经营者本人创建测试密钥、测试签名回调，并确认将五项测试配置导入VercelProduction。应用首发只支持off/test和指定既有账户，不支持live密钥；不能把部署环境名Production当成支付正式环境。

Reviewed additive migration已应用；新增三张表仅在私有schema，开启RLS且无客户端直接表权限，沿用经过服务器身份核验和独立secret的狭窄RPC。Supabase关于SECURITYDEFINER可执行的提示是这一既有网关设计的显式例外，必须保留secret并禁止在浏览器暴露。错误secret的实际HTTP返回400，配置正确的只读请求200。没有改变共享项目其他应用表。

真实未付款API探针确认：Creem创建/读取响应均可能省略request_id，不能把示例的回显当成必填。同步创建响应绑定已持久化的尝试后，核对固定商品、模式、数量及返回ID/URL再保存；若回显存在且冲突仍拒绝。未知POST结果不自动再建结账，需对账/支持处理。退款/争议验签入库独立于新购买开关，关闭购买仍能撤销已有权益。完整真实付款→私人下载尚须在部署后验收，不能由此探针推定。

安全依赖后续：已按官方10月14日补丁升级Next及eslint-config-next至16.4.3、Zod4.6.6，并更新兼容间接依赖；npm报告0漏洞。全量原产品/账户、统计、增长、分享、SEO与场馆回归已通过；最终构建及真实交付另记录。
