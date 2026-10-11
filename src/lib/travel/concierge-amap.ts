import type { DayWeather, MapPoint, VerifiedLeg, VerifiedStop } from './concierge-types';

import { distanceMetres, findGooglePlace, diningNearGooglePlace, diningNearGoogleHotel, photosForGooglePlaces, googleRoute, staticGoogle } from './google-maps';
import { toGcj02, toWgs84 } from './map-coordinates';

type Dict = Record<string, unknown>;
const cache = new Map<string, { until: number; value: Dict }>();

function object(value: unknown): Dict { return value && typeof value === 'object' && !Array.isArray(value) ? value as Dict : {}; }
function array(value: unknown): unknown[] { return Array.isArray(value) ? value : []; }
function string(value: unknown): string { return typeof value === 'string' ? value : ''; }
function number(value: unknown): number | undefined { const n = Number(value); return Number.isFinite(n) && n >= 0 ? n : undefined; }
function key() { return process.env.AMAMP_API_KEY?.trim() || process.env.AMAP_WEB_SERVICE_KEY?.trim() || ''; }
export function amapConfigured() { return Boolean(key()); }
const coordinate = (point: MapPoint) => `${point.lng.toFixed(6)},${point.lat.toFixed(6)}`;

async function amapJson(path: string, params: Record<string, string>, ttlMs = 5 * 60_000): Promise<Dict> {
  if (!['v3/weather/weatherInfo', 'v5/direction/transit/integrated'].includes(path)) throw new Error('Unsupported Amap service.');
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

// Compatibility exports for callers; all POI/photo/dining lookups now use Google.
export const findAmapPlace = findGooglePlace;
export const diningNearShanghaiStop = diningNearGooglePlace;
export const diningNearHotel = diningNearGoogleHotel;
export const photosForAmapPlaces = photosForGooglePlaces;

type RouteOption = { provider?: 'Google' | 'Amap'; mode: VerifiedLeg['mode']; minutes: number; metres?: number; walkingMetres?: number; geometry?: VerifiedLeg['geometry']; checkedAt: string; alternatives?: VerifiedLeg['alternatives'] };

function polyline(value: unknown): MapPoint[] {
  return string(value).split(';').map(pair => {
    const [lng, lat] = pair.trim().split(/[,\s]+/).map(Number);
    return toWgs84({ lng, lat, system: 'GCJ-02' });
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
  if (mode !== 'transit') return googleRoute(mode, from, to);
  if (!from.citycode || !to.citycode) return undefined;
  const native = (place: NonNullable<VerifiedStop['place']>) => toGcj02({ ...place.point, system: place.point.system || (place.provider === 'Google' ? 'WGS84' : 'GCJ-02') });
  const path = 'v5/direction/transit/integrated';
  const params = { origin: coordinate(native(from)), destination: coordinate(native(to)), show_fields: 'cost,polyline', city1: from.citycode, city2: to.citycode, strategy: easier ? '3' : '0', AlternativeRoute: '2' };
  const data = await amapJson(path, params, 8 * 60_000);
  const route = object(data.route);
  const option = object(array(route.transits)[0]);
  const cost = object(option.cost);
  const seconds = number(cost.duration ?? option.duration);
  if (seconds === undefined || seconds <= 0) return undefined;
  const segments = array(option.segments).map(object);
  const walkingMetres = mode === 'transit' ? segments.reduce((sum, part) => sum + (number(object(part.walking).distance) || 0), 0) : undefined;
  return {
    mode: 'transit', provider: 'Amap',
    minutes: Math.ceil(seconds / 60), metres: number(option.distance), walkingMetres,
    geometry: geometryFor(mode, option, toWgs84({ ...from.point, system: from.point.system || (from.provider === 'Google' ? 'WGS84' : 'GCJ-02') }), toWgs84({ ...to.point, system: to.point.system || (to.provider === 'Google' ? 'WGS84' : 'GCJ-02') })),
    checkedAt: new Date().toISOString(),
  };
}

export async function routeBetween(from: NonNullable<VerifiedStop['place']>, to: NonNullable<VerifiedStop['place']>, easier: boolean): Promise<RouteOption | undefined> {
  const crossCity = Boolean(from.citycode && to.citycode ? from.citycode !== to.citycode
    : from.adcode && to.adcode && from.adcode.slice(0, 4) !== to.adcode.slice(0, 4));
  if (crossCity) {
    const [transit, drive] = await Promise.all([
      localRoute('transit', from, to, easier).catch(() => undefined),
      distanceMetres(from.point, to.point) < 350_000 ? localRoute('driving', from, to, easier).catch(() => undefined) : Promise.resolve(undefined),
    ]);
    if (transit) return { ...transit, mode: 'intercity', alternatives: drive ? [{ mode: 'taxi', provider: drive.provider, minutes: drive.minutes, metres: drive.metres }] : [] };
    if (drive) return { ...drive, alternatives: [] };
    return undefined;
  }
  const direct = distanceMetres(from.point, to.point);
  const crossesPudong = from.adcode.startsWith('31') && to.adcode.startsWith('31')
    && (from.adcode === '310115') !== (to.adcode === '310115');
  if (direct < 2_000 && !crossesPudong) {
    const [walk, drive] = await Promise.all([
      localRoute('walking', from, to, easier).catch(() => undefined),
      easier ? localRoute('driving', from, to, easier).catch(() => undefined) : Promise.resolve(undefined),
    ]);
    if (walk) return easier && walk.minutes > 15 && drive ? drive : walk;
    if (drive) return drive;
    // Missing or mixed-mode walking results need another transport lookup.
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

export const staticAmap = staticGoogle;
