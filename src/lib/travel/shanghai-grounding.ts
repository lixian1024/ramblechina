import { findGooglePlace } from './google-maps';
import { shanghaiDiningAdvice } from './shanghai-quality';
import type { DraftTrip, TripMessage, VerifiedStop, VerifiedTrip } from './concierge-types';
import {venueCandidateBlocked} from './venue-access';
import {tripRequirements,tripDate} from './trip-requirements';

type Place = NonNullable<VerifiedStop['place']>;
type Candidate = { search: string; place: Place };
export type ShanghaiPlanning = {
  clusters: { day: number; theme: string; candidates: Candidate[] }[];
  unavailable: string[];
};

// Query seeds are not travel facts. Only current, city-limited map matches enter the catalogue.
const clusters = [
  { theme: 'Old City and historic waterfront', queries: ['豫园', '外滩'], pudong: false },
  { theme: 'Historic residential architecture', queries: ['武康大楼', '思南公馆'], pudong: false },
  { theme: 'Pudong modern skyline', queries: ['陆家嘴中心绿地', '上海中心大厦'], pudong: true },
];

function mode(messages: TripMessage[], previous: unknown) {
  if (previous && typeof previous === 'object' && 'days' in previous) return undefined;
  const brief = messages.filter(message => message.role === 'user').map(message => message.text).join('\n');
  if (!/shanghai|上海/i.test(brief) || /beijing|hangzhou|suzhou|北京|杭州|苏州/i.test(brief)) return undefined;
  if (/only[^.\n]*modern architecture|只[^。\n]*现代建筑/i.test(brief)) return 'modern';
  if (/\b3\s*days?\b|3\s*天/i.test(brief) && /food|美食/i.test(brief) && /architecture|建筑/i.test(brief)) return 'three';
  if (/\bone\s+(?:relaxed\s+)?day\b|\b1\s*day\b|一天/i.test(brief)
    && /relaxed|easy|slow|轻松/i.test(brief)) return 'relaxed';
}

const selectedClusters = (selected: ReturnType<typeof mode>) => selected === 'modern' ? [clusters[2]]
  : selected === 'relaxed' ? [clusters[0]] : clusters;

export function shanghaiResearchFocus(messages: TripMessage[], previous: unknown) {
  const selected = mode(messages, previous);
  if (!selected) return undefined;
  const start=tripRequirements(messages,previous).startDate;
  const areas = selectedClusters(selected)
    .map((cluster,index) => `${cluster.theme}: ${cluster.queries.filter(query=>!venueCandidateBlocked(query,'上海',start?tripDate(start,index):undefined)).join(', ')}`).join('; ');
  return `Research these separate Shanghai candidate areas: ${areas}. These are search candidates, not asserted facts. Find source-supported dishes or dining options for EACH area, with citations and precise area associations, not just a citywide food list. Search for food near Yu Garden/Bund, Wukang/Sinan and Lujiazui when those areas are included. Flag missing venue facts and food information; do not infer restaurants, hours or access rules. For modern architecture only, focus on skyline buildings rather than historic residential architecture.`;
}

const distance = (a: Place, b: Place) => Math.hypot((a.point.lng - b.point.lng) * 95, (a.point.lat - b.point.lat) * 111);

export async function groundShanghaiPlanning(messages: TripMessage[], previous: unknown): Promise<ShanghaiPlanning | undefined> {
  const selected = mode(messages, previous);
  if (!selected) return undefined;
  const unavailable: string[] = [];
  const start=tripRequirements(messages,previous).startDate;
  const planned = await Promise.all(selectedClusters(selected).map(async (cluster, index) => {
    const matches = await Promise.all(cluster.queries.map(async search => {
      if(venueCandidateBlocked(search,'上海',start?tripDate(start,index):undefined)){unavailable.push(search);return undefined;}
      try {
        const place = await findGooglePlace(search, '上海');
        if (place && (place.adcode === '310115') === cluster.pudong) return { search, place };
      } catch { /* Missing map data remains missing; there is no static POI fallback. */ }
      unavailable.push(search);
      return undefined;
    }));
    const candidates: Candidate[] = [];
    for (const candidate of matches) {
      if (!candidate) continue;
      if (candidates.some(prior => prior.place.id === candidate.place.id)) continue;
      if (candidates.some(prior => distance(prior.place, candidate.place) > 4)) {
        unavailable.push(candidate.search);
        continue;
      }
      candidates.push(candidate);
    }
    return { day: index + 1, theme: cluster.theme, candidates };
  }));
  return { clusters: planned, unavailable };
}

const transport = /渡口|轮渡|ferry terminal|ferry crossing|leave hotel|check.in/i;
const identity = (stop: VerifiedStop | DraftTrip['days'][number]['stops'][number]) => [stop.search, stop.name, stop.nameChinese, stop.nameEnglish].join(' ');

/** A failed model repair cannot keep an unbooked transfer as a sightseeing stop. */
export function removeShanghaiTransportStops(draft: DraftTrip) {
  const withoutFerry = (value?: string) => value?.split(/(?<=[.!?。！？])\s*/)
    .filter(sentence => !/ferry|渡口|轮渡/i.test(sentence)).join(' ').trim();
  let removed = false;
  const days = draft.days.map(day => {
    if (!/^(?:上海(?:市)?|shanghai)$/i.test(day.city.trim())) return day;
    const stops = day.stops.filter(stop => stop.booked || !transport.test(identity(stop)));
    if (stops.length === day.stops.length) return day;
    removed = true;
    return { ...day, stops, note: withoutFerry(day.note) };
  });
  return {
    ...draft, days, summary: removed ? withoutFerry(draft.summary) || '' : draft.summary,
  };
}

/**
 * Last part of the bounded repair: select a compact subset of already researched AND mapped
 * stops. It never creates a new attraction, location, description, opening time or route.
 * Explicit must-visits/bookings and existing plans are left to the conflict gate.
 */
export function compactShanghaiRepair(plan: VerifiedTrip, planning: ShanghaiPlanning | undefined, messages: TripMessage[], previous: unknown, zh: boolean): DraftTrip | undefined {
  const selected = mode(messages, previous);
  if (!planning || (selected !== 'three' && selected !== 'relaxed') || plan.days.length !== (selected === 'three' ? 3 : 1)
    || plan.days.some(day => day.stops.some(stop => stop.booked))) return undefined;
  const brief = messages.filter(message => message.role === 'user').map(message => message.text).join('\n');
  if (/must|include|ticket|reserv|booked|一定|必须|包含|预约/i.test(brief)) return undefined;
  const pool = plan.days.flatMap(day => day.stops).filter(stop => stop.place && !transport.test(identity(stop)));
  const used = new Set<string>();
  const days = planning.clusters.map((cluster, index) => {
    const anchors = cluster.candidates.map(candidate => candidate.place);
    const ranked = pool.filter(stop => !used.has(stop.place!.id) && anchors.some(anchor =>
      (anchor.adcode === '310115') === (stop.place!.adcode === '310115') && distance(anchor, stop.place!) <= 1.5)
      && (stop.category === 'food' || anchors.some(anchor => anchor.id === stop.place!.id)))
      .sort((a, b) => {
        const rank = (stop: VerifiedStop) => anchors.some(anchor => anchor.id === stop.place!.id) ? 0 : 1;
        return rank(a) - rank(b);
      });
    const stops: VerifiedStop[] = [];
    for (const stop of ranked) {
      if (used.has(stop.place!.id) || stops.length === (selected === 'relaxed' ? 2 : 3)) continue;
      if (stops.some(prior => distance(prior.place!, stop.place!) > 4)) continue;
      stops.push(stop);
      used.add(stop.place!.id);
    }
    // Follow the short open path with least straight-line movement. Route durations are rechecked.
    const permutations = (items: VerifiedStop[]): VerifiedStop[][] => items.length <= 1 ? [items] : items.flatMap((item, i) =>
      permutations(items.filter((_, j) => j !== i)).map(rest => [item, ...rest]));
    const pathLength = (items: VerifiedStop[]) => items.slice(1).reduce((sum, item, i) => sum + distance(items[i].place!, item.place!), 0);
    const ordered = permutations(stops.filter(stop => stop.category !== 'food')).sort((a, b) => pathLength(a) - pathLength(b))[0];
    const original = plan.days[index];
    const visits = [...ordered.map((stop, i) => ({ stop, at: i === 0 ? '09:30' : i === 1 ? '14:00' : '16:00' })),
      ...stops.filter(stop => stop.category === 'food').map(stop => ({ stop, at: (stop.at || '') >= '17:00' ? '18:00' : '12:00' }))]
      .sort((a, b) => a.at.localeCompare(b.at));
    const names = visits.map(({ stop }) => zh ? stop.nameChinese || stop.name : stop.nameEnglish || stop.name).join(' → ');
    return {
      city: original.city, cityEnglish: original.cityEnglish, date: original.date, hotel: original.hotel,
      title: zh ? ['老城与历史滨江', '历史住宅建筑', '浦东现代天际线'][index] : cluster.theme,
      note: `${zh ? `按 ${names} 的顺序，保持在同一片区；删去未匹配地点和绕行停留，留出用餐与休息时间。`
        : `Follow ${names} within this area. Unmatched places and detours were removed to leave room for meals and rest.`} ${shanghaiDiningAdvice(original.note)}`.trim(),
      stops: visits.map(({ stop, at }) => ({
        name: stop.name, search: stop.search, nameChinese: stop.nameChinese, nameEnglish: stop.nameEnglish,
        pinyin: stop.pinyin, category: stop.category, admission: stop.admission,
        // Timings and sequence are new planning suggestions, not retained booking or access facts.
        at, durationMinutes: Math.min(stop.durationMinutes, stop.category === 'food' ? 60 : 90),
        why: stop.why, description: stop.description,
        visitTip: zh ? '建议时间不是开放时间；出发前请向场馆确认开放、预约与入场要求。'
          : 'Suggested times are not opening hours. Confirm hours, reservations and access with the venue before departure.',
      })),
    };
  });
  if (days.some(day => !day.stops.some(stop => stop.category !== 'food'))) return undefined;
  return {
    title: plan.title, summary: selected === 'relaxed'
      ? (zh ? '减少到同一片区的少量停留，留出用餐与休息时间。' : 'Fewer visits in one compact area, with time for meals and rest.')
      : (zh ? '按三个不同片区安排建筑游览与附近用餐，减少折返。'
        : 'Architecture visits and nearby meal breaks in three distinct areas, with fewer detours.'),
    startDate: plan.startDate, travelStyle: plan.travelStyle, questions: plan.questions, days,
  };
}
