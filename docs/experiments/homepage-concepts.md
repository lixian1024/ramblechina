# 首页三种风格预览 — 2026-10-11

用户问题：普通的左右分栏首页缺少辨识度，首屏、四项服务和导游推广重复介绍相同入口。

假设：让视觉方向更明确，按阅读任务分配内容，能改善第一印象和下一步理解。本轮提供可选页面，不将视觉检查作为产品假设成立。

| 版本 | 预览路径 | 视觉与阅读方式 |
| --- | --- | --- |
| A / 旅行杂志 | `/en/home-designs/editorial` | 暖纸色、棕色斜体标题、拱形照片、细线及杂志版式 |
| B / 电影感风景 | `/en/home-designs/cinematic` | 满幅风景、深色底、杏色按钮、错落照片卡 |
| C / 旅行手账 | `/en/home-designs/notebook` | 奶油黄/钴蓝、手绘线、照片拼贴、兴趣筛选 |

每个页面保留一个主要规划入口，城市指南承担探索，最后的两个支持入口分别承担行前准备与导游咨询。导航属于全站公共入口。真实规划需登录，首屏明确说明；不虚构AI结果或导游服务价格/库存。所有照片来自既有授权资产，保留来源、作者、许可。

## 验证证据

- 1440×1000桌面视觉审查、390×844与320×844手机文档宽度均未超过视口；截图 `output/playwright/home-concepts/{a,b,c}-desktop.jpg` 及 `{a,b,c}-mobile.jpg`。
- 三个版本可通过切换栏跳转；桂林城市链接打开现有指南；规划按钮打开现有账户提示，不要求浏览者在预览中创建账户。
- C 的 Nature/Culture/Food 分别显示1/2/3个指南，All恢复6个。实际输出和手机尺寸记录 `output/playwright/home-concepts/qa.json`。兴趣选择不会改变行程或用户约束。
- 未知版本 HTTP404；预览为noindex。原正式首页未改动。
- 新路由编译与TypeScript/相关ESLint/CSS解析通过；`node --import tsx`运行原i18n/editorial/planner-workbench回归通过。首次CLI包下载受DNS阻塞，使用已连接的Codex浏览器Playwright能力实际检查。
- 切换Critic视角审查：展示/交互pass；真实用户偏好及转化仍未验证。上海授权照片实际为白天，因此更正拼贴alt与B卡片标题，避免文图冲突。

## 下一步

用户已选择 B 并替换正式首页。再让首次来华的英文用户说明“这里能帮我什么、我下一步点哪里”，观察是否进入规划，而不只问是否好看。旅行Evals及Loop/Human Gate保持原状态。

## 用户选择后的落地（D-027）

正式首页 `/en` 使用 B，无预览切换栏；B 预览同步最新内容。删除 Sign in to plan and save、Find your kind of China、Less ordinary. More yours.、Go beyond the postcard，保留主标题、短副标题及城市/支持入口。Start your journey 在访客状态直接去 `/en/login?next=%2Fen%2Fplan`，认证用户直接去 `/en/plan`；认证未确定前避免错误跳转。

共享导航中 Need local guide 紧随 Plan a trip，Sign in 改为最右深绿按钮。访客可以浏览空白规划工作区，New trip 再跳登录；私人行程读取/保存继续要求认证。静态照片下的署名集中到页脚 Image credits；Google 要求的作者归属在照片内显示。

桌面/手机、两处访客登录跳转、上海详细指南/桂林普通指南/目的地列表的图下署名移除验证通过，截图和记录见 `output/playwright/home-selected/`。受控保存 hook 检查访客带私人行程 ID 也无读取/写入，并保留原授权保存、版本冲突、数据库失败恢复回归。实际登录账户的端到端重验及用户理解/转化仍未知，不以代码判断替代线上账户验收。
