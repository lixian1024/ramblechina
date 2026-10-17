import type {Locale} from './locales';
const labels:Record<string,string>={Beijing:'北京',Shanghai:'上海','Xi’an':'西安',Chengdu:'成都',Chongqing:'重庆',Guilin:'桂林',Hangzhou:'杭州',Suzhou:'苏州',Zhangjiajie:'张家界',Guangzhou:'广州',Shenzhen:'深圳',English:'英语',Spanish:'西班牙语',French:'法语',German:'德语',Italian:'意大利语',Portuguese:'葡萄牙语',Russian:'俄语',Japanese:'日语',Korean:'韩语',Arabic:'阿拉伯语','Mandarin Chinese':'普通话','Other (please specify in notes)':'其他（请在备注中说明）','Under USD 1,000':'低于 1,000 美元','USD 1,000–3,000':'1,000–3,000 美元','USD 3,000–5,000':'3,000–5,000 美元','USD 5,000–10,000':'5,000–10,000 美元','USD 10,000+':'10,000 美元以上'};
/** Labels change; stored preference values remain compatible with existing accounts. */
export const guideOptionLabel=(locale:Locale,value:string)=>locale==='zh'?labels[value]??value:value;
