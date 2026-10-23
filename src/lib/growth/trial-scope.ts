import cities from '@/lib/travel/cities.json';
import {tripRequirements, TripRequirementsError} from '@/lib/travel/trip-requirements';
import type {MapPoint, TripMessage, VerifiedStop, VerifiedTrip} from '@/lib/travel/concierge-types';

export class GrowthDenied extends Error {constructor(message: string, public status = 429) {super(message);}}
const explanation = 'Guest trial: choose Shanghai for 1–3 days, with local interests or changes. Other destinations and unclear multi-city requests need sign-in; nothing has been generated or changed. / 游客试用限上海1–3天及本地偏好修改。其他目的地或无法确认的多城市请求请登录；尚未生成或改变行程。';
const normalize = (value: string) => value.normalize('NFKC').toLowerCase().replace(/[’‘]/g, "'");
const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const foreignCities = cities.filter(city => city.slug !== 'shanghai').flatMap(city => [city.name, city.chinese, city.slug.replaceAll('-', ' ')]);
const aliases = ['Peking', 'Xian', 'Xi An', 'Chungking', 'Canton', 'Lhasa', 'Tibet', 'Tokyo', 'Kyoto', 'Osaka', 'Seoul', 'Singapore', 'Taipei', 'Macao', 'Macau', '香港', '澳门', '台北', '拉萨', '西藏', '东京', '京都'];
const outsideNames = [...new Set([...foreignCities, ...aliases].map(normalize))].map(name => /[\u3400-\u9fff]/.test(name) ? new RegExp(escape(name), 'u') : new RegExp(`(?<![a-z])${escape(name)}(?![a-z])`, 'u'));

// Only treat a destination-like clause as a local request when it starts with a
// recognisable interest, constraint, date phrase or Shanghai place. An unknown
// city following “and”, “add” or “travel to” is denied, not silently dropped.
const localEnglish = /^(?:(?:i|we)\s+(?:like|love|prefer|want|have|need|dislike|don't|do not)|(?:with|for|on|starting|start|from|no|not|without|avoid|keep|more|less|easy|slow|relaxed|local|food|foods|architecture|art|arts|museum|museums|park|parks|garden|gardens|shopping|walking|walks|rest|restaurants|restaurant|cafes|cafe|coffee|vegetarian|vegan|children|child|family|kids|a child|a toddler|a park|a museum|the museum|the park|day\s+\d|\d{4}-)|(?:shanghai|the bund|bund|pudong|puxi|wukang|yu garden|yuyuan|zhujiajiao|xintiandi|disneyland|shanghai disney|french concession)\b)/i;
const localChinese = /^(?:喜欢|爱好|偏好|不喜欢|不想|不要|需要|希望|带|有|从|开始|出发|美食|吃|喝|建筑|艺术|博物馆|公园|花园|购物|步行|散步|休息|素食|慢|轻松|古街|老街|街巷|历史街区|历史建筑|社区|河边|江边|江景|河景|看江景|看河景|欣赏江景|沿江|餐厅|饭店|咖啡馆|美术馆|艺术馆|上海|外滩|浦东|浦西|武康|豫园|朱家角|新天地|迪士尼|法租界|第[一二三123]天)/;
const temporalEnglish = /^(?:(?:[01]?\d|2[0-3]):[0-5]\d(?:\s*(?:am|pm))?|(?:1[0-2]|0?[1-9])\s*(?:am|pm)|(?:the\s+)?(?:morning|afternoon|evening|night)|noon|midnight)(?=\s|$)/;
const genericLocalInterest = /^(?:(?:historic|historical|old|ancient|traditional|modern|quiet|peaceful|lively|small|beautiful|scenic|interesting|pedestrian|leafy|shaded|city|riverside|riverfront|waterfront|local)\s+)*(?:streets?|lanes?|neighbou?rhoods?|river(?:\s+views?)?|waterfront|skyline|parks?|gardens?|museums?|art\s+galleries|galleries|restaurants?|cafes?|markets?|shops?|temples?|architecture|art|food)\b/;
const localEnglishClause = (value: string) => value.split(/\s+(?:and|plus|then)\s+|\s*[&/]\s*/).every(part => {
  const candidate = part.trim().replace(/^(?:a|an|the)\s+/, '');
  return localEnglish.test(candidate) || temporalEnglish.test(candidate) || genericLocalInterest.test(candidate);
});
function localChineseClause(value: string) {
  const candidate = value.trim()
    .replace(/^(?:上午|下午|早上|早晨|晚上|中午|傍晚|凌晨)?\s*(?:[01]?\d|2[0-3])(?:[:：][0-5]\d|点(?:[0-5]?\d分?)?)/, '')
    .replace(/^(?:上午|下午|早上|早晨|晚上|中午|傍晚|凌晨)/, '')
    .replace(/^(?:(?:已经|已)?(?:预约了?|预订了?|订了|参观|游览|安排了?)|在|住在|住|继续前往|前往|去|继续到|改成|改为|换成|替换成|替换为)/, '');
  return !candidate || candidate.split(/以及|并且|和|与|及|、|[/&]/).every(part => localChinese.test(part.trim()));
}
function ambiguousDestination(text: string) {
  if (/\b(?:(?:another|other|second|different|unknown)\s+(?:city|destination)|multi[ -]?city|outside\s+shanghai|leave\s+shanghai|travel\s+elsewhere|visit\s+elsewhere|day\s+trip(?!\s+(?:to\s+)?(?:zhujiajiao|shanghai)))\b|其他城市|别的城市|另一个城市|未知城市|多城市|跨城|上海以外|离开上海/.test(text)) return true;
  // In “Yu Garden interior visit because ...”, visit is a noun. Replace only
  // that known local noun, so destination directives inside the reason are
  // still scanned (for example, “because I want to visit Atlantis”).
  const directives = text.replace(/\b((?:the bund|bund|pudong|puxi|wukang|yu garden|yuyuan|zhujiajiao|xintiandi|disneyland|shanghai disney|french concession)(?:\s+interior)?)\s+visit(?=\s+(?:because|due to|since)\b)/g, '$1 stop');
  const clauses = [
    ...text.matchAll(/\bshanghai(?:\s+(?:for\s+)?(?:\d+|one|two|three)\s+days?)?\s*(?:and|plus|then|&|\/|,)\s+([^.!?;\n]+)/g),
    ...directives.matchAll(/\b(?:add|include|visit|travel\s+to|go\s+to|head\s+to|continue\s+(?:on\s+to|on|to)|fly\s+to|train\s+to|overnight\s+in|stop\s+in)\s+([^.,;!?\n]+)/g),
    // Lookaheads allow overlapping matches: “a museum near Paris” must not be
    // accepted merely because the longer earlier clause starts with “museum”.
    ...text.matchAll(/(?=\b(?:in|at|near|around)\s+([^.,;!?\n]+))/g),
    ...text.matchAll(/\b(?:replace|swap|change)\s+(?:day\s+(?:\d+|one|two|three)|the\s+(?:first|second|third)\s+day)\s+(?:with|for|to)\s+([^.,;!?\n]+)/g),
    ...text.matchAll(/\bday\s+(?:\d+|one|two|three)\s*[:=-]\s*([^.,;!?\n]+)/g),
    ...text.matchAll(/(?:^|[.!?;\n])\s*([a-z][a-z' -]{0,40})\s+on\s+day\s+(?:\d+|one|two|three)\b/g),
  ];
  if (clauses.some(match => !localEnglishClause(match[1]))) return true;
  const beforeShanghai = text.match(/(?:^|[.,;!?])\s*([a-z][a-z' -]{0,40})\s+(?:and|plus|&|\/)\s*shanghai\b/);
  if (beforeShanghai && !localEnglishClause(beforeShanghai[1])) return true;
  const chineseClauses = [
    ...text.matchAll(/上海(?:和|与|及|、|\/|&|再去|然后去|加上|以及)([^，,。；;\n]+)/g),
    ...text.matchAll(/(?=(?:在|住在|住|前往|去|继续到|改成|改为|换成|替换成|替换为)([^，,。；;\n.!?]+))/g),
    ...text.matchAll(/(?:加入|增加)([^，,。；;\n]+)/g),
    ...text.matchAll(/第[一二三123]天\s*[:：]?\s*([^，,。；;\n.!?]+)/g),
  ];
  if (chineseClauses.some(match => !localChineseClause(match[1]))) return true;
  return false;
}

export function assertGuestScope(messages: TripMessage[], previous: unknown) {
  const text = normalize(messages.filter(message => message.role === 'user').map(message => message.text).join('\n'));
  let days: number | undefined;
  try {days = tripRequirements(messages, previous).days;}
  catch (error) {if (error instanceof TripRequirementsError) throw new GrowthDenied(explanation, 400); throw error;}
  if (!days || days < 1 || days > 3 || (!previous && !/\bshanghai\b|上海/.test(text)) || outsideNames.some(name => name.test(text)) || ambiguousDestination(text)) throw new GrowthDenied(explanation, 400);
}

export type GuestTrialScope = {city: 'shanghai'; days: 1 | 2 | 3};
/** This server-derived value must also be passed to the planning system prompt.
 * It is never accepted from a guest payload or inferred from a model city label. */
export function guestTrialScope(messages: TripMessage[], previous: unknown): GuestTrialScope {
  assertGuestScope(messages, previous);
  return {city:'shanghai', days:tripRequirements(messages, previous).days as 1 | 2 | 3};
}

const isShanghai = (value: string) => /^(?:shanghai|上海市?)$/.test(normalize(value.trim()));
function shanghaiMapIdentity(place: {point: MapPoint; adcode: string; region?: {city: string}}) {
  // These are the same conservative spatial limits used by google-maps.ts for
  // matching Shanghai. Bounds alone are insufficient: require provider city or
  // administrative identity as well, and reject contradictory provider fields.
  const region = place.region?.city?.trim();
  const code = place.adcode?.trim();
  return (!region || isShanghai(region)) && (!code || /^31\d{4}$/.test(code))
    && Boolean(region && isShanghai(region) || code && /^31\d{4}$/.test(code))
    && Number.isFinite(place.point?.lat) && Number.isFinite(place.point?.lng)
    && place.point.lng >= 120.8 && place.point.lng <= 122.1 && place.point.lat >= 30.6 && place.point.lat <= 31.9;
}
function provenShanghaiStop(stop: VerifiedStop) {return stop.placeStatus === 'matched' && Boolean(stop.place && shanghaiMapIdentity(stop.place));}

/** A trial must not publish a city guess or an unresolved/outside POI as local.
 * Account planning keeps its existing unknown-location policy unchanged. */
export function assertGuestResultScope(plan: Pick<VerifiedTrip, 'days'>, scope: GuestTrialScope) {
  if (scope.city !== 'shanghai' || ![1,2,3].includes(scope.days) || plan.days.length !== scope.days || plan.days.some(day =>
    !isShanghai(day.city) || Boolean(day.cityEnglish && !isShanghai(day.cityEnglish))
    || Boolean(day.intercityMode || day.transfer) || day.legs.some(leg => leg.mode === 'intercity')
    || day.stops.some(stop => !provenShanghaiStop(stop))
    || Boolean(day.hotelPlace && !shanghaiMapIdentity(day.hotelPlace))
    || (day.dining || []).some(meal => meal.options.some(option => !shanghaiMapIdentity(option)))
  )) throw new Error('The trial could not verify a Shanghai-only itinerary within your requested days. Your existing plan is retained. / 无法核实本次行程全部位于上海或符合要求的天数，已有行程保持不变。');
}
