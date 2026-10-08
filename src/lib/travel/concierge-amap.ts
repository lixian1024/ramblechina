import type { DayWeather, MapPoint, VerifiedLeg, VerifiedStop } from './concierge-types';

type Dict = Record<string, unknown>;
const cache = new Map<string, { until: number; value: Dict }>();

function object(value: unknown): Dict { return value && typeof value === 'object' && !Array.isArray(value) ? value as Dict : {}; }
function array(value: unknown): unknown[] { return Array.isArray(value) ? value : []; }
function string(value: unknown): string { return typeof value === 'string' ? value : ''; }
function number(value: unknown): number | undefined { const n = Number(value); return Number.isFinite(n) && n >= 0 ? n : undefined; }
function photoUrl(value: unknown): string | undefined {
  try {
    const url = new URL(string(value));
    if (!['http:', 'https:'].includes(url.protocol) || url.hostname !== 'store.is.autonavi.com' || !url.pathname.startsWith('/showpic/')) return undefined;
    url.protocol = 'https:';
    return url.toString();
  } catch { return undefined; }
}
function firstPlacePhoto(value: unknown): { url: string; title?: string } | undefined {
  return array(value).map(object).map(item => ({ url: photoUrl(item.url), title: string(item.title) || undefined }))
    .find(item => item.url && !/效果图|示意图|平面图|广告|海报/.test(item.title || '')) as { url: string; title?: string } | undefined;
}
function key() { return process.env.AMAMP_API_KEY?.trim() || process.env.AMAP_WEB_SERVICE_KEY?.trim() || ''; }
export function amapConfigured() { return Boolean(key()); }
const coordinate = (point: MapPoint) => `${point.lng.toFixed(6)},${point.lat.toFixed(6)}`;

async function amapJson(path: string, params: Record<string, string>, ttlMs = 5 * 60_000): Promise<Dict> {
  const token = key();
  if (!token) throw new Error('Amap Web Service key is not configured.');
  const cacheKey = `${path}?${new URLSearchParams(params)}`;
  const hit = cache.get(cacheKey);
  if (hit && hit.until > Date.now()) return hit.value;
  const url = new URL(`https://restapi.amap.com/${path}`);
  url.search = new URLSearchParams({ ...params, key: token }).toString();
  let response: Response;
  try { response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(9_000) }); }
  catch { throw new Error('Amap is temporarily unreachable.'); }
  if (!response.ok) throw new Error('Amap returned an unavailable response.');
  const data = object(await response.json().catch(() => null));
  if (string(data.status) !== '1') throw new Error('Amap could not complete this lookup.');
  cache.set(cacheKey, { until: Date.now() + ttlMs, value: data });
  if (cache.size > 500) for (const [item, value] of cache) if (value.until <= Date.now()) cache.delete(item);
  return data;
}

function placeScore(candidate: Dict, query: string, kind: 'hotel' | 'visit'): number {
  const clean = (value: string) => value.toLowerCase().replace(/[\s()（）·—－-]/g, '');
  const name = clean(string(candidate.name));
  const target = clean(query);
  if (!name || !target) return 0;
  const stem = (value: string) => clean(value.split(/[（(]/)[0]).replace(/(?:酒楼|餐厅|饭店|景区)$/, '');
  const nameStem = stem(string(candidate.name));
  const queryStem = stem(query);
  let score = name === target ? 5 : name.startsWith(target) ? 4 : name.includes(target) ? 3 : target.includes(name) ? 2 : 0;
  if (queryStem.length >= 2 && nameStem === queryStem) score = Math.max(score, 4);
  else if (queryStem.length >= 2 && nameStem.startsWith(queryStem)) score = Math.max(score, 3);
  const category = string(candidate.type);
  const asksForTransport = /地铁站|火车站|高铁站|机场|公交站|车站|station|airport/i.test(query);
  if (category.startsWith('交通设施服务') && !asksForTransport) score -= 6;
  if (category.startsWith('地名地址信息')) score -= 3;
  if (kind === 'hotel') {
    if (category.startsWith('住宿服务')) score += 3;
    if (category.startsWith('餐饮服务')) score -= 2;
  } else {
    if (category.startsWith('风景名胜;风景名胜;')) score += 4;
    else if (category.startsWith('风景名胜')) score += 1;
    if (category.startsWith('餐饮服务')) score += 1;
    if (category.startsWith('住宿服务')) score -= 2;
  }
  return score;
}

export async function findAmapPlace(query: string, city: string, kind: 'hotel' | 'visit' = 'visit'): Promise<VerifiedStop['place'] | undefined> {
  if (!query.trim()) return undefined;
  const data = await amapJson('v5/place/text', {
    keywords: query.slice(0, 80), region: city.slice(0, 40), city_limit: 'true',
    page_size: '5', show_fields: kind === 'hotel' ? 'business' : 'business,photos',
  }, 30 * 60_000);
  const candidates = array(data.pois).map(object).sort((a, b) => placeScore(b, query, kind) - placeScore(a, query, kind));
  const best = candidates[0];
  if (!best || placeScore(best, query, kind) < 2) return undefined;
  const raw = string(best.location).split(',').map(Number);
  if (raw.length !== 2 || !raw.every(Number.isFinite)) return undefined;
  const business = object(best.business);
  const photo = firstPlacePhoto(best.photos);
  return {
    id: string(best.id), name: string(best.name), address: string(best.address),
    point: { lng: raw[0], lat: raw[1] }, adcode: string(best.adcode), citycode: string(best.citycode),
    category: string(best.type) || undefined,
    openingHours: string(business.opentime_today) || string(business.opentime_week) || undefined,
    photo,
    checkedAt: new Date().toISOString(),
  };
}

export type NearbyDiningPlace = { name: string; address: string; type: string; metres: number; point: MapPoint };

export async function diningNearHotel(hotelQuery: string): Promise<{ hotel: NonNullable<VerifiedStop['place']>; restaurants: NearbyDiningPlace[] } | undefined> {
  const matches = await amapJson('v5/place/text', {
    keywords: hotelQuery.slice(0, 80), types: '100000', page_size: '5',
  }, 30 * 60_000);
  const best = array(matches.pois).map(object).find(candidate => string(candidate.type).startsWith('住宿服务;宾馆酒店;') && !/大堂|停车场|餐厅|会议中心/.test(string(candidate.name)));
  if (!best) return undefined;
  const [lng, lat] = string(best.location).split(',').map(Number);
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return undefined;
  const hotel: NonNullable<VerifiedStop['place']> = {
    id: string(best.id), name: string(best.name), address: string(best.address),
    point: { lng, lat }, adcode: string(best.adcode), citycode: string(best.citycode), checkedAt: new Date().toISOString(),
  };
  const data = await amapJson('v5/place/around', {
    location: coordinate(hotel.point), radius: '1200', types: '050000', sortrule: 'weight', page_size: '25',
  }, 20 * 60_000);
  const seen = new Set<string>();
  const restaurants = array(data.pois).map(raw => {
    const poi = object(raw);
    const name = string(poi.name).trim();
    const type = string(poi.type);
    const metres = number(poi.distance);
    const [lng, lat] = string(poi.location).split(',').map(Number);
    if (!name || !type.startsWith('餐饮服务') || metres === undefined || metres > 1200 || !Number.isFinite(lng) || !Number.isFinite(lat)) return null;
    if (/咖啡|茶馆|甜品|蛋糕|面包|饮品|酒吧|快餐|小吃|锅贴/.test(`${name} ${type}`)) return null;
    if (seen.has(name)) return null;
    seen.add(name);
    return { name, address: string(poi.address), type, metres, point: { lng, lat } };
  }).filter((place): place is NearbyDiningPlace => place !== null).slice(0, 5);
  return restaurants.length ? { hotel, restaurants } : undefined;
}

export async function photosForAmapPlaces(ids: string[]): Promise<Record<string, { url: string; title?: string }>> {
  if (!ids.length) return {};
  const data = await amapJson('v5/place/detail', { id: ids.join('|'), show_fields: 'photos' }, 30 * 60_000);
  const result: Record<string, { url: string; title?: string }> = {};
  for (const raw of array(data.pois)) {
    const place = object(raw);
    const id = string(place.id);
    const photo = firstPlacePhoto(place.photos);
    if (ids.includes(id) && photo) result[id] = photo;
  }
  return result;
}

function distanceMetres(a: MapPoint, b: MapPoint) {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 12_742_000 * Math.asin(Math.min(1, Math.sqrt(h)));
}

type RouteOption = { mode: VerifiedLeg['mode']; minutes: number; metres?: number; walkingMetres?: number; geometry?: VerifiedLeg['geometry']; checkedAt: string; alternatives?: VerifiedLeg['alternatives'] };

function polyline(value: unknown): MapPoint[] {
  return string(value).split(';').map(pair => {
    const [lng, lat] = pair.trim().split(/[,\s]+/).map(Number);
    return { lng, lat };
  }).filter(point => Number.isFinite(point.lng) && Number.isFinite(point.lat) && point.lng >= 73 && point.lng <= 135 && point.lat >= 18 && point.lat <= 54);
}

function compact(points: MapPoint[]): MapPoint[] {
  if (points.length <= 350) return points;
  const stride = Math.ceil(points.length / 350);
  return points.filter((_, index) => index % stride === 0 || index === points.length - 1);
}

function geometryFor(mode: 'walking' | 'driving' | 'transit', option: Dict, from: MapPoint, to: MapPoint): VerifiedLeg['geometry'] {
  if (mode !== 'transit') {
    const points = array(option.steps).flatMap(step => polyline(object(step).polyline));
    return points.length > 1 ? [{ kind: 'route', points: compact(points) }] : [{ kind: 'connection', points: [from, to] }];
  }
  const sections: NonNullable<VerifiedLeg['geometry']> = [];
  const append = (points: MapPoint[], kind: 'route' | 'connection' = 'route') => {
    if (points.length < 2) return;
    const previous = sections.at(-1)?.points.at(-1) || from;
    if (distanceMetres(previous, points[0]) > 20) sections.push({ kind: 'connection', points: [previous, points[0]] });
    sections.push({ kind, points: compact(points) });
  };
  for (const raw of array(option.segments)) {
    const segment = object(raw);
    const walking = object(segment.walking);
    append(array(walking.steps).flatMap(step => polyline(object(step).polyline)));
    const bus = object(segment.bus);
    const line = object(array(bus.buslines)[0]);
    append(polyline(line.polyline));
    const railway = object(segment.railway);
    const departure = polyline(object(railway.departure_stop).location);
    const arrival = polyline(object(railway.arrival_stop).location);
    if (departure.length && arrival.length) append([departure[0], arrival[0]], 'connection');
  }
  const last = sections.at(-1)?.points.at(-1) || from;
  if (distanceMetres(last, to) > 20) sections.push({ kind: 'connection', points: [last, to] });
  return sections.length ? sections : [{ kind: 'connection', points: [from, to] }];
}

async function localRoute(mode: 'walking' | 'driving' | 'transit', from: NonNullable<VerifiedStop['place']>, to: NonNullable<VerifiedStop['place']>, easier: boolean): Promise<RouteOption | undefined> {
  const shared = { origin: coordinate(from.point), destination: coordinate(to.point), show_fields: 'cost,polyline' };
  let path: string, params: Record<string, string>;
  if (mode === 'transit') {
    if (!from.citycode || !to.citycode) return undefined;
    path = 'v5/direction/transit/integrated';
    params = { ...shared, city1: from.citycode, city2: to.citycode, strategy: easier ? '3' : '0', AlternativeRoute: '2' };
  } else {
    path = `v5/direction/${mode}`;
    params = shared;
  }
  const data = await amapJson(path, params, 8 * 60_000);
  const route = object(data.route);
  const option = object(array(mode === 'transit' ? route.transits : route.paths)[0]);
  const cost = object(option.cost);
  const seconds = number(cost.duration ?? option.duration);
  if (seconds === undefined || seconds <= 0) return undefined;
  const segments = array(option.segments).map(object);
  const walkingMetres = mode === 'transit' ? segments.reduce((sum, part) => sum + (number(object(part.walking).distance) || 0), 0) : undefined;
  return {
    mode: mode === 'walking' ? 'walk' : mode === 'driving' ? 'taxi' : 'transit',
    minutes: Math.ceil(seconds / 60), metres: number(option.distance), walkingMetres,
    geometry: geometryFor(mode, option, from.point, to.point),
    checkedAt: new Date().toISOString(),
  };
}

export async function routeBetween(from: NonNullable<VerifiedStop['place']>, to: NonNullable<VerifiedStop['place']>, easier: boolean): Promise<RouteOption | undefined> {
  const crossCity = Boolean((from.citycode && to.citycode && from.citycode !== to.citycode) || (from.adcode && to.adcode && from.adcode.slice(0, 4) !== to.adcode.slice(0, 4)));
  if (crossCity) {
    const [transit, drive] = await Promise.all([
      localRoute('transit', from, to, easier).catch(() => undefined),
      distanceMetres(from.point, to.point) < 350_000 ? localRoute('driving', from, to, easier).catch(() => undefined) : Promise.resolve(undefined),
    ]);
    if (transit) return { ...transit, mode: 'intercity', alternatives: drive ? [{ mode: 'taxi', minutes: drive.minutes, metres: drive.metres }] : [] };
    if (drive) return { ...drive, alternatives: [] };
    return undefined;
  }
  const direct = distanceMetres(from.point, to.point);
  if (direct < 700) return localRoute('walking', from, to, easier).catch(() => undefined);
  if (direct < 2_000) {
    const [walk, drive] = await Promise.all([
      localRoute('walking', from, to, easier).catch(() => undefined),
      easier ? localRoute('driving', from, to, easier).catch(() => undefined) : Promise.resolve(undefined),
    ]);
    return easier && walk && walk.minutes > 15 && drive ? drive : walk || drive;
  }
  const [transit, drive] = await Promise.all([
    localRoute('transit', from, to, easier).catch(() => undefined),
    localRoute('driving', from, to, easier).catch(() => undefined),
  ]);
  if (easier && drive && (!transit || (transit.walkingMetres || 0) > 500)) return drive;
  return transit || drive;
}

export async function weatherFor(adcode: string, date?: string): Promise<DayWeather> {
  if (!date) return { status: 'date-needed' };
  if (!adcode) return { status: 'unavailable' };
  try {
    const data = await amapJson('v3/weather/weatherInfo', { city: adcode, extensions: 'all' }, 60 * 60_000);
    const forecast = object(array(data.forecasts)[0]);
    const cast = object(array(forecast.casts).find(item => string(object(item).date) === date));
    if (!string(cast.date)) return { status: 'outside-range' };
    return {
      status: 'forecast', day: string(cast.dayweather), night: string(cast.nightweather),
      high: string(cast.daytemp), low: string(cast.nighttemp), reportedAt: string(forecast.reporttime),
    };
  } catch { return { status: 'unavailable' }; }
}

export async function staticAmap(points: MapPoint[], center: MapPoint): Promise<Response> {
  const token = key();
  if (!token) return new Response('Amap key is not configured', { status: 503 });
  const valid = points.slice(0, 10).filter(point => point.lng >= 73 && point.lng <= 135 && point.lat >= 18 && point.lat <= 54);
  const params: Record<string, string> = { size: '900*600', scale: '1', key: token };
  if (valid.length) {
    params.markers = valid.map((point, index) => `mid,0x2f6e55,${String.fromCharCode(65 + index)}:${coordinate(point)}`).join('|');
    if (valid.length > 1) params.paths = `4,0x2f6e55,0.8,,:${valid.map(coordinate).join(';')}`;
  } else {
    params.location = coordinate(center);
    params.zoom = '11';
  }
  const url = new URL('https://restapi.amap.com/v3/staticmap');
  url.search = new URLSearchParams(params).toString();
  try {
    const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(9_000) });
    const type = response.headers.get('content-type') || '';
    if (!response.ok || !type.startsWith('image/')) return new Response('Amap map unavailable', { status: 502 });
    return new Response(await response.arrayBuffer(), { headers: { 'Content-Type': type, 'Cache-Control': 'private, max-age=180' } });
  } catch { return new Response('Amap map unavailable', { status: 502 }); }
}
