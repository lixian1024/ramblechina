# China Travel Agent 多语言架构方案

版本：2026-09-27。状态：第一阶段已实施：共享语言路由、英文网站和韩文首页/北京样板；其余语言与城市按本文分阶段推进。范围包括免费网页、北京 Daybook、后续城市指南、旅行卡及付费 PDF。

## 要解决的问题

当前 `src/app/layout.tsx` 把 `<html lang>` 写成 `en`，页面 JSX、旅行资料和 PDF 渲染器直接包含英文句子。`src/lib/content/schema.ts` 只支持 `en/zh` 双语名称；`beijing-day.ts` 的预约、入口、卡片说明是英文正文。若直接复制十套页面，入口变更、来源复核、布局调整和 PDF 修复都会重复十次，且容易出现各语言相互矛盾。

目标是让开发维护一份页面逻辑、一份地点与规则事实、一套网页和 PDF 模板；译者只维护需要翻译的内容。**一次代码修改适用于所有语言；事实修改仍需审核受影响译文，不能假定机器自动翻译后的安全提示可靠。**

## 语言与网址

公开语言清单使用 BCP 47 代码：`en`、`ko`、`ru`、`ms`、`vi`、`th`、`es`、`fr`、`de`、`ja`。中文专名和现场展示句保留 `zh-Hans`，它是所有语言共用的现场数据；是否推出完整中文界面另作产品决定。语言文件不等于市场：将来需要加拿大法语或拉美西语时，可以增加 `fr-CA`、`es-MX`，复用共用事实并覆盖必要译文。

采用稳定的语言前缀：

- `/en/destinations/beijing`、`/ko/destinations/beijing` 等。
- `/en/journeys/beijing-imperial-day`、`/ja/journeys/beijing-imperial-day` 等。
- 语言切换保持当前页面的稳定 `cityId` / `journeyId`，切换到目标语言已发布的同一实体；未发布时清楚说明，并提供英文页面。不能将英文内容伪装成目标语言页面。
- `/` 可根据浏览器语言给出建议或重定向；明确写了 `/fr/...` 的链接不能被自动改到别的语言。用户手动切换语言优先于浏览器偏好。
- 现有 `/destinations/beijing` 等无前缀页面先继续可用，迁移完成后做指向 `/en/...` 的永久重定向，避免断掉旧链接。API、图片、字体、下载地址不加语言前缀。
- 每个已正式发布的语言页面生成对应的 `lang`、canonical、`hreflang`、站点地图、页面标题与摘要。没有审核过的语言不列入 `hreflang`，也不自动生成可索引的机器翻译页面。

本项目是 Next.js App Router 16。按其[国际化指南](https://nextjs.org/docs/app/guides/internationalization)将展示路由置于 `app/[locale]/`，使用 `proxy.ts` 处理无前缀访问；Next 16 文档使用 **Proxy** 名称，迁移时须按当前安装版本再次核对文件约定。界面短文案建议用 [next-intl](https://next-intl.dev/docs/usage/translations) 的消息目录与 ICU 复数、数字和日期格式能力；它不作为旅行内容数据库。即使将来换翻译库，内容模型及稳定 ID 无需重做。

## 四层结构

| 层 | 维护内容 | 示例 | 改动影响 |
| --- | --- | --- | --- |
| 旅行事实 | 地点 ID、中文官方名称、入口角色、经纬度及坐标系、预约条件、票价数值/币种、开放规则、来源、复核日期、照片授权 | `bj-palace-wumen.role = entry` | 改一次；网页、卡片、PDF 使用同一事实 |
| 内容译文 | 城市介绍、体验描述、入口说明、饮食提示、摄影建议、Plan B 的自然语言解释 | `place.bj-palace.access` 的 `en/ko/...` 文案 | 只修改目标语言或审核受影响语言 |
| 界面文案 | 按钮、导航、错误提示、复数、单位、流程状态 | `daybook.download`, `status.reservationPending` | 所有页面使用同一消息键；各语言词条分别维护 |
| 展示模板 | 城市页、Daybook、旅行卡、PDF 六类页面布局和逻辑 | `<TravelCard locale={locale} card={card}/>` | 改组件一次，所有语言重用 |

照片文件、来源链接、实体 ID、预算数值和路线约束不在翻译文件中。图片 alt 文案和图注属于内容译文，授权/作者属于共用事实。景点中文名称、中文地址、地图检索词与给工作人员看的句子在任何界面语言下保持中文；用户所读的解释随界面语言改变。

### 数据记录示例

下面展示目标结构，不代表当前文件已经迁移：

```ts
// src/content/facts/places/bj-palace.ts
export const palace = {
  id: 'bj-palace',
  cityId: 'beijing',
  officialNameZh: '故宫博物院',
  entranceIds: ['bj-palace-wumen', 'bj-palace-shenwumen'],
  access: {
    code: 'enter_wumen_exit_shenwumen',
    state: 'verified',
    sourceIds: ['palace-visit'],
    checkedAt: '2026-09-27',
    reviewAfter: '2026-10-04',
    revision: 3
  }
} as const;
```

```json
// src/content/locales/en/places/bj-palace.json
{
  "entityId": "bj-palace",
  "locale": "en",
  "sourceRevision": 3,
  "reviewStatus": "approved",
  "name": "The Forbidden City",
  "accessExplanation": "Enter at Wumen and leave at Shenwumen. Follow current staff diversions."
}
```

```json
// src/content/locales/ko/places/bj-palace.json
{
  "entityId": "bj-palace",
  "locale": "ko",
  "sourceRevision": 3,
  "reviewStatus": "review-needed",
  "name": "자금성",
  "accessExplanation": "..."
}
```

`sourceRevision` 跟踪译文所依据的事实版本。事实修订后，构建检查列出该实体所有过期译文。影响预约、入口、证件、安全和法定规则时，目标语言需要重新审核才能进入正式 PDF；普通形容性文字可依内容负责人选择降级展示，但应有清楚的回退标记。

## 类型与解析接口

不在 React 组件里写 `if (locale === 'ko')` 分支。组件只拿已经解析好的视图模型。建议接口：

```ts
type Locale = 'en'|'ko'|'ru'|'ms'|'vi'|'th'|'es'|'fr'|'de'|'ja';
type PublicationState = 'draft'|'review-needed'|'approved';
type TranslatedBlock = {
  entityId: string;
  locale: Locale;
  sourceRevision: number;
  reviewStatus: PublicationState;
  fields: Record<string, string>;
};

type LocalizedPlaceView = {
  id: string;
  name: string;               // 目标语言名称
  officialNameZh: string;      // 所有语言显示同一现场中文名
  entryNameZh: string;         // 地图/出租车现场使用
  accessExplanation: string;   // 目标语言且通过审核
  sources: Source[];           // 共用来源
  image: LicensedAsset;        // 共用图片及许可
};

getCityView(cityId: string, locale: Locale): Promise<LocalizedCityView>;
getDaybookView(dayId: string, locale: Locale): Promise<LocalizedDaybookView>;
getUiMessages(locale: Locale, namespace: string): Promise<Messages>;
```

`getDaybookView` 负责把事实、目标语言内容、格式化配置和发布状态合成视图。它是网页、PNG 卡、PDF 的**唯一内容入口**。页面本身不直接拼接原始英文段落。API 入参只传稳定 ID、用户行程参数和 `locale`；服务端校验允许的语言和内容版本。用户在英文页选择了景山南门卡，切换日语时仍引用同一个 `card-jingshan`。

### 哪些字段必须结构化

预约“提前七天 20:00”不能只储存为一段英文；建议表示为 `leadDays: 7`、`releaseLocalTime: '20:00'`、`timeZone: 'Asia/Shanghai'`、`requiresOriginalPassport: true`、`checkedAt`、`sourceIds`，再由各语言生成解释。预算储存 `currency: 'CNY'` 和整数范围，网页/PDF 用 `Intl.NumberFormat(locale, {style:'currency', currency:'CNY'})`。日期用 `Intl.DateTimeFormat`；距离和时长保留数值，展示时用本地化单位消息。缺失事实保持 `null/pending`，任何语言都不把未知翻成已确认。

## 翻译和发布工作流

1. 编辑维护一份事实记录与英文基准文案；中文官方名称、地址和用户现场展示句另行人工校对。
2. 新增内容时生成待翻译清单：`entityId + field + sourceRevision`。机器翻译只可生成草稿。
3. 审核员按事实来源核对译文，尤其检查“入口/出口”“须预约/可现场买票”“护照原件”“闭馆例外”“路线方向”；批准后标记 `approved`。
4. 原始事实改变时，根据 ID 和版本自动把受影响译文标记 `review-needed`。不相关译文不需重做。
5. CI 校验语言文件的键、插值变量、实体引用、过期事实、批准状态和来源链接。付费 PDF 缺关键译文时停止生成或明确提示此语言尚不可购买，不静默混入英文。
6. 已审核的网页和 PDF 随内容版本发布；PDF 保存事实版本、语言、译文版本、生成日期及来源快照。旧下载是历史版本，不能悄悄用新文案覆盖。

翻译成本仍然存在，但不会重复开发十份产品。内容较长的城市页可分区块逐步上线；关键操作、安全和交易文本要在公开该语言前全部审核。语言页的发布范围可以按城市、章节和产品分开管理，避免“按钮翻译完了”就误称全站支持该语言。

## 网页、卡片和 PDF 共用流程

```text
                    来源与核验记录
                          ↓
                    结构化旅行事实
                          ↓
       目标语言译文 ── 内容解析器 ←── 界面消息
                          ↓
                    Localized view model
                    ↙       ↓        ↘
                  网页    PNG 卡片    PDF 旅行册
```

PDF 模板只接收 `locale + LocalizedDaybookView + JourneyOptions`，按语言选择字体、行高和断行规则。英文、德文、法文需要足够宽度，日文、韩文、泰文、俄文、越南文需要嵌入覆盖相应字形的字体；始终额外嵌入中文现场卡片字体。不能像当前 `pdf.ts` 那样用英文安全字符替换、固定英文行高来承诺十语输出。每种语言至少用一份包含中文专名、长标题和预算的样本渲染并检查溢出。

网页共享 `lang`、图片 alt、导航和 SEO 元数据；卡片上的解释随语言变，中文大字保持一致。地图/高德返回的是供应商原始中文地点名，必须以稳定的入口 ID 与编辑数据关联；不靠翻译后的景点名称匹配位置。

## 建议文件边界

```text
src/
  app/
    [locale]/
      layout.tsx
      page.tsx
      destinations/[slug]/page.tsx
      journeys/[dayId]/page.tsx
    api/
      journey/pdf/route.ts
  i18n/
    locales.ts               # 语言白名单、回退与格式化设置
    routing.ts               # 语言网址和切换
    messages/en.json         # 短界面文案
    messages/ko.json
  content/
    facts/                   # 不随语言复制的地点、规则、来源、资产
    locales/en/             # 长旅行内容译文
    locales/ko/
    publication.ts           # 语言/实体/产品发布状态
    resolve.ts               # 生成本地化视图模型
  components/               # 一套共享网站组件
  lib/book/                 # 一套 PDF 模板，按语言选字体和文本
```

可先用版本管理的 JSON/TypeScript 文件实施；当城市与语言数使人工合并困难时，再换内容管理系统。解析器接口保持不变，存储位置可以迁移，不必改页面。

## 对现有代码的迁移顺序

| 阶段 | 具体工作 | 验收 |
| --- | --- | --- |
| A. 契约 | 增加 Locale、事实/译文/消息三类类型、翻译键和发布状态；为北京样板建 `en` 基准内容 | 当前英文页面与 PDF 输出内容不退化；不出现重复的事实记录 |
| B. 双语言闭环 | 将 Daybook 的英文 JSX 文案、`beijing-day.ts` 英文解释和 PDF 英文句子移入消息/译文；优先做 `en` + `ko` 完整样本 | 改一个入口状态后，两种语言网页和 PDF 从同一事实读取；缺失关键译文被拦截 |
| C. 路由 | 增加 `[locale]`、语言切换、旧 URL 重定向、`lang`/SEO 元数据 | `/en` 与 `/ko` 同一页面结构；旧 URL 仍可访问或正确重定向；错误语言返回 404 |
| D. 扩展 | 对西安、上海及其余城市按发布状态翻译；扩充其余七种语言；加入 PDF 字体和排版检查 | 每种已发布语言的关键页面、卡片和 PDF 内容准确，英文/中文混用符合产品规则 |

`src/lib/content/legacy-adapter.ts` 目前把旧 42 城标为 introductory。迁移时先给每城稳定 ID 和英文内容块；其他语言未获批准前不生成等价目的地页。现有 `src/lib/travel/cities.json`、`guides.json` 和照片档案是输入资产，不直接复制十份。北京样板也是先拆事实和文案，再整体移动路由，避免同时重写界面、内容和网址。

## 设计确认与实施前检查

本方案的核心决策是“语言前缀网址 + 统一事实库 + 分语言内容块 + 独立 UI 消息 + 共享网页/PDF 模板”。首个技术验证应是 **北京 Daybook 的英文与韩文两版**：韩国游客是目标客群，韩文能更早暴露字体、换行和中文现场卡片共存问题。验证通过后再批量增加语言与城市。

实施时依据本仓库实际安装的 Next 16 文档检查 `proxy.ts`、路由和元数据；依据 next-intl 当前文档检查版本兼容性及 Server/Client 消息加载方式。这里的文件结构是目标设计，不能把本文当作当前已上线功能。

## 实施记录：第一阶段（2026-09-27）

本方案已进入代码：

- `src/app/[locale]/` 承载共享页面。`src/proxy.ts` 将旧 URL 转至 `/en/...`，根路径按浏览器偏好在已发布语言中选择；未发布的语言代码返回 404。
- `src/i18n/locales.ts` 列出十种计划语言，目前公开 `en`、`ko` 两种。`src/i18n/publication.ts` 限定韩文已翻译页面为首页及北京 Daybook，其他栏目跳到英文版，导航显示 `EN`。
- `src/i18n/context.tsx` 的共享链接组件保留当前语言；`src/components/travel/Shell.tsx` 提供语言切换。普通网页组件不需要复制十份。
- `src/content/locales/en/beijing-day.json` 与 `src/content/locales/ko/beijing-day.ts` 管理旅行叙述；`src/lib/content/beijing-day.ts` 保留地点 ID、中文现场句、来源及核验状态。`src/content/resolve-beijing.ts` 为网页与 PDF 组装同一份本地化视图。
- `src/i18n/messages.ts` 管理首页和全站导航；`src/i18n/daybook-ui.ts` 管理北京工作区短文案。高德供应商数据不作为正式翻译事实。
- `src/lib/journey/pdf.ts` 仍是一套 PDF 版式，接受 `locale` 并用对应内容生成英/韩旅行册；中文现场句在两种版本中一致。韩文用 Noto Sans CJK 字体及经渲染调整的保守断行宽度。
- `src/content/publication-manifest.json` 的状态为 `prototype`，不代表人工语言审校完成。`npm run test:i18n` 校验事实指纹、稳定 ID、已发布路径和北京界面消息；`npm run build` 自动运行该检查。事实变更会让构建失败，要求重新审阅译文并更新指纹。

**目前的实际覆盖范围是英语网站 + 韩语首页/北京 Daybook。** 韩语城市目录、其余城市指南、全中国指南和通用行程规划仍通过英文版提供，并标识 `EN`。俄语、马来语、越南语、泰语、西班牙语、法语、德语和日语只有语言配置预留，尚无可公开译文，语言选择器不会假装它们已上线。韩语内容仍需母语编辑复核，尤其是现场用语和预约条件。

下一次扩展应复用 `resolve` + 发布清单机制，先迁移第二个城市的事实和双语内容，验证无需增加新页面组件。站点地图、正式域名 canonical/hreflang 和各语言的翻译审校属于对外发布前的剩余工作。


### 2026-09-27 · 中文网站样板落地

产品决定增加简体中文网站语言代码 `zh`。已发布路由为 `/zh` 和 `/zh/journeys/beijing-imperial-day`，语言切换器及浏览器语言协商均识别中文。中文译文放在 `src/i18n/messages.ts`、`src/i18n/daybook-ui.ts` 和 `src/content/locales/zh/beijing-day.ts`；内容事实与路线数据继续共享。其余中文 URL 回退到对应英文页面并显示 EN 标记。PDF 多语言暂缓，`/api/journey/pdf` 明确不接受 `zh`。上文关于“仅英韩发布”和“是否推出中文界面”的描述属于原方案记录，以本节当前状态为准。
