# Travel Stories — 2026-10-13

入口 `/en/travel-stories`，顶部与 Product 页脚均有 Travel Stories；页面标题为 China through travelers’ eyes。

## 数据与范围

- `.env.local` / 部署环境设置 `YOUTUBE_DATA_API_KEY`，只在服务端使用。启用 YouTube Data API v3，限制到该 API；固定公网出口的服务器可另加 IP 限制。不能复用网站 referrer 限制的 Maps Key。
- `src/lib/travel-stories/creators.ts` 管理选定国际旅行博主；目前10个频道。Joel Friend 的实际官方 handle 已变为 `@Joel_Emilia`。这是本网站选定频道中的排序，不是 YouTube 全站前100，也不以头像推断国籍。
- 官方 `channels.list` 核实 handle；每频道 `search.list` 按 viewCount 获取最多两页、每页50条近两年 China 候选。`videos.list` 每批最多50条，读取真实标题、频道、发布日期、duration、viewCount与可嵌入状态；Key只通过请求头发送。
- 搜索会匹配视频说明中的历史中国行程。额外要求标题出现中国或已列出的中国目的地，排除明确其他国家、政治/反应类标题。此规则是保守的选题筛选，不能替代逐条内容审看；需要完善的地点名可更新规则，并运行故障回归。
- 最近两年按 Asia/Shanghai 日历计算，边界日包含、未来日期排除；依据公开发布的 `publishedAt`，不使用采集日或旧上传日期。每次读取缓存也重新过滤过期视频。
- 排除非公开、未处理、禁嵌入、年龄限制、正在直播、缺播放量/日期/缩略图、错误频道的记录。不额外限制短视频或长视频时长；直接使用 YouTube 的原始 viewCount，包括 Shorts，不对其计数另造转换指标。
- 去重后以原始整数字符串做精确播放量降序，同量时按发布日期，再按 ID 稳定排序；最多100条。超过100时底部显示已达本站上限，链接 YouTube 中国旅行搜索。不足100不凑数。

## 更新与故障恢复

进程内缓存与并发合并，正常访问每6小时最多刷新一轮；每轮搜索最多20次。不是定时任务，首次访问或缓存到期后才更新。局部网络/频道失败显示 partial，并10分钟后再尝试；已有数据整体刷新失败可带原检查日期和 stale 说明保留最多24小时，超过则空状态并提供YouTube入口。无Key/配额/非法响应不会捏造统计，不把失败当成新一次检查。没有将视频、缩略图或API记录长期写入磁盘。

多实例/频繁冷启动部署会各自刷新，配额与实际流量需要监测；正式放大流量时应共享短期缓存，保持既有排序、时间戳和失败门槛。不可为了凑100降低过滤标准。

## 播放与展示

最新简洁反馈：不再显示卡片作者名字、页内TRAVEL STORIES标签、两年/排序/数量工具栏或正常数据检查说明；主标题及介绍文案下以全宽细横线区分视频区，线两侧留出间距，手机同样显示。下段所述博主普通文字由此移除；官方原播放器与数据仍保留频道归属。仅实际partial/stale显示简短异常提示，stale仍带原检查日期；筛选/排序/数量上限不变。

按用户2026-10-13后续反馈，桌面/平板2列、手机1列，按短列继续排列；DOM顺序、排名编号与视觉从上向下顺序一致。卡片显示原视频标题、博主普通文字、发布时间、YouTube播放量、视频时长；缩略图直接加载官方地址。标题14px单行省略，链接title属性保留完整标题；标题跳转原视频，移除重复Watch on YouTube和作者链接。点击封面后加载 `youtube-nocookie.com` 官方iframe，提供HTTP Referer，保留播放器功能；同时最多一个播放器，换片/关闭卸载前一个。iframe加载故障提示点击标题恢复；关闭按钮仅在播放时出现。未加载100个播放器或自动播放整页。

视频代表作者的个人经历，可能包含赞助；旧价格、规则或体验不能自动变成本站已验证行程安排。YouTube Terms 与 Google Privacy 链接提供在页面中。

## 验证与限制

`npm run test:travel-stories`：两年/闰日/未来与非法日期、去重、超过100、超出浮点安全范围的播放量顺序、其他国家误入、频道归属、禁止嵌入/私人/年龄/直播、短长视频、分页/50条分批、Key头部隔离、并发缓存、故障保留/到期、缺Key，以及100张不同高度卡片在桌面/平板/390/320px内容宽度下无重叠、无越界和顺序。

本地真实API与 `/en/travel-stories` HTTP200、100张卡片、日期范围、全序列降序、超限提示、无客户端Key通过。证据 `output/playwright/travel-stories/ssr-check.json`。TypeScript、相关ESLint、CSS解析和原i18n/editorial/workbench回归通过。

生产React组件受控交互检查：点击前无iframe、点击后一个官方隐私增强播放器、换片仍只有一个、referrer设置保留、加载错误后外部观看入口与错误文字仍可用。只验证组件行为，不执行浏览器或真实播放。

两列跟进：100张实际服务器卡片均只有一个原视频标题链接，没有重复观看/作者链接，完整标题提示与降序保留；1320px内容宽度每卡648px，740px为358px，390/320px手机对应单列。原故障/排序/布局回归、TypeScript、ESLint与CSS解析通过。证据 `output/playwright/travel-stories/two-column-check.json`；实际浏览器视觉限制仍未解除。

浏览器工具拦截本次本地页面访问，理由为URL协议限制；未绕过。实际桌面/手机视觉、点击播放、地区可用性与跨浏览器体验仍需用户/后续浏览器复验，几何测试不作为实际浏览器通过。全量候选尚未逐部完整观看；流量/配额与游客进入规划的价值仍未知。原旅行Evals、历史失败和Loop/Human Gate保持。

参考：[YouTube videos.list](https://developers.google.com/youtube/v3/docs/videos/list)、[视频字段](https://developers.google.com/youtube/v3/docs/videos)、[官方嵌入](https://support.google.com/youtube/answer/171780?hl=en)、[开发者政策](https://developers.google.com/youtube/terms/developer-policies)。
