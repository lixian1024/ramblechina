# 高德接入说明（北京样板）

## 配置

在本项目 `.env.local` 增加 `AMAP_WEB_SERVICE_KEY=你的Web服务Key`。不要加 NEXT_PUBLIC_，不要把密钥提交到仓库或发到聊天。

确认账号已开通 POI 搜索 2.0 与步行路线权限、配额及服务端出口 IP 限制。修改后重新启动本项目服务：`npm run dev -- --port 3001`。浏览 `/journeys/beijing-imperial-day`。

状态检查：`GET /api/amap?action=status` 只返回配置是否存在；存在不代表授权和配额一定有效。真实搜索成功才证明联通。本轮检测时尚无 Key，因此真实账号联调待配置。

## 已实现

| 本地接口 | 上游 |
| --- | --- |
| GET /api/amap?action=search&q=中文词 | v5/place/text，限定北京、最多 6 条、business 字段 |
| GET /api/amap?action=walk&origin=POI_ID&destination=POI_ID | 先 v5/place/detail 二次取详情并检查门名与位置，再 v5/direction/walking |

官方文档：
- https://developer.amap.com/api/webservice/guide/api-advanced/newpoisearch
- https://developer.amap.com/api/webservice/guide/api/newroute

POI 支持中文名、地址、区域、电话和营业信息（只有供应商提供时才展示），适合补充入口与附近餐饮查找。当前没有接入天气、实时库存、门票交易、地铁规划或完整底图。

服务器端固定上游域名、超时 8 秒、每进程每分钟最多 30 次上游请求；详情解析后校验入口，不接受客户端坐标直接规划。响应 no-store；错误信息经过处理，不透出请求 URL、Key 或原始供应商错误内容。无路线时不会回退成直线距离的假时长。

注意：所有路线和 POI 坐标均标注 GCJ-02。响应空字段可能为数组，需正规化。营业信息与坐标是供应商数据，不自动晋升为官方核验事实。在线路线不存入 PDF 或持久离线包。上线前需按所选高德套餐核对商用和数据使用授权、配置共享限流与费用监控。

## 联调顺序

1. 搜“故宫博物院 神武门”，检查确为北侧出口，选择 Use as exit。
2. 搜“景山公园 南门”，检查地址，选择 Use as park entrance。
3. 点击 Check walking route；检查距离、耗时、方向步骤及提供方时间；遵循现场管制。
4. 试附近餐厅查询，确认只显示供应商结果，不显示虚构评分或背书。
5. Key 缺失、无效、无配额和网络超时的模拟测试：`npm run test:daybook`。

## 生产前剩余项

真实 Key 联调、账号权限与配额确认、跨实例限流、供应商协议审查、地图误选与真实行走验证。不要把 status.configured=true 当成以上工作完成。
