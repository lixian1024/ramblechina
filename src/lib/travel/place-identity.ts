import type { VerifiedStop } from './concierge-types';

type Place=NonNullable<VerifiedStop['place']>;
const compact=(value:string)=>value.normalize('NFKC').toLowerCase().replace(/[\s'’()（）·—－-]/g,'');
type Landmark={city:string;query:string;fallbackQuery?:string;aliases:string[];types:string[];bounds:[number,number,number,number];sourceUrl:string};

// Name relationships come from the cited venues/government. Bounds are coarse
// checks around live Google listings, never substitute map coordinates.
const landmarks:Landmark[]=[
 {city:'上海',query:'豫园',fallbackQuery:'Yu Garden 安仁街218号',aliases:['豫园','上海豫园','Yu Garden','Yuyuan Garden'],types:['botanical_garden','tourist_attraction'],bounds:[121.49,31.226,121.494,31.23],sourceUrl:'https://www.yugarden.com.cn/page/articleview/message.html'},
 {city:'九寨沟',query:'九寨沟国家公园',aliases:['九寨沟','九寨沟景区','九寨沟风景名胜区','九寨沟国家公园','Jiuzhaigou Valley','Jiuzhaigou National Park','Jiuzhai Valley National Park'],types:['national_park','tourist_attraction'],bounds:[103.80,33.02,104.05,33.30],sourceUrl:'https://www.jiuzhai.com/about'},
 {city:'重庆',query:'美心红酒小镇',aliases:['美心红酒小镇','美心·红酒小镇','Meixin Wine Town','Meixin Red Wine Town','Mexin Wine Town'],types:['park','amusement_park','tourist_attraction'],bounds:[107.16,29.64,107.22,29.69],sourceUrl:'https://cq.gov.cn/zwgk/zfxxgkzl/fdzdgknr/zdmsxx/fp/fplyzyxxgk/202501/t20250107_14057403.html'},
 {city:'西安',query:'秦始皇帝陵博物院',aliases:['秦始皇帝陵博物院','秦始皇兵马俑博物馆','兵马俑博物馆','Terracotta Warriors Museum','Terracotta Army Museum',"Emperor Qinshihuang's Mausoleum Site Museum"],types:['museum'],bounds:[109.25,34.37,109.29,34.40],sourceUrl:'https://www.bmy.com.cn/about/'},
 {city:'重庆',query:'解放碑步行街',aliases:['解放碑步行街','解放碑商业步行街','Jiefangbei Pedestrian Street'],types:['tourist_attraction'],bounds:[106.57,29.55,106.585,29.565],sourceUrl:'https://www.cq.gov.cn/zt/cyscjjq/xtfz/gjxfmdd/202411/t20241120_13817368.html'},
 {city:'重庆',query:'抗战胜利纪功碑暨人民解放纪念碑',aliases:['抗战胜利纪功碑暨人民解放纪念碑','人民解放纪念碑','重庆人民解放纪念碑','Jiefangbei Monument','People’s Liberation Monument',"People's Liberation Monument"],types:['historical_landmark','historical_place'],bounds:[106.575,29.555,106.579,29.56],sourceUrl:'https://dfz.cq.gov.cn/zqlswh/fjms_417821/202311/t20231102_12511619.html'},
];
export const landmarkForQuery=(query:string)=>landmarks.find(item=>item.aliases.some(alias=>compact(alias)===compact(query)));
export function landmarkMatches(place:Place,landmark:Landmark){
 const [west,south,east,north]=landmark.bounds;
 return place.region?.city===landmark.city&&landmark.aliases.some(alias=>compact(alias)===compact(place.name))
  &&landmark.types.some(type=>(place.category||'').split(';').includes(type))
  &&place.point.lng>=west&&place.point.lng<=east&&place.point.lat>=south&&place.point.lat<=north;
}

// Place IDs can be retained; photo resource names/URLs cannot. Fetch and validate
// this district landmark afresh, and disclose the distinct photo subject in UI.
export const districtPhotoSubjects:Record<string,{id:string;query:string;city:string;label:string;labelEnglish:string}>={
 ChIJ1S7X6oY0kzYRIyiS3lG6Abg:{id:'ChIJF9m5kYY0kzYR2dJCCVtOmpA',query:'人民解放纪念碑',city:'重庆',label:'解放碑纪念碑 · 步行街中心',labelEnglish:'Jiefangbei Monument · pedestrian street center'},
};
