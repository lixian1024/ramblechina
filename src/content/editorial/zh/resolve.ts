import translations from './destinations.json';
import type {City} from '@/lib/travel/data';
import type {Locale} from '@/i18n/locales';
export const regionChinese:Record<string,string>={All:'全部地区',North:'华北',East:'华东',South:'华南',Southwest:'西南',Northwest:'西北',Northeast:'东北',Central:'华中'};
const provinces:Record<string,string>={Beijing:'北京',Shanghai:'上海',Guangxi:'广西',Sichuan:'四川',Shaanxi:'陕西',Zhejiang:'浙江',Chongqing:'重庆',Jiangsu:'江苏',Hunan:'湖南',Anhui:'安徽',Yunnan:'云南',Guizhou:'贵州',Fujian:'福建',Guangdong:'广东','Hong Kong SAR':'香港特别行政区','Macao SAR':'澳门特别行政区',Henan:'河南',Shanxi:'山西',Tianjin:'天津',Shandong:'山东',Heilongjiang:'黑龙江',Liaoning:'辽宁',Gansu:'甘肃',Qinghai:'青海',Xinjiang:'新疆',Hubei:'湖北',Hainan:'海南',Jiangxi:'江西'};
/** Display translations only: never overwrite stable IDs, coordinates, sources or duration suggestions. */
export function cityView(city:City,locale:Locale):City {
 if(locale!=='zh')return city;
 const copy=(translations as Record<string,string[]>)[city.slug];
 if(!copy)throw new Error(`Chinese destination copy missing: ${city.slug}`);
 return {...city,name:city.chinese,province:provinces[city.province]??city.province,tagline:copy[0],description:copy[1],food:copy[2],tip:copy[3],season:city.season.replace(/January|February|March|April|May|June|July|August|September|October|November|December/g,month=>String(['January','February','March','April','May','June','July','August','September','October','November','December'].indexOf(month)+1)+'月')};
}
export const overviewSights=(city:City)=>((translations as Record<string,string[]>)[city.slug]??[]).slice(4);
