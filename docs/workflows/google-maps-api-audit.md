# 高德接口与 Google Maps 迁移审计

日期：2026-10-10。范围：当前仓库调用路径与官方能力说明。用户决定放弃 Mapbox，并以 Google Maps 替代高德英文地图。此轮只做审计与方向记录，没有修改应用运行时，也没有调用付费 Google API。

## 接口清单

共 9 种接口类型：JS SDK + 8 个 REST 端点。静态图端点有服务端实现，但未找到当前前端调用；其余 8 种在业务路径中可达。“可迁移”表示功能对应，不表示中国样本或账户权限已经验收。

| 高德接口 | 当前用途 | Google 对应接口 | 判定 |
| --- | --- | --- | --- |
| JS API 2.0：webapi.amap.com/maps | Plan a Trip 底图/酒店与景点编号/路线/选中联动；Destinations 城市地图 | Maps JavaScript API，language=en | 可优先迁移；需检查坐标和国内访问 |
| v5/place/text | 景点和酒店匹配、上海规划候选、酒店附近餐饮回答、北京示范搜索 | Places New：POST /v1/places:searchText | 可迁移，需重新适配范围、语言、类型和正确入口 |
| v5/place/around | 景点周围 600m 餐饮；酒店周围 1200m 餐厅 | Places New：POST /v1/places:searchNearby | 可迁移，类型/排序/数量/距离输出不同 |
| v5/place/detail | 规划按高德 ID 补照片；北京示范重查出入口详情 | Place Details New：GET /v1/places/{placeId}；照片另用 GET /v1/{photoName}/media | 可迁移，重新匹配 Google ID，处理署名和照片失效 |
| v5/direction/walking | 短距离步行、轮渡排除、北京神武门→景山南门、路线几何补全 | Routes API Compute Routes，travelMode=WALK | 有对应能力；官方中国表支持步行，仍需入口/过江/失败样本验收 |
| v5/direction/driving | 较远移动、低体力和跨城道路备选；显示 taxi 估时 | Compute Routes，travelMode=DRIVE | 有对应能力；驾车时间不是叫车承诺或出租车报价 |
| v5/direction/transit/integrated | 公交/地铁、步行接驳、换乘、部分跨城方案 | Compute Routes，travelMode=TRANSIT | 暂不能直接关闭高德：Google 有通用接口，但中国所需路线未实测，通用覆盖表不含公交 |
| v3/weather/weatherInfo，extensions=all | 按 adcode 和日期取白天/夜间天气及高低温 | Weather API | 中国不能替代：官方 CN 行全部不支持 |
| v3/staticmap | /api/trip-map 静态点位与连接图 | Maps Static API | 功能可迁移；当前前端未找到调用，非优先项 |

Google REST 主机：Places 为 places.googleapis.com；Routes 为 routes.googleapis.com/directions/v2:computeRoutes；静态地图为 maps.googleapis.com/maps/api/staticmap。

## 其他高德依赖

- /_AMapService 安全代理：src/app/%5FAMapService/[...path]/route.ts，保护 jscode，转发 v3/v4/v5，特殊处理 v4/map/styles。代码允许路径不等于应用实际调用了每条 API，未抓 SDK 网络日志。移走所有高德 JS 地图后可停止使用；高德 REST 后端不依赖它。
- uri.amap.com/marker 与 uri.amap.com/search：餐饮候选、北京中文口袋卡、地点和 Taxi Helper 外链。属于导航链接，不是数据查询。可增加 Google Maps URLs 或 googleMapsUri；Maps URLs 无需 API key，国内可访问性仍需实测。
- store.is.autonavi.com/showpic：高德照片加载源，不是新的独立查询接口。Google Photos 替代时要改加载源、作者署名、来源链接和保存策略。
- 没有发现应用显式调用高德地理编码/逆地理编码、输入提示、行政区查询、骑行或独立距离矩阵；当前景点匹配用 place/text。

## 代码入口

| 文件 | 责任 |
| --- | --- |
| src/lib/travel/concierge-amap.ts | 主适配器：地点、餐饮、照片、三种路线、天气、静态图、缓存 |
| src/lib/amap/client.ts | 北京示范：搜索、详情、步行；北京市界和出入口条件 |
| src/lib/amap/browser.ts | JS API 加载器 |
| src/components/travel/AmapConciergeJourneyMap.tsx、ConciergeJourneyMap.tsx | 当前规划地图；选择器只接高德，失败可重试 |
| src/components/travel/DestinationMapSurface.tsx | Destinations 高德城市地图 |
| src/components/travel/GoogleConciergeJourneyMap.tsx | 已有 Google 实现，但当前选择器未导入；含 GCJ 近似逆转换，未验收对齐 |
| src/components/travel/GoogleJourneyMap.tsx、JourneyMap.tsx | 另一组 Google/OSM 组件；本轮未找到页面消费入口 |
| src/lib/travel/concierge.ts、src/app/api/trip-concierge/route.ts | 生成/修改生产流程，通过 adapter 实查 |
| src/app/api/trip-route-geometry/route.ts | 同一个 routeBetween 补几何 |
| src/app/api/trip-place-photos/route.ts | 按高德 ID 补照片 |
| src/app/api/amap/route.ts、src/components/journey/AmapExplorer.tsx | 北京示范搜索/步行 |
| src/lib/travel/concierge-types.ts | provider 固定 Amap，地点含 adcode/citycode |
| src/lib/travel/shanghai-grounding.ts、shanghai-quality.ts、shanghai-dining.ts | 上海分区、跨江、餐饮质量逻辑 |
| src/components/travel/Planner.tsx、ItineraryOverview.tsx、src/lib/travel/english-display.ts | 来源、营业提示、照片和本地恢复 |

环境变量仅记录名称，不读取密钥：AMAP_JS_API_KEY、AMAP_JS_API_SECRET、AMAP_JS_ENGLISH_ENABLED、AMAP_WEB_SERVICE_KEY；主 adapter 兼容 AMAMP_API_KEY。已有 NEXT_PUBLIC_GOOGLE_MAPS_API_KEY 为浏览器变量。REST 迁移需适当受限的独立 server key，不能假定浏览器 key 允许 Places/Routes。

## 不能一对一搬迁的数据和规则

1. 高德 ID 与 Google placeId 不能互换；当前字母数字/长度 5–40 的入参校验也要适配。
2. Google addressComponents 不是 adcode/citycode 原样返回。上海市界、浦东、跨城和天气地区需独立地域模型或已核实映射，不能用假行政码维持校验。
3. 当前餐厅/菜系依赖高德分类；Google types 需独立适配。被标成 restaurant 不证明甜品店适合作为正餐，既有失败仍须修复。
4. Google Nearby New 每次最多 20 结果，现高德查 25；可按 DISTANCE 排序。返回点位自行计算距离须标直线距离，步行距离/分钟需另查路线。600m 半径不等于能直接走到。
5. Place Details 可请求营业与照片字段，缺失仍标 unverified；营业字段不确认预约或临时开放。照片需署名和来源，photo name 不能永久缓存。
6. 高德 adapter 的坐标为 GCJ-02。旧 Google 组件近似逆转换没有对齐证据；优先用 Google 原生点位和路线，记录 provider/coordinateSystem，混合数据检查每个标注和路线顶点。
7. 当前 VerifiedTrip.provider 固定 Amap，整个结果写 localStorage，主 adapter 缓存查询 5–60 分钟。Google 的内容保存和署名规则需重做；placeId 可长期保存不等于整个详情、照片都可长期保存。
8. Google Places 数据显示在地图上须使用 Google 地图及署名；保留高德数据叠加 Google 时须确认高德账户许可，不能由现有代码推断授权。
9. 门票、预约、实际入口、排队、饮食适配和高铁/机票库存没有被当前地图调用完整验证，换接口也不能自动确认。

## 成本与最小下一步

按量 Google 英文地图可避免采购高德英文底图年费，但整体成本需实算。当前官方全球价格，美元/千次，每个 SKU 免费额度独立：Dynamic Maps 月免费 10,000、第一付费档 $7；Compute Routes Essentials 月免费 10,000、$5；Text/Nearby Search Pro 各月免费 5,000、$32；Place Details Enterprise（如营业字段）月免费 1,000、$20；Photos 月免费 1,000、$7。请求 FieldMask 决定 SKU，更高字段档另计。仅 50,000 次地图加载按当前档推算 $280；地点、路线、模型等另算。账户区域、已有套餐和高德商业授权未核实，不能承诺具体节省。

迁移顺序：
1. 验证 Google 地图展示，覆盖 Plan a Trip 和 Destinations，检查加载失败恢复、英文与坐标。
2. 比较同一批上海/北京景点、酒店、正确入口、餐厅的 Places 结果，适配字段、地域判断、分类、来源和保存规则。
3. 迁移经实测通过的 WALK/DRIVE；保留过江、低体力、约束冲突和无路线场景。
4. TRANSIT 独立测试换乘/接驳与跨城；失败或无法确认时保留高德或标未验证。
5. 中国天气保留高德或另选支持中国的气象源。
6. 从境外规划网络与境内旅途网络分别测试 JS、瓦片、字体、照片和 REST 延迟。官方数据覆盖表不证明国内网络可访问。
7. 实际迁移生成/路线/回退后，回归 E-001/002/003/005/007/008/014 及修改一致性。现有 T-001 失败不重置，标准不降低。

## 官方来源与验证

- [中国核心地图覆盖](https://developers.google.com/maps/coverage)：底图、地理编码、驾车、步行有覆盖；公交不在表内。
- [语言配置](https://developers.google.com/maps/documentation/javascript/localization)
- [Text Search](https://developers.google.com/maps/documentation/places/web-service/text-search)、[Nearby Search](https://developers.google.com/maps/documentation/places/web-service/nearby-search)
- [Place Details](https://developers.google.com/maps/documentation/places/web-service/place-details)、[Photos](https://developers.google.com/maps/documentation/places/web-service/place-photos)
- [Compute Routes](https://developers.google.com/maps/documentation/routes/compute_route_directions)、[Transit](https://developers.google.com/maps/documentation/routes/transit-route)
- [Weather 中国不支持](https://developers.google.com/maps/documentation/weather/coverage)
- [Static Maps](https://developers.google.com/maps/documentation/maps-static/overview)、[Maps URLs](https://developers.google.com/maps/documentation/urls/get-started)
- [Places 保存和署名](https://developers.google.com/maps/documentation/places/web-service/policies)、[官方定价](https://developers.google.com/maps/billing-and-pricing/pricing)
- [高德服务协议](https://lbs.amap.com/pages/terms/)

验证结果：已核对两个高德 adapter、地图选择器、业务调用、上海质量逻辑和官方文档。没有运行新的旅行 Evals，因本次没有改旅行运行时。中国 POI 完整度、入口精度、公交可用性、国内网络和实际费用仍未知。

