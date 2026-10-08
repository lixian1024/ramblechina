import type { VerifiedDay, VerifiedLeg, VerifiedStop } from './concierge-types';
import { readableEnglish } from './english-display';

export function formatLeg(leg: VerifiedLeg, zh: boolean) {
  const name = zh ? { walk: '步行', transit: '公交 / 地铁', taxi: '驾车 / 打车', intercity: '跨城公共交通', unverified: '待核对交通' } : { walk: 'Walk', transit: 'Transit', taxi: 'Drive / taxi', intercity: 'Intercity transit', unverified: 'Travel time to check' };
  const time = leg.minutes === undefined ? '' : zh ? ` · 约 ${leg.minutes} 分钟` : ` · about ${leg.minutes} min`;
  const distance = leg.metres === undefined ? '' : ` · ${(leg.metres / 1000).toFixed(1)} ${zh ? '公里' : 'km'}`;
  const alternative = leg.alternatives?.[0];
  const option = alternative ? (zh ? ` · 另可驾车约 ${alternative.minutes} 分钟` : ` · drive option about ${alternative.minutes} min`) : '';
  return `${name[leg.mode]}${time}${distance}${option}`;
}

export function weatherLabel(day: VerifiedDay, zh: boolean) {
  if (day.weather.status === 'forecast') {
    const weather: Record<string, string> = { 晴: 'Sunny', 多云: 'Partly cloudy', 阴: 'Overcast', 小雨: 'Light rain', 中雨: 'Rain', 大雨: 'Heavy rain', 暴雨: 'Storm', 阵雨: 'Showers', 雷阵雨: 'Thunderstorms', 小雪: 'Light snow', 中雪: 'Snow', 大雪: 'Heavy snow', 雾: 'Fog', 霾: 'Haze' };
    const condition = zh ? day.weather.day || '' : weather[day.weather.day || ''] || readableEnglish(day.weather.day, 'Forecast');
    return `${condition} ${day.weather.high || '—'}° / ${day.weather.low || '—'}°`;
  }
  if (day.weather.status === 'date-needed') return zh ? '提供日期后查询天气' : 'Add dates for weather';
  if (day.weather.status === 'outside-range') return zh ? '尚无该日预报' : 'Forecast not available yet';
  return zh ? '天气暂不可用' : 'Weather unavailable';
}


export function visitDuration(minutes: number, zh: boolean) {
  const hours = Math.floor(minutes / 60), rest = minutes % 60;
  return zh ? [hours ? `${hours} 小时` : '', rest ? `${rest} 分钟` : ''].filter(Boolean).join(' ') : [hours ? `${hours} h` : '', rest ? `${rest} min` : ''].filter(Boolean).join(' ');
}

export function categoryLabel(stop: VerifiedStop, zh: boolean) {
  const labels = { sight: ['景点', 'Sight'], culture: ['文化', 'Culture'], nature: ['自然', 'Nature'], food: ['美食', 'Food'], shopping: ['购物', 'Shopping'], neighborhood: ['街区', 'Neighborhood'], other: ['体验', 'Experience'] };
  let category = stop.category;
  if (!category) {
    const type = stop.place?.category || '';
    category = /餐饮/.test(type) ? 'food' : /购物/.test(type) ? 'shopping' : /公园|植物园/.test(type) ? 'nature' : /博物|文化/.test(type) ? 'culture' : /风景名胜/.test(type) ? 'sight' : undefined;
  }
  return category && labels[category] ? labels[category][zh ? 0 : 1] : (zh ? '类型待补充' : 'Category to add');
}
