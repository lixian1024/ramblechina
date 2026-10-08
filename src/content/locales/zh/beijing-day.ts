/** Simplified Chinese editorial copy. Operational IDs, Chinese on-site phrases and sources stay canonical. */
export const chineseBeijing={
 dayName:'从故宫午门到景山观景台',
 assumptions:['按在北京有完整一天游览时间设计；未计算酒店接送。','假定已预约故宫上午入场；建议时间不代表预约成功。','不含列车、酒店、导游或门票预订。'],
 stops:{
  arrive:{window:'预约入场时间之前',title:'找到正确入口',duration:'预留安检与步行时间',action:'提前查好从酒店到午门的路线和安检所需时间。由于出发地点未知，此处不虚构酒店接送时长。'},
  palace:{window:'上午 · 按预约时段',title:'由南向北参观故宫',duration:'建议 3–4 小时',action:'从午门入院，按现场指示向北前往神武门出口。太和门施工可能改变路线，请以现场指引为准。'},
  lunch:{window:'故宫参观后',title:'午餐与休息',duration:'建议 45–60 分钟',action:'从神武门出来后，登景山前先休息。周边餐厅营业时间和饮食限制请自行确认。'},
  crossing:{window:'午餐后',title:'神武门 → 景山公园南门',duration:'预留 15–25 分钟',action:'请走有指示的行人过街设施。这里是编辑预留时间，并非实测步行时长；可在下方查询高德实时路线。'},
  jingshan:{window:'下午 · 自由安排',title:'从景山回望故宫',duration:'建议 60–90 分钟',action:'从南门入园；天气和体力允许时可登万春亭。若台阶吃力或视野不佳，也可选择山下步道。'}
 },
 places:{
  'bj-palace':{name:'故宫博物院',reservation:'请通过故宫博物院官方渠道预约。可使用护照预约，并携带预约所用的证件原件。当前说明为参观前 7 天北京时间 20:00 放票；出发前请重新核对。',access:'从南侧午门进入、北侧神武门离开。原则上周一闭馆，法定节假日例外须另查。太和门施工区域请遵从现场绕行指示。',photography:'留意院落与屋顶细节。按各展厅摄影规则操作，不要默认可以使用闪光灯或三脚架。'},
  'bj-jingshan':{name:'景山公园',reservation:'近期北京市说明显示，含南门在内可现场购票，也可使用“畅游公园”线上渠道。请携带护照并核对出行当天的公告。',access:'从故宫神武门出来后，按行人过街标识前往景山南门。登观景处需要走台阶。',photography:'万春亭向南可俯瞰故宫屋顶。若能见度差或台阶吃力，可改走公园山下步道。'}
 },
 cards:{
  'card-wumen':{title:'入院路线',entranceName:'故宫博物院午门 · 入口',caution:'此卡用于向人询问步行方向，不表示车辆可以开到行人入口。请另行核对合法下客点。'},
  'card-shenwumen':{title:'离院路线',entranceName:'故宫博物院神武门 · 出口',caution:'此门仅供出院，不能从这里开始参观故宫。'},
  'card-jingshan':{title:'过街看故宫',entranceName:'景山公园南门 · 入口',caution:'请使用有指示的行人过街设施。公园地址并不等于允许车辆停靠的位置。'}
 },
 checklist:{
  reservation:{title:'确认故宫上午入场预约',detail:'在官方渠道核对日期与参观者姓名。勾选本项不会自动完成预约。'},
  passport:{title:'携带护照原件',detail:'携带预约所用证件。无需在本网站输入护照号码。'},
  approach:{title:'确认从住处到午门的路线',detail:'核对步行入口及乘车时的合法下客点；博物馆地址并非车辆入口。'},
  notice:{title:'核对最新入场公告',detail:'出发前确认周一开放例外、太和门施工和当天临时管制。'},
  offline:{title:'把地点卡保存到手机',detail:'保存后可开飞行模式试着打开文件。勾选本项本身不会保存文件。'}
 },
 budget:{admission:{label:'门票预算',note:'两处景点的计划金额，不是实时票价；不含特展。'},food:{label:'午餐、饮水与小食',note:'普通餐食和饮料的计划金额，不是餐厅报价。'},local:{label:'市内交通',note:'酒店位置未知，请按实际出行方式调整。'}},
 planB:{'Palace sold out or closed':{title:'故宫无票或闭馆',body:'不要抱着现场购票的期待前往午门。可改为已核实开放的景山与周边街区，或把故宫改到有票的日期。'},'Rain, haze or tired legs':{title:'下雨、雾霾或体力不足',body:'可以跳过山顶观景台，延长用餐休息，或走公园山下步道。'},'A gate or crossing is controlled':{title:'入口或过街路段临时管制',body:'听从现场工作人员指引，重新查询实时路线；如时间不足，可取消景山观景。'}},
 issues:{date:'尚未选择出行日期，无法核对开放日。',past:'该日期已过去，请选择实际出行日期。',monday:'当天是周一；故宫通常闭馆。除非已核实官方节假日例外，否则不适合使用本行程。',reservation:'尚未确认故宫上午入场预约；本页面不代订门票。',approach:'尚未确认抵达路线和车辆下客点。',freshness:'请按实际出行日期再次核对入场与预约信息。',works:'已公告太和门自 2026 年 8 月 3 日起施工；本版未核实重新开放日期，请遵从现场指引。'}
} as const;
