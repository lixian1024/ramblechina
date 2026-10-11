# DECISIONS.md

> 轻量 ADR。只记录会影响后续产品 / 架构的重要取舍。不要把普通实现细节都写进来。

---

## D-001 — 优先验证“生成 → 修改 → 路线查看”的纵向闭环

**日期**：2026-10-07  
**状态**：Accepted

### 背景
产品方向仍在探索阶段。最危险的做法是同时建设账号、地图、酒店、支付、推荐、AI 等完整模块，却没有验证用户是否真正需要核心体验。

### 决策
第一阶段只优先完成：

1. 输入旅行需求；
2. 生成可执行行程；
3. 用户自然语言修改；
4. 局部重规划；
5. 查看路线与原因。

### 备选方案
- 先做完整旅行超级 App；
- 先做地图 POI 浏览；
- 先做纯聊天式旅行助手。

### 为什么这样选
该闭环最直接验证“AI 是否能比传统攻略降低规划与修改成本”。

### 何时重新评估
当核心闭环测试显示：用户并不愿意修改 / 执行行程，或主要价值转移到旅途中实时助手时。

---

## D-002 — 早期允许外围假数据，但核心旅行事实不得伪造

**日期**：2026-10-07  
**状态**：Accepted

### 背景
早期需要快速试错，但旅游产品一旦在营业时间、地理距离、闭馆等关键事实上编造，会直接破坏信任。

### 决策
UI、账户、非核心统计可 mock；但用于判断行程可执行性的地点、时间、交通、开放状态必须来自可追溯数据，或者明确标记“未验证”。

### 备选方案
完全 mock 全流程，以最快速度做 UI demo。

### 为什么这样选
我们测试的是“产品是否真的有用”，不是“用户是否喜欢一个漂亮 demo”。

### 何时重新评估
不会取消该原则；未来只会提高数据实时性要求。

---

## D-003 — 地图服务是执行层，不单独作为第一阶段产品核心

**日期**：2026-10-07  
**状态**：Accepted

### 背景
地图容易带来较大集成工作量，也容易诱导团队先做“地图产品”。

### 决策
第一阶段地图只服务两个目标：

- 证明当天地点顺序和距离合理；
- 帮助用户理解和执行当天路线。

不优先建设复杂 POI 浏览、地图社区、地图内容层。

### 何时重新评估
如果用户研究显示“以地图为入口探索附近内容”明显比“生成行程”更高频。

---

## D-004 — 修改默认采用局部重规划，不重置整份行程

**日期**：2026-10-07  
**状态**：Accepted

### 背景
用户旅行计划是在不断确认中逐步稳定的。全量重生成会破坏已确认内容并降低信任。

### 决策
修改请求应先识别影响范围，只调整必要日期 / 时段，并保留未受影响偏好和已确认安排。

### 何时重新评估
当约束冲突导致局部修改不可行时，可升级为更大范围重排，但必须解释原因。

---

## D-005 — 不先做大而全酒店 / 机票 / 支付整合

**日期**：2026-10-07  
**状态**：Accepted

### 背景
这些能力商业价值高，但会显著增加接口、合规和工程复杂度。

### 决策
第一阶段只把住宿位置作为路线约束使用；预订 / 比价仅在核心闭环验证后再进入产品路线图。

### 何时重新评估
当用户已经稳定使用规划功能，且“从规划到预订”成为最大的流失点时。

---

## 新决策模板

复制 `docs/templates/decision.md`，新增 D-XXX 条目；不要直接修改旧决策以隐藏历史变化。

---

## D-006 — 将工程循环统一到当前实验契约，并要求任务行为证据

**日期**：2026-10-09  
**状态**：Accepted

### 背景
导入的产品文档、配置和 STATE 使用 T-001～T-004，但旧引擎仍解析 R001 与 schema_version，导致 dry-run 和引擎测试无法运行。通用工程检查也不能证明上海核心行程符合 Evals。

### 决策
- 以现有 version=1 配置、实验映射和 T/E 编号为唯一运行契约；文档校验与引擎共用验证器。
- Builder 使用 workspace-write；独立 Critic 使用 read-only。每个任务必须同时满足确定性行为检查和相关 Evals 的具体证据。
- 上海实验的行为检查调用现有 /api/trip-concierge，保存输入和实际输出；受控故障注入单独标记，不能冒充实时事实或用户体验。
- 保留默认干净工作区要求。显式 --allow-dirty 时先保存非忽略文件与 Git diff 快照，不自动提交、stash 或删除既有工作。
- 保护产品定义、运行控制和已有测试断言；需要改变标准时停止并交给人。重试上限与重复失败上限均由代码执行。
- 工程全部通过后停止于 awaiting_human；用户价值仍需人体验和目标用户证据，不由工程测试宣布成立。

### 验证边界
自动断言只覆盖可机器检查的部分；地理顺序、偏好质量、事实依据和 UI 可理解性仍需独立评审。T-004 的开放事实 adapter 故障注入门槛需要生产流程真正使用该 adapter 才可验收。

### 何时重新评估
真实运行暴露行为检查覆盖缺口时补充证据与检查；不能通过降低既有 Evals 达到通过。

---

## D-007 — 上海首次规划使用实查地点与有限修复，未知事实保持可见

**日期**：2026-10-09  
**状态**：Accepted

### 背景
T-001 的真实请求暴露了跨区拼接、将轮渡伪装成纯步行、用餐与移动重叠，以及甜品/饮品地点被当作正餐的问题。只通过类型检查和模型文本检查不足以验收。

### 决策
- 首次上海规划以老城/外滩、历史街区、陆家嘴等搜索种子取得实查地图地点；种子不是已验证旅行事实。市界、坐标、路线和偏好质量检查失败时，最多一次模型修复，再尝试仅使用已查地点的有限分区修复，仍不满足则明确失败。
- 保留午餐和晚餐时间，并检查停留、移动和用餐的冲突。缺少路线时使用明确标注的保守规划余量，不能宣称为供应商实际交通估计。
- 餐饮候选从最终路线锚点附近查询，提供地点名称、供应商类别、地图链接和查询距离；距离不冒充步行耗时。营业、菜单、预约和饮食适配未核实时明确标记；查询失败保留用餐窗口并说明缺失。
- 供应商类别不能消除与甜品专门店身份的冲突。本轮过滤已排除多种泛餐饮、茶饮和糕饼类别，但仍漏掉被归类为日式餐厅的铜锣烧专门店，因此 T-001 保留失败，下一轮先处理该冲突。
- 新增受控生产 POST 回归加入后续硬门槛；受控数据、实际 API 输出和父会话页面观察分别注明来源。初次规划的实现不等于局部修改已支持，T-002 另验收。

### 验证边界与下一步
本轮确定性 E-001、E-002、E-014 通过，但独立 Critic 判 E-001 失败；重试预算用尽后停止，不自动重置状态。当前门票、预约、饮食适配、局部修改一致性及真实游客使用意愿仍未验证。先修正餐分类并复验，再推进局部重规划，不扩展登录、支付或全国覆盖。

---

## D-008 — 汉语学习先做独立场景原型

**日期**：2026-10-10
**状态**：Accepted for prototype exploration

用户要求先设计帮助外国人学汉语的 App，并确认零基础日常交流定位。这与已有旅行核心闭环属于不同产品探索，因此保留 D-001～D-007，新增 `docs/experiments/mandarin-learning/`，不改旅行运行时或旅行 Evals。

先用英语辅助的咖啡店三句短课、理解检查、两轮固定情境对话和本地复习验证界面闭环。原型不接入 AI 对话、录音或发音评分；系统合成音注明来源，音频不可用提供文字恢复路径，课程完成不表示会说汉语。此轮不建设账号、支付与大规模课程库。

用户是否能脱离选项完成交流、教学内容是否准确、日常场景是否值得再次使用，需教师审校与目标用户实验。验证这些问题后再决定扩展课程或将学习能力与旅行产品关联。


---

## D-009 — 全视口行程工作区；Mapbox 先评估展示层

**日期**：2026-10-10
**状态**：Implemented; browser and product validation pending

用户明确要求借鉴工具 A 的铺满网页布局，并评估 Mapbox 替换高德。将 Planner 改为对话、每日行程、地图三栏，紧凑顶栏，各栏独立滚动；窄屏三视图切换。复用现有景点选择、修改、撤销与新行程回调，保留数据可信度提示；其他页面与经典版保持原站点外壳。

Mapbox 公开 Search Box 覆盖说明不含中国，Directions 没有公交 profile，不能作为当前高德地点与交通全栈替代。英文底图与定制绘制值得小范围比较，但混合数据方案先确认供应商授权、坐标系对齐和国内网络实测。本轮不切换供应商。详细观察、官方来源、费用阶梯与工程估计见 `docs/experiments/planner-workspace-mapbox.md`。

编译、静态检查及相关受控回归通过；自动浏览器被 URL 安全策略拒绝，实际视觉和交互未验收。布局不证明旅行质量或使用意愿提高。保留既有 T-001 失败与 Human Gate 规则，不改变旅行 Evals 标准。


---

## D-010 — Google 优先地图展示；数据接口逐项迁移

**日期**：2026-10-10
**状态**：Direction accepted; migration validation pending

用户放弃 Mapbox，并因高德英文地图年费选择 Google Maps。此决策更新 D-009 的地图候选方向，保留工作区布局实验；本轮只审计，不修改运行时。

Google Maps JavaScript 作为优先展示层。地点/附近餐饮/详情/照片、步行和驾车有对应接口，完成中国样本与字段适配后迁移；公交/地铁/城际公共交通先保留到实测通过，不能由通用覆盖表推断可用性。Google Weather 官方 CN 不支持，不能替代当前中国天气查询。

高德行政编码、类别、ID、坐标、保存与来源标注需适配，质量门槛不能取消。混合供应商时确认许可和坐标对齐；按量费用与 Places 字段计费需实算。完整清单见 docs/workflows/google-maps-api-audit.md。既有 T-001 失败与旅行 Evals 保持，国内访问、公交和中国 POI 完整度尚未验证。

---

## D-011 — Google 地点与道路路线；高德只保留天气和公交

**日期**：2026-10-11
**状态**：Server integration and regressions passed; browser and product validation pending

用户明确要求只保留高德 `v3/weather/weatherInfo`、`v5/direction/transit/integrated`。此记录推进 D-010：Planner / destinations 底图、地点、附近餐饮、详情与照片、步行/驾车、静态图均改用 Google；移除高德 JS SDK 与通用代理，不保留其他高德回退。北京试点的旧 `/api/amap` URL 仅作兼容，底层为 Google。

Google 行政信息通过显式地区映射为保留服务提供编码；地区无法确认不猜测。Google 原生坐标直接使用，高德公交请求及返回坐标单独转换。路线与备选分别标明供应商；既有预约、偏好、跨江、排程及数据缺失标准保留。

Google 餐厅类别不足以声称本帮菜，故只展示实际类别；测试改用对应字段验证同一来源、距离、类别和错误恢复要求。浏览器持久化只保留行程选择及 place IDs，重新打开核对地图事实，不存过期照片资源或永久地点详情。照片展示同一次查找对应的作者。

相关受控回归、静态检查与 Webpack 生产构建通过；默认 Turbopack 构建受本机 CSS 编译临时端口限制。尚未配置独立服务端 Google Key，本机 Google API 权限探测未能连通，因此不能宣称真实 POI 覆盖、计费权限或地图对齐通过。既有 T-001 失败与 Product Human Gate 保留。实施与配置、受控证据限制见 `docs/workflows/google-maps-migration.md`。

**同日验证跟进**：用户随后配置了独立服务端 Key，重启应用确认读取成功。Google API 及主机探测仍超时，权限/计费未知。真实 E-001/E-002/E-014 重跑因地点未核实失败，E-014 另触发超过 21:00 的排程检查；未输出最终行程。网络恢复后仍需按原标准复验，不改变供应商边界、既有失败或 Human Gate；详见上述工作流记录与 `.loop/product-evals/2026-10-10T16-53-00-334Z-T-001/report.json`。

**代理及真实性复验**：用户提供本机 7897 代理后，三个 Google 样本与应用数据接口连通；代理仅用于启动进程，阿里云/高德直连。人工抽查发现供应商泛分类不能可靠区分酒店与景点、食品企业/面包糖果店与正餐，故沿用 D-007 的名称冲突门槛：不借用未请求酒店的位置，不以泛餐厅类别覆盖明显非正餐身份；保留明确酒店请求与未验证状态。最终 E-001/E-002/E-014 及相关受控/静态检查通过，保留先前 AI 无来源失败及误匹配样本。第二天减少为已确认的武康停留与用餐窗口，体验价值仍需人工判断；浏览器地图/坐标、实际餐厅营业、局部修改和产品 Human Gate 未通过。本次不重置 Engineering Loop，详见工作流和 `.loop/product-evals/2026-10-10T17-10-47-734Z-T-001/report.json`。


---

## D-012 — 现有长行程生成的有限等待时间

**日期**：2026-10-11
**状态**：Accepted；真实请求验证见 TASKS 与模型诊断证据

用户给出十天、重庆/西安/成都/九寨沟、两人、美食与文化的原始失败请求。实测资料查询约 29 秒后进入草稿生成，模型请求在 75,003 ms 被现有 AbortSignal 中止，整次请求约 104 秒后失败。记录为已复现的应用超时，不泛称密钥或模型不可用。证据 `.loop/model-access/2026-10-10T17-58-25-373Z-ten-day-before/summary.json`。

现有模型接口已经允许 1–10 天的 JSON 行程，但原 75 秒单次等待不足以完成该输入；将草稿与修正模型调用的等待上限改为 180 秒，仍有限时、明确错误和保留旧行程，不自动重复付费请求。研究、地点/路线 API 的等待和质量门槛保持原值。该改变只修复现有接口的生成等待问题，不将 Later 的多城市十日行程宣布为已完成产品能力，也不证明跨城交通、重庆高差或九寨沟出行安排可靠。若仍超时或输出被截断，应按真实证据继续处理，不放宽事实或可执行性标准。

**同一输入复验**：调整后约 131 秒返回十天草稿，模型阶段约 101 秒，超过原上限但在新上限内。证据 `.loop/model-access/2026-10-10T18-01-14-898Z-ten-day-after/summary.json`。受控回归和静态检查通过。人工检查仍发现酒店接送占位停留、未核实的跨城交通与地点，因此行程可执行性未通过；本次不修改生成提示或 Eval 标准，也不将连接修复作为长行程产品质量通过。

---

## D-013 — 采用参考页的全站基础字号

**日期**：2026-10-11
**状态**：Implemented；主要页面与响应式交互检查通过，用户阅读体验待确认

用户指出全站文字偏小，并指定 `http://localhost:43123/plan` 为字号参考。浏览器实测该页正文 16px、常用按钮/标签 14px、辅助说明 12px；现有工作台正文多为 11–12px、提示部分为 8–10px。全站共享 rem 字号变量统一为正文 16px、控件 14px、辅助说明至少 12px，工作台卡片标题 18px。保留已有字体和大型标题层级，移动断点不再缩小正文；手机导航分行、中等屏幕使用可展开菜单以避免文字挤压。

桌面首页/目的地、手机目的地/指南/中文首页，以及 1440px 和 390px 工作台已检查；850px 导航展开/关闭、日期切换、手机视图切换和输入启用发送按钮通过。最初发现的手机导航横向溢出已修正。CSS 解析、小字号审计和已有工作台回归通过；没有发送新的模型生成请求、重置行程或改变数据验证标准。证据 `output/browser-checks/typography-checks.json`、`typography-desktop.jpg`、`typography-mobile.jpg`。这证明主要页面的文字尺寸与交互表现，不证明所有页面、翻译、浏览器或真实用户阅读偏好均已验证。

---

## D-014 — 规划页复用全站导航；标题归属行程栏

**日期**：2026-10-11
**状态**：Implemented；桌面/手机布局和相关交互检查通过

用户要求规划页顶部导航与其他页面一致、行程标题移到 Itinerary 右侧、删除对话栏重复的 Ramble China。更新 D-009 的专用紧凑顶栏选择：移除 Planner 专用品牌/标题/语言栏，直接显示布局中既有的 Header。三栏占用共享导航下方的剩余视口，保留各栏独立滚动与手机视图切换。完整行程标题作为行程栏头部 h1，允许换行；总览内不再重复同一标题。对话栏保留助手名称、头像和 New trip。

1440×900 桌面和 390×844 手机检查显示共享导航可见、标题位于行程栏、只有一个行程 h1、正文区域底部与视口对齐且无页面横向溢出。带长标题的现有上海草稿在两种宽度下均换行显示。日期切换、手机导航展开/关闭、Assistant/Itinerary 切换及 New trip 确认后取消通过，现有草稿保留。TypeScript、修改组件 ESLint、CSS 解析和既有工作台回归通过。截图 `output/browser-checks/planner-header-desktop.jpg`、`planner-header-mobile.jpg`。仅展示调整，未发送新的生成请求或改动旅行逻辑/Eval 标准；用户截图中的十天输出质量与既有 Human Gate 仍是独立问题。

**标题层级跟进**：用户随后要求行程标题放到 Itinerary 下方，并与天数字号一致，取代本决策最初的右侧标题布局。行程标题改为左对齐、12px、常规字重；天数保留右侧并同为 12px。1440px 桌面及 390px 手机实测标题和天数均为 12px，标题在 Itinerary 下方，无横向溢出。组件 ESLint 与 CSS 解析通过，现有行程未重置。截图 `output/browser-checks/planner-title-caption.jpg`。保留共享导航与旅行验证边界。

---

## D-015 — 天数与连续日期作为生成发布的硬约束

**日期**：2026-10-11
**状态**：Calendar contract implemented and live replay passed；多城市可执行性未通过

用户报告十天、重庆/西安/成都/九寨沟、两人、美食文化、10 月 20 日出发，实际只返回八天。代码审查确认原 normalizeDraft 删除没有景点的日期，且只有部分上海场景检查天数；标题不能证明实际天数。未取得用户原八天模型原文，因此不能断言那次具体是哪条路径导致漏天。

从用户消息提取明确天数和出发日，不从模型回复/标题采信天数。出发日不写年份时按上海时区取下一次该日期；本请求解析为 2026-10-20。支持 1–10 天，明确超限或无效日期不调用生成。后续局部修改继承已有天数/日期，明确新天数或日期才覆盖。模型正式 days JSON 加 kind（visit/transfer/rest）；有说明的交通/休息日可无景点，但保留日历日，不虚构接送/酒店停留补数。展示这类日期为交通/休息日，不把未知交通显示为 0 分钟。

草稿先检查实际日数、连续日期及空日用途，失败时复用资料修正一次；修正仍失败只输出错误，已有计划不变。供应商处理后再检查，原上海偏好/地理/排程与有限修正门槛保留。日志仅记录天数、日期问题数、空日数，不输出密钥或模型原文。新受控回归加入 check:product 与 Loop deterministic verification，不重置原 Loop/Human Gate。

首次真实重放被新门槛拦截：修正后第一天仍为空且缺少明确用途，保留 `.loop/trip-calendar/2026-10-10T20-03-34-015Z-ten-day-live/report.json`。补齐正式 JSON 格式后第二次约 92 秒返回十天、10 月 20–29 日和四个目的地，包含四个无景点交通日，经历一次修正（原草稿为 11 天，另有一个未说明用途的空日）。证据 `.loop/trip-calendar/2026-10-10T20-06-14-811Z-ten-day-live/`。受控少天/错日/无用途空日/持续失败/旧行程保留/交通休息日恢复、concierge、trip-routing、workbench、上海有限修正回归通过；真实 E-001/E-002/E-014 全通过，见 `.loop/product-evals/2026-10-10T20-03-50-786Z-T-001/report.json`。历史失败仍保留。

切换 Critic 角色抽查后，旅行可执行性仍未通过：跨城没有核实的班次/时长，草稿说明中仍含模型给出的大致铁路/公路时长和公共交通可用性断言；九寨沟地点未匹配；重庆唯一游览日安排美心项目是否符合美食文化偏好需要重审。第十天游览后返程未安排，应确认用户抵达/离开地点及时间。本次只证明十天与日期约束和失败保护，不宣称推荐真实性、多城市可执行性或产品假设成立；下一步按已有质量门槛处理这些缺口。

---

## D-016 — 紧凑导航与灯笼路径品牌标志

**日期**：2026-10-11
**状态**：Implemented；桌面/手机布局与导航交互验证通过，品牌偏好待用户确认

用户提供 Lantern 导航参考，指出共享导航与正文区分不明显、缺少图形 logo，Travel essentials 标题喧宾夺主。采用暖白导航、细边框、浅金色圆角栏目选中态及朱红导航按钮；桌面高度 72px、手机 68px，保留现有菜单目的地与语言切换。各主栏目与目的地详情均标记当前栏目；手机将指南链接放入菜单，中等宽度保留右侧按钮，避免重复。

新增原创 SVG 灯笼，内部两端地点与弯曲路径呼应 Ramble 的旅行含义。朱红/金色图形配深绿衬线 Ramble China 字标和 12px 本地化规划说明，应用于共享导航、页脚与浏览器图标。矢量资产 `public/brand/ramble-mark.svg`、`ramble-logo.svg` 可复用；不是引用 Lantern 的现有图形文件。

只缩小 Travel essentials 页头标题：桌面 36px、手机 28px，保留两行文案；淡桃色到淡绿色背景区分导航与内容。正文继续 16px，导航 14px，辅助文字至少 12px，遵循 D-013。规划栏标题保持 D-014 的 12px 与既有位置。

1440px 桌面和 390px 手机检查标志加载、当前栏目、标题字号、无横向溢出；850px 菜单展开/关闭，手机导航进入规划页，中文菜单与韩文导航通过。初次 320px 检查发现导航溢出，调整边距和语言框后无溢出。规划页主区底部与视口一致，旧行程保留。TypeScript、修改文件 ESLint、CSS 解析、既有 i18n 与 workbench 回归通过；纯展示修改不触及旅行生成/排序/数据回退，不重复付费旅行 Evals，也不重置原 Loop/Human Gate。截图 `output/browser-checks/navigation-brand-desktop.jpg`、`navigation-brand-mobile.jpg`、`navigation-brand-mobile-menu.jpg`。视觉偏好与真实用户对栏目识别的改善仍需确认。


---

## D-017 — 参考层级，建立 Ramble 自有导航与品牌

**日期**：2026-10-11
**状态**：Implemented；布局与交互验证通过，视觉偏好待用户评审

用户澄清 D-016 的参考意图是借鉴简洁清晰的风格，不是使用灯笼或相同的导航设计。此次替代 D-016 的灯笼、浅金圆角选中态和朱红导航按钮；保留上次缩小的行前准备标题和共享导航结构，不重写历史决策。

品牌采用原创深绿 R 路径字母标志：连续线形成 R，金色端点表示旅程目的地。共享导航、页脚及浏览器图标使用同一 SVG 标志；单行衬线 Ramble China 字标去掉小字说明，减少层级。桌面导航为白色 76px 横带，细线标识当前栏目；右侧语言/收藏/指南以轻分隔线整理，指南按钮为深绿、轻圆角。手机 68px，菜单采用左侧细线与浅绿选中态。行前准备页头改为单色浅绿，避免延续参考图的渐变配色；标题仍为桌面 36px/手机 28px。

1440px 桌面、390px 手机、320px 窄屏和 1150px 中屏无横向溢出，标志加载、当前栏目、手机菜单及进入规划页通过；进入规划页后原上海三天草稿保留，主区底部匹配视口。语言选择与中文菜单验证通过。TypeScript、组件 ESLint、CSS/SVG 解析、i18n 和 planner-workbench 回归通过。截图 `output/browser-checks/ramble-navigation-original-desktop.jpg`、`ramble-navigation-original-mobile.jpg`。纯展示改动未触及旅行生成、数据回退或 Evals 标准，不重复付费旅行 Evals，不重置 Loop/Human Gate。

本次没有证明新标志辨识度或导航阅读效果优于旧版，下一步以用户视觉反馈与栏目识别体验判断。


### D-017 跟进 — 去除 slogan，直接复用规划页 R 字母标志

2026-10-11，用户要求去掉「Find your kind of China.」与「Arrive ready. Travel with room to explore.」，并直接使用 Plan a Trip 原有 R 字母。目的地页和行前准备页删除可见大幅 slogan，保留屏幕阅读器可用的语义页面名称；Directory 的相同 slogan 一并去除，搜索/筛选和实用说明保留。

共享导航和页脚以原规划页相同的 33px 深绿圆角方块、19px Georgia 白色 R 替代上次的路径图案；浏览器图标与可复用 SVG 同步为纯 R 字母。对话栏顶部移除 R，标题改为 h2，与 Itinerary 共用 Arial 18px、600 字重、1.3 行高。保留标题完整文案，窄栏允许换行，避免缩小字体。

实测目的地/行前准备页不显示两句 slogan；标题仍保留无障碍名称。1440px 桌面、390px 手机、320px 窄屏无横向溢出；实际对话/行程标题字体与行高一致，对话栏 R 数量为零，顶部 R 为 33px。目的地无结果提示与清除搜索恢复 42 个城市、手机菜单与行程视图切换通过，当前三天草稿保留。TypeScript、修改文件 ESLint、CSS/SVG 解析、i18n/workbench 回归通过。证据 `output/browser-checks/slogans-removed-essentials.jpg`、`slogans-removed-destinations.jpg`、`plain-r-planner-headings-desktop.jpg`、`plain-r-planner-headings-mobile.jpg`。

此次只调整展示，不改变旅行 Evals 标准、数据接口或 Loop/Human Gate；页面识别和品牌阅读效果仍待用户反馈。


### D-017 跟进 — 地图栏标题层级统一

2026-10-11，按用户要求删除地图顶部「YOUR ROUTE ON THE MAP」及对应中文说明行，地图标题（全程、单日和空计划）与 Itinerary / 对话栏标题共用 Arial 18px、600 字重、1.3 行高、零外边距。保留 Google Maps 供应商标签和地图路径说明。

桌面 1440px 与手机 390px 实测：说明行消失，Your whole trip 与 Itinerary 字体、字号、字重、行高相同，无横向溢出；手机第 2 天/全部行程切换正常，现有三天草稿保留。开发预览初次仍显示旧模块，刷新后已核对新版本。TypeScript、Planner ESLint、CSS 解析及 workbench 回归通过。截图 `output/browser-checks/map-heading-matched-desktop.jpg`、`map-heading-matched-mobile.jpg`。纯展示改动未改变旅行 Evals 或 Loop/Human Gate；整体阅读感受仍待用户反馈。


D-017 栏头继续简化（2026-10-11）：按用户要求移除 Itinerary 右侧天数标签及无用样式，保留行程标题、日期导航和总览中的天数。1440px 桌面与 390px 手机实测标签不存在、无横向溢出，日期导航与原三天草稿保留；Planner ESLint、CSS 解析通过。截图 `output/browser-checks/itinerary-no-header-days.jpg`。此次纯展示删除不改变生成天数门槛、旅行 Evals 或 Loop/Human Gate；下一步查看栏头阅读效果。

---

## D-018 — 扩大对话栏，把游览详情放到地图景点弹卡

**日期**：2026-10-11
**状态**：Implemented；桌面/手机交互及真实 Google 照片验证通过，阅读与修改体验待用户评审

用户反馈左侧对话栏过窄，单日地图字母编号与行程数字编号不一致，景点详情在行程和地图底部重复。桌面三栏按对话/行程/地图 4:3:3 分配，窄屏保留视图切换。全程和单日地图均使用与行程相同的「天.停留」数字编号，酒店仍以 H 表示。

移除行程内 Visit details 展开区及地图底部景点详情，点击地图气泡或行程景点定位按钮打开地图弹卡。弹卡包含真实景点照片、编号、名称、类别、计划时间与停留时长、已有景点介绍/推荐理由/现场提醒/预约说明、地点与开放时间的核实状态、票价来源及 Google 地点链接；不添加参考图中的无来源评分、价格或订购按钮。关闭按钮和 Escape 可关闭弹卡，切换日期/总览也会关闭；全程地图点击不同天的地点保持全程视图。地图加载失败或地点未匹配时仍可从行程查看详情，不伪造地图坐标。

照片通过现有 trip-place-photos 服务按景点按需获取 Google Places Photos，保留 Google Maps 及返回的作者署名/链接；不以城市图片替代景点照片，不把临时照片 URL 加入草稿持久化。加载中、请求/图片失败、Google 没有照片和地点未匹配分别提示，已匹配地点支持重试。Google 未提供照片时无法保证每个停留都有实景照片，明确显示缺失。英文页面遇到中文营业时间只说明原文语言并要求向场馆确认，不声称已翻译或核实。

1440px 桌面实测三栏 576/432/432px，无横向溢出。豫园、外滩和上海中心真实照片加载成功并显示作者；单日数字编号、行程定位打开卡片、全程跨天切换、关闭/Escape、日期切换通过。390px 手机真实照片弹卡可用；320px 窄屏未匹配思南景点明确提示无照片，详情可滚动、关闭按钮可用，无横向溢出。旧上海三天草稿保留。验证中修复地图实例重新加载后图层未重绘的问题，并取消会误关闭跨天弹卡的地图背景点击监听。

TypeScript、修改组件 ESLint、CSS 解析、既有 map-providers、trip-routing、planner-workbench 与 i18n 回归通过。证据 `output/browser-checks/planner-map-place-card-desktop.jpg`、`planner-map-place-card-mobile.jpg`、`planner-map-place-card-unmatched.jpg`。此改动仅涉及展示、交互和按需照片读取，未改变行程生成、排序、核实/回退语义、Evals 标准或 Loop/Human Gate；不重复付费模型旅行 Evals。下一步由用户使用较长行程检查更宽对话栏和弹卡阅读效果。

---

## D-019 — 审查景点别名，明确街区照片的拍摄主体

**日期**：2026-10-11
**状态**：Implemented；两个公开景点实查与受控回归通过，完整多城市行程仍未验收

真实 Google 请求复现用户报告：`秦始皇兵马俑博物馆` 返回临潼的 `秦始皇帝陵博物院`，原字符串包含规则拒绝名称差异；英文常用名同样失败。`解放碑步行街` 地点匹配成功，但 Google 首图是远东百货，其余图片还有商店室内和小吃摊。接口成功与作者署名不能证明图片代表性。

依据博物院官网 `https://www.bmy.com.cn/about/` 和重庆政府街区介绍，建立少量中英文别名。已知景点同时要求名称、供应商城市、类别和粗范围位置匹配，不降低一般相似名称阈值；返回的仍是实时 Google 坐标，粗范围仅用于拒绝异常点。排除停车场、车站和邻近酒店；兼容 `Chong Qing Shi` 与 Xi'an 行政区拼写。保存的 Google ID 经过同样校验；非已审查别名仍要求完全相同的名称，避免扩大旧 ID 的信任范围。

解放碑保留步行街地图地点，照片取步行街中心的人民解放纪念碑，实时重新校验其名称/城市/类别/位置；图下注明 `Jiefangbei Monument · pedestrian street center`、主体地点链接、Google 和作者。街区/地标关系来源：`https://www.cq.gov.cn/zt/cyscjjq/xtfz/gjxfmdd/202411/t20241120_13817368.html` 与 `https://dfz.cq.gov.cn/zqlswh/fjms_417821/202311/t20231102_12511619.html`。仅保留 Place ID，照片资源名和临时 URI 不进入浏览器草稿；照片资源必须属于实际请求的地点。主体或照片缺失时明确提示，不退回百货商店首图。其他地点仍使用 Google 提供的照片，未宣称所有上传图片已人工审查。

兵马俑中英文常用名均匹配到 `ChIJowMUgi2nZDYRxz_j6XQ-48M`，Google 原始坐标 109.2784918/34.3841153；兵马俑与解放碑实景照片在实际地图组件弹卡中加载。另修复图片/署名增加高度后的裁切，隔离弹卡与底图手势；点击气泡和关闭按钮验证通过。证据 `output/browser-checks/poi-identity-fixed.jpg` 和 `output/poi-identity/verified-plan.json`。临时页面仅展示两个独立公开地点，验证后移除，不作为旅行提案；用户草稿未覆盖。整份十日重放被自动审批拒绝后，只提交两个景点名称/城市，不继续发送完整预约或偏好，不宣称完整十日实际回归通过。

新增 `test:place-identity` 先复现再修复，覆盖别名、错误城市/类别/位置、保存 ID 与预约保留、照片主体/署名、主体缺失、照片错误归属，接入 check:product 和 Loop 硬门槛。TypeScript、修改文件 ESLint、map-providers、concierge、trip-routing、trip-calendar、workbench、六组上海受控回归通过。发现 D-018 移动 Visit details 后，attempt-three 仍在旧 Overview 中找入场提示；保留原断言并改为检查实际 MapPlaceCard，旧/新组件都不得显示未经核实的入场规则。Evals 标准及 Loop/Human Gate 未降低或重置，未重复付费模型生成 Evals。下一步刷新旧草稿核对这两个地点，继续按已有标准审查交通与其他照片。

D-019 底图名称跟进（2026-10-11）：用户确认兵马俑位置正确，但嵌入底图放大仍无名称。代码此前将全部 `poi` 的 `labels` 设为 `visibility: off`，现移除该样式，恢复 Google 默认 POI 标签，保留英文加载参数和自有编号/弹卡交互。依据 Google 官方 style-reference 与 localization 文档，这属于应用样式配置，不是浏览器 Key 权限缺失；恢复标签不保证每个地点/缩放级别均显示中英文名称，也不保证与 Google Maps 网站的详情展示一致。实际上海草稿底图已显示金茂大厦、吴昌硕纪念馆、上海环球金融中心中英文名称；缩放、适配范围和弹卡关闭通过，TypeScript、组件 ESLint、workbench 回归通过。截图 `output/browser-checks/google-poi-labels-restored.jpg`。此次未重新生成行程，未实查兵马俑各级缩放标签，不改变旅行数据、Evals 标准或 Human Gate。

D-017 内容入口简化跟进（2026-10-11）：按用户三张截图删除行前准备页的 PART 01 介绍段和两项快捷操作、目的地页的 collection 介绍段、共享导航桌面/手机 Saved 入口。保留无障碍页面名称及首页 before-you-go 锚点，删除空容器和相应样式；行前准备图片从导航下方 32px 开始，目的地搜索仍保留。1440px 桌面和 390px 手机无横向溢出，手机菜单保留指南入口；搜索上海、无结果提示及清除筛选恢复 42 个目的地通过。TypeScript、修改组件 ESLint、CSS 解析、i18n 和 editorial 回归通过；截图 `output/browser-checks/essentials-intro-removed.jpg`、`destinations-intro-saved-removed.jpg`。此展示删减不改变旅行事实、生成逻辑、旅行 Evals 标准或 Human Gate；阅读效果仍待用户反馈。

---

## D-020 — 网站只发布英文，继续收紧导航与行前准备首屏

**日期**：2026-10-11
**状态**：Implemented；路由、桌面/手机布局及受控回归通过，用户阅读效果待反馈

用户要求删除 Daybook 入口、只保留英文版本、删除 Travel essentials 导航下的图片。移除共享导航中的 Daybook 与语言选择，保留目的地、行前准备、规划和指南。行前准备删除上海照片、覆盖文字和署名块，正文距导航 32px，保留准备事项、章节索引及首页锚点。

将网站发布语言从英文/韩文/中文改为仅英文；历史翻译作为未发布内容保留。根路径不再按浏览器语言选择中文/韩文；旧中文/韩文页面由既有 proxy 转到同路径英文页，保留查询参数。布局也只接受发布语言，HTML 标记为 en。此决策替代此前多语言网站入口和 D-017 中保留首图的选择；网站版本收紧不改变行程真实性或旅行 Evals 门槛。

既有 i18n 测试按有意发布范围变更更新，仍核对三个语言内容的事实指纹与数据身份，新增旧链接保留路径/参数、浏览器语言不改变英文入口、英文无重定向、未发布语言返回 404 的检查。TypeScript、修改文件 ESLint、CSS 解析、i18n 与 editorial 回归通过。实际 localhost 中文/韩文链接转到英文行前准备页，1440/390/320px 无横向溢出，手机菜单展开/关闭与指南入口正常，导航无 Daybook/语言选择，首图不存在。证据 `output/browser-checks/english-only-essentials-desktop.jpg`、`english-only-essentials-mobile.jpg`。不重跑付费旅行生成 Evals，不重置 Loop/Human Gate；下一步由用户查看内容起始位置与简化导航。

---

## D-021 — 固定共享导航，接收本地导游咨询供人工查看

**日期**：2026-10-11
**状态**：Implemented；本机提交/存储与受控故障检查通过，真实需求与转化待验证

按用户要求，共享导航采用 sticky/top:0 保持滚动可见，桌面/手机指南按钮改为 Need local guide，指向 `/en/local-guide`。保留导航占据的布局空间和锚点偏移，规划页仍使用其下的剩余高度。此入口替代 D-020 导航中的指南入口；原指南内容页面保留。

用户明确选择「先保存在服务器，人工查看」。需求表单只建立咨询闭环：服务器校验邮箱、目的地、人数、同意联系与可选日期，日期倒置等错误不保存；失败时保留输入，保存成功才返回需求编号。相同提交 ID/内容的重试复用回执，变更内容同 ID 返回冲突。私有 JSON 在临时文件写完并同步后独占发布，目录/文件权限为 0700/0600，默认 `.data/guide-requests`，Git 忽略，无公开读取/列表接口。提供大小限制、同源校验与蜜罐；不创建导游库存、虚假匹配、付款或自动外发联系信息。

上线应配置 `LOCAL_GUIDE_REQUESTS_DIR` 到私有持久磁盘并保留跨发布挂载。暂存型无服务器磁盘无法承担此保存方案；人工查看步骤见 `docs/workflows/local-guide-requests.md`。提交页明确 availability/services/price 仍需后续确认，不承诺导游已预订或人工回复期限。

浏览器中合成需求先因结束日期早于开始日期被拒绝，原输入保留，修正后取得编号并核对真实服务器 JSON/0600 权限。长页面滚动至约 4984px，导航顶部为 0；1440px 规划页主区为 824px，原三天草稿保留。390/320px 无横向溢出，手机菜单包含需求入口，窄屏滚动时导航顶部仍为 0。TypeScript、相关 ESLint、guide-requests/i18n/editorial/workbench 回归通过。证据 `output/browser-checks/local-guide-request-desktop.jpg`、`local-guide-request-success.jpg` 和 `local-guide-navigation-sticky.jpg`。合成记录移到测试证据目录，避免混入待处理需求。

本次不改变旅行生成/排序/核实/回退、旅行 Evals 标准或 Loop/Human Gate。表单可用不能证明导游需求和商业转化；下一步人工处理真实咨询，观察信息是否足够联系与报价。

### D-021 跟进 — 导游需求提供常用选项

2026-10-11，按用户要求恢复共享导航的网站语言下拉框，但只提供 English；这替代 D-020 的隐藏语言控件选择，不重新发布中文/韩文。导游语种提供英语、西班牙语、法语、德语、意大利语、葡萄牙语、俄语、日语、韩语、阿拉伯语、普通话及其他语种（在说明中补充）。需求页提供北京、上海、西安、成都、重庆、桂林、杭州、苏州、张家界、广州 10 个可取消的多选按钮，并保留其他地点输入；两者合并保存至既有 destinations 字段，选项并不限制可咨询范围。

预算改为 USD 团队日预算偏好：未定、低于 100、100–199、200–299、300–499、500+；页面明确这不是导游报价。按用户指定，联系授权默认勾选，仍允许取消，取消后不得提交，服务端 true 校验保留。服务器 JSON 格式及人工查看流程保持兼容，不增加导游匹配或价格承诺。

浏览器选择重庆/成都、补充九寨沟、法语及 USD 200–299，经日期冲突保留后修正提交，服务器记录准确且取消的上海不残留；合成记录归档到 `output/browser-checks/local-guide-options-qa-record.json`，未混入人工需求队列。取消全部城市后补充输入恢复必填，取消联系授权阻止提交。桌面与 320px 手机导航/城市按钮/下拉框无横向溢出，手机菜单正常。TypeScript、相关 ESLint、guide-requests/i18n/editorial 及 CSS 解析通过。证据 `output/browser-checks/local-guide-options-desktop.jpg`、`local-guide-options-mobile.jpg`。旅行 Evals 与 Human Gate 不变；城市/语言/预算选择是否足够仍需真实用户反馈。

预算与城市补充（2026-10-11）：用户认为原预算档位过密，指定改为 Under USD 1,000、USD 1,000–3,000、USD 3,000–5,000、USD 5,000–10,000、USD 10,000+；保留 Not decided yet，仍为团队日预算偏好。增加 Shenzhen 城市按钮，其他地点仍可手填。浏览器验证深圳可选与新预算值，guide-requests 受控生产保存回归验证深圳/补充地点及 USD 1,000–3,000 准确写入，相关 ESLint 通过。截图 `output/browser-checks/local-guide-budget-shenzhen.jpg`。此选择替代上次预算输入档位，不改变旧记录、实际价格承诺、旅行 Evals 或 Human Gate；下一步观察真实填写适配。


---

## D-022 — 扩大地图并同步日期定位，对齐目的地筛选

**日期**：2026-10-11
**状态**：Implemented；桌面/手机交互与受控回归通过，长行程阅读效果待用户反馈

按用户要求，将 Plan a trip 桌面对话/行程/地图改为 3:3:4，替代 D-018 的 4:3:3。地图日期和行程日期共用选择处理，选择后只滚动中间行程容器，目标日距容器顶部约 10px；重复选择同一天也可重新定位。手机地图视图下暂存定位请求，切回行程后执行；已执行的请求不会因之后的数据更新重复滚动。新行程、总览和撤销清除待执行定位。保留减少动态效果设置，避免滚动整个页面或对话栏。

Destinations 的搜索框与区域按钮在桌面同一行，统一为 48px 高并垂直居中；窄屏上下排列，区域按钮单独横向滚动。区域、关键词、清除筛选和缺失结果语义保留。

1440px 实测三栏 432/432/576px；已有上海三天草稿保留，Google 底图加载，地图第 1/2/3 天切换与重复日期定位通过，页面滚动始终为 0。390px 手机地图选择第三天后切回行程，正确定位第三天；320px 目的地页无横向溢出。桌面搜索/区域按钮均 y=110px、高 48px；East + Shanghai 返回 1 个结果，无结果后清除恢复 42 城市。TypeScript、两组件 ESLint、CSS 解析、planner-workbench、editorial 受控回归通过。证据：`output/browser-checks/planner-three-three-four-day-sync.jpg`、`planner-day-sync-mobile.jpg`、`destinations-aligned-toolbar.jpg`。

假设是更宽的地图和同步日期能减少查找，但实际十日多城市阅读效果尚未验证。本轮不改变生成、排序、路线数据或旅行 Evals 标准，不重跑付费模型生成 Evals，不重置 Loop / Human Gate。

---

## D-023 — 景点照片分别核对地点身份与画面主体

**日期**：2026-10-11
**状态**：Implemented；三个公开地点实查与受控回归通过，全国照片准确率未验证

用户报告 Jiuzhaigou Valley、Meixin Wine Town 照片错误。当前照片来自 Places API (New) Place Details 的 photos[] 和 Place Photos /media；此前直接取 photos[0]，资源归属校验不能证明画面主体正确。真实查询中，美心首两项搜索结果为售票亭/售票处，正确景区第三；正确景区的两张上传照片仍为停车场与麦加天房前游客照，浏览器核对后拒绝展示。豫园还存在同名行政街区误匹配，已按官网安仁街218号严格 tourist_attraction 搜索确认实际园区。九寨沟记录显示 Jiuzhai Valley National Park，需显式别名及县级城市桥接。

为这三个公开地点加入有官方来源的别名、城市、类别、粗范围核对。照片请求携带当前公开地点名与城市，重新核对 Google ID，资源必须属于该 ID；解放碑仍取 D-019 已标注的中心纪念碑主体。最多三张候选经既有配置的多模态 Qwen 服务逐张画面筛选，只接受结构合格、有具体可见证据且自报置信度至少0.95的结果。模型置信度未经校准，不称为人工验证。未识别、网络/模型失败、不支持的模型、超限均不回退未筛选首图。Google 作者署名随所选照片同步。图片只在请求内存处理，不持久保存资源名/URI，不发送用户完整行程或私人信息。

地图弹卡忽略草稿旧照片，地点身份变化会清空状态，并取消旧请求，避免旧图或晚返回的响应污染新地点。增加每进程24次/分钟筛选上限、图片2MB大小与超时限制；正式部署仍需评估按需请求费用、总流量与延迟。此次配置模型为既有 qwen3.8-flash；无新凭据/供应商。公共样本一次请求约4–5秒，不作为稳定性能承诺。

实查九寨沟显示碧蓝湖水/森林，豫园弹卡显示园内亭廊假山与水池；美心没有合格候选，显示缺失。快速从上海中心切回豫园清空旧图，关闭弹卡通过。证据 `output/browser-checks/photo-screening-reported-places.png`、`photo-screening-yu-garden.png`。新增 verify-photo-screening 纳入 test:place-identity 和 Loop deterministic gate，保留原断言；身份/供应商、六组上海、对话、路线、日历、工作台受控回归及 TypeScript/相关 ESLint 通过。仅验证 E-007/E-014 相关数据缺失与身份门槛，不代表整趟多城市可执行性、全国照片准确率或 Product Human Gate 通过。详见 google-maps-migration 工作流。本决策收紧 D-018/D-019 的首图策略；后续优先人工抽查热门地点，并为 Google 缺失景区寻求可追溯授权照片。

---

## D-024 — 首页呈现当前服务，页脚公开团队与反馈渠道

**日期**：2026-10-11
**状态**：Implemented；桌面/手机入口与布局通过，真实用户理解和转化待验证

用户要求目的地搜索框放到最右侧，旧首页按当前内容重做，移除页脚 Explore China、Design your journey、Photography & sources、独立参考与 September 2026 预览文字，并公开 About us、Fewerpoint 归属及 service@fewerpoint.com。

首页采用简短规划标题、桂林现有授权照片与主规划入口，四个现有服务入口为目的地介绍、行前准备、对话规划和本地导游咨询；提供北京/上海/西安现有城市指南与本地导游请求入口。取代原首页北京一日样板/指南推广和旧版本说明；不展示虚构行程、游客评价、团队规模、导游库存或预订承诺。沿用深绿品牌、16px 正文、紧凑标题与现有 R 标志。图片逐张保留来源、作者和许可，即使页脚移除 credits 链接也不丢失归属信息。

共享页脚改为浅绿独立区域，保留品牌、Part of Fewerpoint、About us、联系邮箱与版权信息。About us 用用户提供的组织描述，说明团队面向海外游客介绍中国、帮助准备与规划，并协助连接本地导游；以提升旅游体验为目标，未虚构供给或服务结果。邮箱为 mailto 链接，不代用户发送邮件。公司链接为 https://fewerpoint.com。

目的地工具栏按区域按钮、搜索框的 DOM 顺序排列，桌面搜索靠最右侧，窄屏搜索在区域按钮下方占满宽度。新页脚使用 site-footer 语义类，规划页继续隐藏页脚以保留剩余视口，打印工具卡也沿用原隐藏规则。

实际1280px首页全部四张授权照片加载，页脚 About us 跳转、团队文字/公司/邮箱链接、行前准备和本地导游跳转通过。搜索框右边距与工具栏一致，East + Shanghai 返回1城，无结果清除恢复42城。390px首页、320px About us/目的地无横向溢出，手机菜单和邮箱显示通过；规划页页脚隐藏，文档高度等于视口。TypeScript、修改组件 ESLint、三份页面CSS解析、i18n/editorial/planner-workbench 回归通过。证据 output/browser-checks/home-current-services-desktop.png、about-fewerpoint-desktop.png、destinations-search-right.png 及对应手机截图。

当前假设是清楚的服务入口与团队/反馈渠道有助于游客理解下一步并建立信任；首页入口转化、阅读效果及真实咨询需求未验证。本次仅调整内容、导航与展示，不改变旅行生成/地点/路线/回退，不重跑付费旅行 Evals，不改变案例标准或 Loop / Human Gate。下一步由用户体验首页层级，再观察访问者进入规划与提交咨询的行为。

**2026-10-11 联系信息更正**：按用户后续指示，移除共享页脚 Part of Fewerpoint 和 About us 正文中的旧归属句/公司链接。邮箱及 mailto 统一更正为 service@fewerpoints.com，Get in touch 邮箱下方补充 Ramble China is part of Fewerpoints Inc.；页面元描述删除旧名称。首页页脚、About us 跳转/正文/邮箱和320px手机无横向溢出实查通过，TypeScript及相关ESLint通过。截图 output/browser-checks/about-contact-corrected.png。只验证展示和链接，未发送邮件，不改变旅行逻辑、Evals标准或Human Gate。


---

## D-025 — Supabase 账户归属、个人行程与导游需求保存

**日期**：2026-10-11
**状态**：代码与受控检查、线上建表与匿名拒绝通过；实际用户登录/保存验证待完成

用户明确要求注册登录、个人信息管理、个人所有行程/导游需求查看，以及数据库保存并重开编辑。此指示扩展 D-001/PRODUCT 第6节的无账户 MVP 及 D-021 的文件存储选择；原核心旅行可执行性/真实性门槛、Engineering Loop 与 Human Gate 不改变。

从 /Users/xianli/codex/travelagent 直接复用 Supabase config/browser/server/proxy 基础，并适配其 Google PKCE 与邮箱 signup → OTP → 设置密码流程；补充邮箱确认链接返回密码步骤、限制内部返回路径及同主机回调。其 PWA/Tailwind 页面和 trip_plans 表结构与本站 VerifiedTrip 不兼容，故保留认证逻辑、重做本站英文界面和独立 ramble_* 表，未修改来源项目。已配置公开 URL/Key 与用户指定项目匹配；不使用 service_role 绕过用户权限。

使用 ramble_profiles、ramble_trips、ramble_guide_requests。SQL 启用 RLS、按 auth.uid 隔离，客户端不得更新导游状态/提交详情；API 另验证用户、所有者、同来源和输入，并禁用私有响应缓存。导游需求编号和原验证逻辑保留，同 ID 重试返回原回执，修改后的重试或另一用户复用 ID 拒绝。工作人员通过授权 Supabase Table Editor 查看，而不是公开管理接口。

My account 管理姓名、国家/地区、导游语言，列表以每页50条遍历所有个人记录；打开行程带 UUID 进入 Plan a trip。完成请求后自动保存最后40条对话及用户行程选择，版本条件更新防跨标签覆盖；丢失响应重试可识别原版本/内容，失败保留内存并显示重试。新的行程与旧行程分离，已保存旧行程仍在账户；待保存时防止内部导航丢失，浏览器关闭/刷新有提示。禁止把数据库错误包装成成功，也不回退浏览器缓存。

延续供应商持久化边界：服务器与客户端剥离地点详情/照片/路线/天气，仅保留 ID、用户选择/预约/日期和已有来源研究；重新打开重新核实，失败保留待核实草稿。旧浏览器草稿需要显式导入，数据库确认成功后才移除旧 key；废止已过时 classic 规划分支。历史导游 JSON 没有验证的 Supabase 用户归属，保留原文件，不能通过邮箱匹配自动放入某个账户。

实际迁移 SQL 在隔离 PostgreSQL 中执行及重跑通过，两用户读写隔离、伪造所有者/匿名拒绝、状态不可修改、重复回执/冲突/数据库故障、版本比较、十日/预约 round trip 通过。生产 React 保存 hook 的创建/重开、保存期间新编辑、错误/重试、版本不漂移、冲突阻止覆盖、新旧行程隔离、加载失败不覆盖通过。原 guide/maps/calendar/routing/concierge/workbench/editorial/i18n 受控回归及 TypeScript/ESLint 通过。i18n 检查仅增加 await 适应异步 proxy，未降低原断言；账户测试加入项目/Loop验证命令。注册切换、规划/账户保护与返回路径、320px无溢出在真实浏览器验证；截图 output/browser-checks/account-signup-desktop.png、account-signup-mobile.png。

线上 auth settings 确认邮箱和 Google 启用；未登录实际 API 返回401/private,no-store，回调拒绝外部跳转并保持当前主机。数据库三表最新检查为 PGRST205 缺失，控制台未登录，因此完整线上闭环判断为 blocked，不能宣称全部用户功能已验收。剩余执行 SQL、确认 callback 白名单/邮件模板、用户注册登录和跨设备/两账户真实保存检查，详见工作流。账户是否提高回访、登录门槛是否影响首次规划仍未知；不以代码通过替代产品验证。

D-025 构建跟进：生产构建已通过（72个静态页面及新增动态账户接口/登录回调）。npm prebuild 的 tsx CLI 在沙箱受IPC限制，改用 node --import tsx 执行相同原检查；Turbopack在沙箱内停滞，中断后在正常执行权限下构建成功。没有降低断言或跳过原检查。

D-025 线上建表跟进（2026-10-11）：用户确认迁移 SQL 执行成功后，使用项目公开 Key 对三张表进行 select=*&limit=0 探测，均返回 HTTP401、42501 permission denied；由原 PGRST205 表缺失变为已存在且匿名拒绝。没有读取任何用户记录。网站仍为未登录状态，线上授权读写、实际注册/登录和两真实用户隔离仍待登录后验证。

---

## D-026 — 首页先提供三个完整风格预览，由用户选定

**日期**：2026-10-11
**状态**：三个预览已实现并通过展示/交互检查；用户随后选择 B，正式落地见 D-027

用户认为 D-024 首页普通且内容重复，要求再做三个风格不同的版本。新增 `/en/home-designs/editorial`、`cinematic`、`notebook`，共享 A/B/C 切换栏；`/en/home-designs` 转到 A，未知名称返回404，预览使用 noindex。保留原正式首页直到用户选择，不擅自把任一候选认定为最终方案。

A 使用暖纸色、棕色斜体大标题、拱形照片及杂志式目的地版面；B 使用满幅桂林照片、深色页面、杏色主入口和错落的照片卡；C 使用奶油黄/钴蓝、手绘线、拍立得拼贴和可用的兴趣筛选。三个版本均按规划、目的地、准备/导游支持分工，删除重复四项服务介绍和独立导游推广段。实际入口沿用现有路由、账户门槛及服务范围，首屏说明规划需登录，不展示虚构 AI 行程、评价、价格或已验证承诺。

仅使用仓库现有授权照片，每张保留作者、来源和许可；人工查看实际画面后修正上海照片的昼夜描述。C 的六城兴趣分类为指南浏览，不改变景点推荐/排序/生成；选 Nature/Culture/Food 分别返回1/2/3城，All恢复6城。1440px桌面、390/320px手机无横向溢出；A/B/C切换、桂林指南跳转、规划入口进入现有登录提示通过，未知版本404。TypeScript、相关ESLint、CSS解析、i18n/editorial/planner-workbench回归通过。Playwright CLI首次加载因包仓库DNS不可达失败，改用已连接的Codex浏览器Playwright接口完成实际检查。证据 `output/playwright/home-concepts/`。

本次不改变旅行事实、生成、排序、路线、开放时间或回退，不重复付费旅行生成，不降低Evals标准或重置Loop/Human Gate。视觉喜好、英文文案理解及真实首次规划转化仍未知；下一步用户选定方向后收敛首页，再观察目标游客下一步行为。

---

## D-027 — 采用 B 首页，在开始新行程时登录，集中静态图片署名

**日期**：2026-10-11
**状态**：Implemented；访客浏览/跳转、展示与受控权限回归通过，实际认证账户端到端重验待完成

用户明确选择 D-026 的 B · 电影感风景作为正式首页，并要求简化文字、调整共享导航、移除图片下署名链接以及开放未登录规划页。正式 `/en` 复用 B，无预览工具栏；删除指定四处文案并缩短副标题/支持段。Start your journey 的认证用户进入规划，访客直接去登录并带返回规划路径；认证加载期间阻止错误导航。Need local guide 紧随 Plan a trip，使用相同导航样式；Sign in 使用原导游按钮的深绿样式，放在最右。手机保留账户入口，窄屏收紧品牌/间距，最窄屏隐藏只有 English 的语言选择。

此决策更新 D-024 的正式首页、D-026 的等待选择状态和 D-025 的整页规划门槛。访客可以看到完整空白工作区，New trip 和其他开始规划动作才跳登录。访客保存 hook 禁止加载私人行程 ID、自动/手动保存及未保存提示，不回退本地缓存或生成虚构样例；认证用户仍使用既有数据隔离/保存/版本冲突恢复。认证身份变化时重新挂载工作区，清除前一个账户的内存状态并中止进行中的生成请求。API 权限不放宽。

所有静态授权图片的图下作者/许可链接移到现有 `/en/credits`，页脚提供 Image credits；保留原文件链接、作者、许可证及裁剪说明。这调整 D-024/D-026 的逐张图下署名展示，不删除来源元数据。Google 实时照片需要显示作者及链接，依其规则放在图内底部角落，不再占用图下独立行。依据：[Google Places 归属要求](https://developers.google.com/maps/documentation/places/web-service/policies)、[CC BY 2.0](https://creativecommons.org/licenses/by/2.0/)、[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)。地图供应商标识与资料来源保留。

1440px桌面、390/320px手机无横向溢出，手机菜单顺序、首页主入口/New trip 访客直接登录及返回路径通过。上海详细指南、桂林普通指南与目的地列表无图下 Photo 链接，Image credits 可访问。受控生产保存 hook 新增访客带私人 ID 也无读取/写入检查，原创建/重开、飞行中新编辑、数据库失败保留、重试版本、冲突、新旧行程隔离和加载失败回归保留。实际 PostgreSQL账户隔离、地点身份/照片故障、i18n/editorial/daybook/workbench、TypeScript/相关ESLint/CSS解析通过。证据 `output/playwright/home-selected/`。

仍未知：实际账户登录后的线上新建/保存/重开、目标游客理解和登录时机对转化的影响。只完成本轮展示与账户入口调整，不宣布 D-025 线上验收或产品假设成立；旅行生成/排序/路线/事实回退未修改，不重复付费旅行生成，不改变 Evals 标准或 Loop/Human Gate。


D-025 登录页布局跟进（2026-10-11）：按用户提供的第二张图调整操作顺序为邮箱、密码、Sign in、整行 Google 登录、底部注册入口；删除页内 RAMBLE CHINA、Welcome back 和介绍句、顶部登录/注册切换按钮，保留仅供辅助技术读取的页面标题。使用既有深绿按钮、暖白背景、输入框与圆角，参考布局不复制黑色/红色配色。注册仍使用原邮箱验证与设密码流程，必要通知/错误保留。假设是减少重复内容与明确操作顺序能改善理解，实际转化未知。浏览器桌面/320px无溢出、注册往返、空邮箱原生校验通过；TypeScript、组件ESLint及CSS解析通过。证据 output/browser-checks/signin-layout-simplified-desktop.png、signin-layout-simplified-mobile.png。本轮不执行注册/认证提交，不改变旅行逻辑、Evals标准或Human Gate；真实账号保存闭环仍待登录。


D-027 页脚两列跟进（2026-10-11）：按用户要求，共享页脚改为 Product（Plan a trip、Destinations、Travel essentials、Need local guide）和 Support（About us、Email: service@fewerpoints.com、X: @ramblecn、WhatsApp 二维码）。复用用户提供的 images/whatsapp.png 静态导入，并保持原图不做图片优化；不推测电话号码或另造二维码。X 链接目标为用户指定账号 https://x.com/ramblecn，外部新标签带 noopener/noreferrer。沿用浅绿页脚和底部版权/Image credits，桌面两列，480px以下上下排列。假设是按产品和支持分类能降低查找成本，联系渠道是否带来咨询未知。实际首页两标题同高、四产品链接及邮箱/X目标、二维码加载和 About us 跳转通过；320px无横向溢出、二维码显示通过。TypeScript、Shell ESLint、CSS解析、i18n/editorial回归及修改代码diff检查通过。证据 output/browser-checks/footer-product-support-desktop.png、footer-product-support-mobile.png。未发送邮件、X消息或WhatsApp消息，手机扫码实际联系未测试。开发服务此前停止，已恢复3001供验证。旅行逻辑/事实、Evals标准与Human Gate保持。


D-027 页脚品牌恢复（2026-10-11）：用户澄清 Product/Support 是右侧新增两列，应保留原左侧品牌区。恢复既有 BrandLogo（R 标志及 Ramble China 字标，24px页脚字号），桌面为左侧品牌、右侧Product/Support；窄屏品牌在上、链接列在下，480px以下链接列上下排列。保留此前全部产品/联系入口、原二维码、版权和Image credits。桌面实际品牌恢复、800/320px无横向溢出、二维码加载通过，TypeScript/Shell ESLint/CSS解析/diff检查通过。证据 output/browser-checks/footer-brand-restored-desktop.png、footer-brand-restored-mobile.png。只调整展示，不改变旅行数据、Evals标准或Human Gate；用户对联系入口的实际使用仍未验证。


D-027 页脚文案与对齐跟进（2026-10-11）：用户要求恢复品牌下短句，复用原英文 footerLine「Less rushing. More discovering.」；联系链接仅显示Email与X，原mailto和x.com/ramblecn目标保留。右侧Product/Support及原WhatsApp二维码作为紧凑靠右网格，文字右对齐；二维码独立于Support链接列表，桌面顶端与两个标题相同y=457.03px，右边界与页脚内容边界一致。560px以下二维码折到Support下方，避免窄屏挤压。实际桌面文案/目标/同高、320px无横向溢出和二维码加载通过，TypeScript/Shell ESLint/CSS解析/diff检查通过。证据 output/browser-checks/footer-copy-links-aligned-desktop.png、footer-copy-links-aligned-mobile.png。本轮只展示修改，无外部消息，原旅行Evals标准和Human Gate保持；联系效果尚未验证。

D-027 页脚列文字澄清（2026-10-11）：右侧区域位置保留，Product/Support标题与各自链接改为左对齐。实际浏览器两列标题与链接x坐标分别一致为799.06/959.59px，二维码和标题顶部仍同高457.03px；CSS解析通过。证据 output/browser-checks/footer-columns-left-aligned.png。仅CSS展示调整，旅行逻辑/Evals/Human Gate保持，真实联系效果仍未知。

## D-028 — 新域名认证回调与注册邮件恢复

**日期**：2026-10-11
**状态**：代码与受控回归通过；Supabase/Google 外部配置及实际邮件/认证待验收

用户指定本地 localhost、线上 www.ramblechina.com，报告登录跳转旧站及注册收不到验证码。使用无效非用户 token、禁止跟随跳转的公开 Auth 探测确认：默认 Site URL 仍为 https://www.chinatravelagent.cc，localhost 与新生产回调均退回旧站，127.0.0.1 回调获准通过。证据 output/auth-checks/redirects-before-config.jsonl。原应用已传当前浏览器 origin，不能通过前端覆盖 Supabase 白名单拒绝；不得把改代码误报为控制台配置已修复。

集中 callback URL 生成并限定本地主机与 HTTPS www 新域名，保留发起主机以避免 PKCE cookie 丢失，限制 next 为站内路径。邮箱 signup/resend 与 Google 均使用该函数。注册通知不再断言邮件已送达；区分收件地址限制、发送限流与过期代码，重发至少等待60秒，登录/注册切换清除验证码步骤。保留确认邮件和原 OTP→设密码流程，不关闭邮件确认、不使用管理员权限绕过验证。

提供 Confirm sign up 模板（Token 六位码及可选 ConfirmationURL）和 Supabase URL/Google OAuth/SMTP 逐项配置文档；Google 使用 hosted Supabase /auth/v1/callback，网站 /auth/callback 是另一阶段。若共享项目仍服务 travelagent，保留其必要回调并提醒默认 Site URL 变化可能影响未显式传 redirect 的旧应用。默认邮件服务的团队地址/发送额度限制来自官方文档，实际 SMTP 状态与本次缺信具体原因尚未确认。控制台未登录、Supabase连接尚未接通，因此没有修改外部配置。

实际 Supabase SDK 在受控传输中验证三种来源的 signup/resend/Google PKCE 参数、危险来源/返回路径拒绝及错误提示；原 PostgreSQL RLS/版本/回执和生产保存 hook 回归通过。TypeScript、相关 ESLint 通过。浏览器 localhost 缺 code 回调仍返回本站可恢复错误、注册切换及空邮箱校验通过；没有发送真实邮件/建立账号，截图 output/browser-checks/auth-local-callback-recovery.png、auth-signup-local.png。真实登录、邮件投递、新域名部署、账户跨设备保存仍待外部配置和用户认证；旅行 Evals 与 Human Gate 不改变。

D-028 SMTP跟进（2026-10-11）：用户确认已配置自定义SMTP，host为smtp.share-email.com。此为用户报告，未实查保存状态、端口、发件地址、认证或投递日志；不能将默认邮件服务限制作为此次缺信原因。再次公开回调检查仍为默认/localhost/新域名回旧站、IP获准；未修改外部设置或发送测试邮件。下一步补充非秘密配置/错误日志或登录控制台查看，旅行逻辑与Evals不变。

D-028 日志入口澄清（2026-10-11）：用户补充端口465、Sender email为service@ramblechina.com，尚未找到Authentication Logs。官方当前Logs in Studio文档确认应在项目Logs中显式选Log Type Auth，按时间查看注册/重发事件详情；仅API Gateway的Auth子项不是服务端Auth错误日志。配置指南补充直接链接与操作步骤，不根据Host/Port猜测投递故障；仍待真实错误详情，未更改代码或发送邮件。

D-028 域名配置复验（2026-10-11）：用户确认Supabase URL Configuration及Google Clients已配置后，公开无效token检查四项全通过：默认www.ramblechina.com，localhost/IP/生产返回各自/auth/callback，不再退旧站。Google authorize入口HTTP302到accounts.google.com、redirect_uri为指定Supabase项目/auth/v1/callback，无error。证据output/auth-checks/redirects-after-config.json。此项解除旧域名配置阻塞；真实用户授权/PKCE交换/会话、线上部署、SMTP投递及保存仍待验收，不把入口302视为登录成功。没有读取账户数据、发送邮件或修改代码。

D-025 国家／地区字段跟进（2026-10-11）：按用户要求，将My account的Country or region自由输入改为原生英文下拉框，沿用既有样式和country字符串保存接口。选项来自Unicode CLDR regular地区及英文名称，257项按英文排序，静态生成避免运行时地域名称差异；保留数据来源与Unicode-3.0许可。未选择仍可保存空值，历史自填值若不在标准列表中作为当前选项显示，避免打开资料时静默丢失。假设是降低填写和拼写成本，实际使用偏好未知。TypeScript/组件ESLint及生产组件受控渲染/选择/空值/历史值兼容检查通过，所有选项满足原API100字符限制。实际localhost账户页仍显示登录门槛，未改用户个人资料、未实测线上保存；本轮不修改数据库/旅行逻辑或Evals标准。

D-028 确认邮件发送错误跟进（2026-10-11）：用户报告signup时报Error sending confirmation email。客户端直接访问Supabase，不通过Next服务器邮件发送；不能从应用日志推断私有SMTP根因。无凭据本机465探测证书/TLS1.3/SMTP220/AUTH能力成功，公开ramblechina.com MX及SPF存在；不证明Supabase云端连通、SMTP认证、From权限、邮箱存在、模板或投递。证据output/auth-checks/smtp-public-check.json。不盲改端口、不关闭确认、不改前端伪装发送成功；需要Auth /signup精确error或已登录控制台访问。无代码修改、未登录SMTP或发邮件，旅行Evals不变。


D-028 SMTP认证错误定位（2026-10-11）：用户提供脱敏Auth /signup日志 error为535 "Authentication Failed"，error_code为unexpected_failure。RFC4954确认535代表凭据无效或不足，定位到邮件发出前SMTP AUTH被拒绝；不能据此单独断言密码错误。下一步核对真实SMTP Username（与Sender email分开）、服务商要求的密码/授权码及账号SMTP权限，由用户在Supabase直接配置秘密。保留host/465，不修改Google回调、前端变量或模板来掩盖服务端认证错误。更新认证配置指南；没有读取/更改凭据或发邮件，认证成功与投递仍待复验，旅行Evals不变。


D-028 密码修正后投递排查（2026-10-11）：用户已登录Supabase，允许直接查看设置与日志。只读实查SMTP启用/host465/60秒间隔；注册模板已有Token验证码，仍含旧品牌文案。19:54:35北京时间 /signup 200且user_confirmation_requested，账号confirmation_sent_at为11:54:35 UTC、尚未确认，前一注册请求也200；535未在这两次请求重现。脱敏证据output/auth-checks/smtp-dashboard-after-password.json。仅证明Supabase记录发送，最终收件及邮件服务商投递/退信/抑制原因未知；下一步查看服务商日志和垃圾邮件，不根据200宣告闭环完成、不修改共享模板/账号或秘密，不发送测试邮件。旅行Evals不变。


D-028 实际收件与垃圾邮件跟进（2026-10-11）：用户确认验证码在垃圾邮件中，解除该封邮件未投递的疑点，但OTP验证/登录及普遍收件箱投递未验证。公开SPF存在，DMARC查询NOERROR/0答案；DKIM未取得真实selector/邮件签名，不能断言缺失或认证通过，也不把DMARC缺失认定为唯一垃圾邮件根因。优先邮件认证/对齐核验、服务商DKIM和DMARC、统一品牌，再依投递证据评估SMTP信誉/事务邮件服务；只读查询及文档，无外部配置修改，旅行Evals不变。


## D-029 — 用户指定当前代码为 1.0 版本快照

**日期**：2026-10-11

**背景 / 决策**：用户要求“把代码提交到 github，版本 1.0”。同步包与锁文件版本为 `1.0.0`，使用 `v1.0.0` 标签，提交当前实现及既有产品记录。新增本地 `output/` 产物不纳入版本控制；既有跟踪 PDF 样本保留。

**取舍 / 验证边界**：1.0 是用户指定的代码归档编号，不宣布产品假设成立或 Human Gate 通过。构建、ESLint 和 21 项受控检查通过；Loop 测试因缺 E-016 索引而有 2 个报错，旧案例校验器与索引字段不兼容。失败如实保留并记入 README，不删除测试、不放宽断言、不改写旅行 Eval 标准；本轮不扩大为评测系统迁移。实际注册/登录、线上保存重开、两真实账户隔离与完整旅行质量仍沿用已有待办。


D-027 导航顺序跟进（2026-10-11）：按用户要求，将顶部共享导航调整为Plan a trip → Destinations → Travel essentials → Need local guide；此用户指定顺序替代此前Need local guide紧随Plan a trip的展示安排。桌面/手机共用相同DOM，手机点击规划链接后菜单关闭并打开/en/plan，1440px桌面顺序确认；组件ESLint通过。证据output/browser-checks/navigation-plan-first.png。入口易发现的实际改善待使用反馈，本轮不改旅行逻辑或Evals标准。
