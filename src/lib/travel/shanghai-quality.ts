import type { TripMessage, VerifiedDay, VerifiedStop, VerifiedTrip } from './concierge-types';

const isShanghai = (city: string) => /^(?:上海(?:市)?|shanghai)$/i.test(city.trim());
const time = (value?: string) => value ? Number(value.slice(0, 2)) * 60 + Number(value.slice(3)) : undefined;
const clock = (value: number) => {
  const bounded = Math.min(1439, Math.max(0, value));
  return `${String(Math.floor(bounded / 60)).padStart(2, '0')}:${String(bounded % 60).padStart(2, '0')}`;
};
const label = (stop: VerifiedStop, zh: boolean) => zh ? stop.nameChinese || stop.name : stop.nameEnglish || stop.name;
const identity = (stop: VerifiedStop) => [stop.search, stop.nameChinese, stop.nameEnglish, stop.name, stop.place?.name].join(' ');

/** Strip obsolete meal schedules while retaining the actual dining advice. */
export function shanghaiMealProse(note?: string) {
  return (note || '').replace(/Meal windows are planning suggestions; confirm restaurants, hours and reservations locally\.|用餐为计划时段；请现场确认餐厅、营业及预约。/g, '')
    .replace(/\be\.g\./gi, 'for example').replace(/\bi\.e\./gi, 'that is')
    .split(/(?<=[.!?。！？;；])\s*/).map(sentence => {
      if (!/\blunch\b|\bdinner\b|午餐|晚餐/i.test(sentence)) return sentence;
      // The location/time prefix is replaced by a real route anchor below. Content after
      // a recommendation verb or a colon belongs to the meal and must not be discarded.
      const advice = sentence.match(/\b(?:try|sample|taste|eat|consider|look for|choose|enjoy)\b[^]*|(?:推荐|品尝|尝尝|可以吃|建议吃)[^]*/i)?.[0]
        || sentence.split(/[:：](?!\d)\s*/).slice(1).join(': ')
        || (/\b(?:food|snacks?|dumplings?|buns?|noodles?|dishes?|cuisine|xiaolongbao|shengjian|benbang)\b/i.test(sentence)
          ? sentence.match(/\b(?:for|with)\s+([^]*)/i)?.[1] : '');
      return advice ? advice.replace(/\b\d{1,2}:\d{2}\s*(?:[–—-]\s*\d{1,2}:\d{2})?/g, '').trim() : '';
    }).filter(Boolean).join(' ').trim();
}

export function shanghaiDiningAdvice(note?: string) {
  return shanghaiMealProse(note).split(/(?<=[.!?。！？;；])\s*/)
    .filter(sentence => /\b(?:food|snacks?|dumplings?|buns?|noodles?|dishes?|cuisine|restaurants?|dining|cafes?|bistros?|xiaolongbao|shengjian|benbang)\b|美食|小吃|小笼|生煎|面条|菜肴|餐厅|咖啡|本帮/i.test(sentence)
      && !/ferry|return to|cross (?:the|back)|轮渡|返回|跨江/i.test(sentence)).join(' ').trim();
}

/** Planning breaks, not restaurant opening hours. Keep them at an actual route anchor. */
export function scheduleShanghaiMeals(day: VerifiedDay, zh: boolean) {
  if (!isShanghai(day.city) || !day.stops.length) return;
  const breaks = [
    { kind: 'lunch' as const, start: 720, end: 780, anchor: undefined as VerifiedStop | undefined, food: undefined as VerifiedStop | undefined },
    { kind: 'dinner' as const, start: 1080, end: 1140, anchor: undefined as VerifiedStop | undefined, food: undefined as VerifiedStop | undefined },
  ];
  let priorEnd = day.transfer?.leg.minutes !== undefined ? 480 + day.transfer.leg.minutes + 45 : 0;
  day.stops.forEach((stop, index) => {
    const prior = day.stops[index - 1];
    const incoming = day.legs.find(leg => leg.to === stop.id && (!prior || leg.from === prior.id));
    // Unknown travel is a clearly labelled planning allowance, never a verified zero-minute leg.
    const travel = incoming ? (incoming.minutes ?? 45) + 10 : 0;
    let start = Math.max(time(stop.at) ?? (index ? priorEnd + travel : 540), priorEnd + travel);
    if (incoming && incoming.minutes === undefined) day.checks.push(zh
      ? `${stop.name}：排程暂留 45 分钟交通余量及 10 分钟缓冲，实际路线时间仍未验证。`
      : `${label(stop, false)}: scheduling reserves 45 minutes for unverified travel plus a 10-minute buffer; this is a planning allowance, not a route estimate.`);
    for (const meal of breaks) {
      if (meal.anchor) continue;
      const food = stop.category === 'food' && start >= meal.start - 30 && start < meal.end;
      if (food) {
        meal.start = start;
        meal.end = start + stop.durationMinutes;
        meal.anchor = stop;
        meal.food = stop;
        continue;
      }
      // Reserve the break before the incoming journey, so its location stays on the same bank.
      if (start + stop.durationMinutes > meal.start && priorEnd < meal.end) {
        meal.anchor = prior || stop;
        start = Math.max(start, meal.end + (prior ? travel : 0));
      }
    }
    if (stop.booked && stop.at) {
      stop.scheduledAt = stop.at;
      if (time(stop.at)! < start) day.checks.push(zh
        ? `${stop.name}：预约与用餐或交通冲突，请先调整安排。`
        : `${label(stop, false)}: booking conflicts with a meal or travel. Adjust the plan before using it.`);
    } else {
      stop.scheduledAt = clock(start);
      if (stop.scheduledAt !== stop.at) day.checks.push(zh
        ? `${stop.name}：计入用餐与交通后，建议时间为 ${stop.scheduledAt}。`
        : `${label(stop, false)}: suggested start is ${stop.scheduledAt} after reserving meals and travel.`);
    }
    priorEnd = time(stop.scheduledAt)! + stop.durationMinutes;
    if (priorEnd > 1260) day.checks.push(zh ? `${stop.name}：当天安排将超过 21:00，建议减少一站。`
      : `${label(stop, false)}: this day runs past 21:00. Consider dropping a stop.`);
  });
  day.meals = breaks.map(meal => ({
    kind: meal.kind, start: clock(meal.start), end: clock(meal.end), status: 'planning',
    nearStopId: (meal.anchor || day.stops.at(-1)!).id, foodStopId: meal.food?.id,
  }));
  // Remove stale prose windows/areas; the route anchors above are the sole meal schedule.
  const sequence = shanghaiMealProse(day.note);
  const windows = day.meals.map(meal => {
    const anchor = day.stops.find(stop => stop.id === meal.nearStopId)!;
    return zh ? `${meal.kind === 'lunch' ? '午餐' : '晚餐'} ${meal.start}–${meal.end}，在${label(anchor, true)}附近。`
      : `${meal.kind === 'lunch' ? 'Lunch' : 'Dinner'} ${meal.start}–${meal.end} near ${label(anchor, false)}.`;
  }).join(' ');
  day.note = `${sequence} ${windows} ${zh ? '用餐为计划时段；请现场确认餐厅、营业及预约。' : 'Meal windows are planning suggestions; confirm restaurants, hours and reservations locally.'}`.trim();
}

function km(a: VerifiedStop, b: VerifiedStop) {
  const x = a.place!.point, y = b.place!.point;
  return Math.hypot((x.lng - y.lng) * 95, (x.lat - y.lat) * 111);
}

/** Reject concrete violations before the API emits a result; does not certify live access. */
export function shanghaiQualityIssues(plan: VerifiedTrip, messages: TripMessage[], previous: unknown): string[] {
  if (previous && typeof previous === 'object' && 'days' in previous) return [];
  const brief = messages.filter(message => message.role === 'user').map(message => message.text).join('\n');
  if (!/shanghai|上海/i.test(brief) || /beijing|hangzhou|suzhou|北京|杭州|苏州/i.test(brief)) return [];
  const modernOnly = /only[^.\n]*modern architecture|只[^。\n]*现代建筑/i.test(brief);
  const foodArchitecture = /food|美食/i.test(brief) && /architecture|建筑/i.test(brief);
  const expected = /\b3\s*days?\b|3\s*天/i.test(brief) ? 3 : /\bone\s+(?:relaxed\s+)?day\b|\b1\s*day\b|一天/i.test(brief) ? 1 : undefined;
  const issues: string[] = [];
  if (expected && plan.days.length !== expected) issues.push(`Return exactly ${expected} days for this brief.`);
  const seen = new Set<string>();
  const clusters = new Map<string, string>();
  for (const day of plan.days) {
    const prefix = `${day.id}: `;
    if (!isShanghai(day.city)) issues.push(prefix + 'Keep all days in Shanghai.');
    if (!day.stops.length || day.stops.length > 4) issues.push(prefix + 'Use 1–4 distinct main stops.');
    const mapped = day.stops.filter(stop => stop.place);
    for (const stop of day.stops) {
      const name = identity(stop);
      if (expected && !stop.place) issues.push(prefix + `${stop.search} has no confirmed map location. Choose a specific POI that can be matched, keeping opening hours unverified where missing.`);
      if (/渡口|轮渡|ferry terminal|ferry crossing|leave hotel|check.in/i.test(name)) issues.push(prefix + `${stop.search} is transport, not a main sightseeing stop. Put transport in the route, not stops.`);
      if (stop.place) {
        if (seen.has(stop.place.id)) issues.push(prefix + `${stop.search} repeats a previous place. Use distinct day clusters.`);
        seen.add(stop.place.id);
      }
      if (modernOnly && (/武康|思南|豫园|新天地|田子坊|wukang|sinan|yu garden|xintiandi|tianzifang/i.test(name)
        || /early 20th|art deco|historical baseline|historic residential/i.test(stop.why || '')
        || stop.category === 'food' || stop.category === 'shopping')) {
        issues.push(prefix + `${stop.search} does not satisfy modern-architecture-only. Choose contemporary buildings and skyline viewpoints in one compact area, not historic buildings or unrelated stops.`);
      }
      if (modernOnly && !/modern|contemporary|skyline|skyscraper|supertall|tower|lujiazui|waterfront|现代|当代|天际线|大厦|陆家嘴|滨水/i.test(`${name} ${stop.why || ''} ${stop.description || ''}`)) {
        issues.push(prefix + `${stop.search} has no modern-building or skyline rationale. Replace unrelated stops rather than adding them as Shanghai must-sees.`);
      }
      if (/no museums|不要博物馆/i.test(brief) && /museum|博物馆|美术馆|艺术馆/i.test(`${name} ${stop.place?.category}`)) issues.push(prefix + `${stop.search} violates no museums.`);
      if (/no theme parks|不要主题乐园/i.test(brief) && /disney|theme park|迪士尼|主题乐园|游乐园/i.test(`${name} ${stop.place?.category}`)) issues.push(prefix + `${stop.search} violates no theme parks.`);
    }
    if (modernOnly || foodArchitecture) {
      const diameter = Math.max(0, ...mapped.flatMap(a => mapped.map(b => km(a, b))));
      if (diameter > (modernOnly ? 4 : 5)) issues.push(prefix + `Stops span ${diameter.toFixed(1)} km. Use one compact neighbourhood instead of zigzagging across the city.`);
      if (mapped.some(stop => stop.place!.adcode === '310115') && mapped.some(stop => stop.place!.adcode !== '310115')) {
        issues.push(prefix + 'Keep this day on one side of the Huangpu; place Pudong skyline on its own day instead of mixing banks and meal areas.');
      }
    }
    if (foodArchitecture && expected === 3) {
      const names = day.stops.map(identity).join(' ');
      const groups = [
        ['Old City / historic waterfront', /豫园|外滩|南京路|yu garden|yuyuan|\bthe bund\b|nanjing road/i],
        ['historic residential streets', /武康|思南|新天地|田子坊|wukang|sinan|xintiandi|tianzifang/i],
        ['Pudong skyline', /陆家嘴|上海中心|环球金融|金茂|东方明珠|lujiazui|shanghai tower|world financial|jin\s*mao|oriental pearl/i],
      ] as const;
      for (const [group, pattern] of groups) if (pattern.test(names)) {
        if (clusters.has(group)) issues.push(prefix + `${group} already appears on ${clusters.get(group)}. Keep the three days in distinct clusters instead of revisiting the same areas.`);
        else clusters.set(group, day.id);
      }
    }
    for (const meal of day.meals || []) {
      const start = time(meal.start)!, end = time(meal.end)!;
      if (start < (meal.kind === 'lunch' ? 690 : 1050) || end > (meal.kind === 'lunch' ? 840 : 1200)) issues.push(prefix + `${meal.kind} must fit a reasonable meal window.`);
      for (const [index, stop] of day.stops.entries()) {
        const visit = time(stop.scheduledAt)!;
        if (stop.id !== meal.foodStopId && visit < end && visit + stop.durationMinutes > start) issues.push(prefix + `${stop.search} overlaps ${meal.kind}. Shorten or remove a flexible stop.`);
        const prior = day.stops[index - 1];
        const leg = day.legs.find(item => item.to === stop.id && (!prior || item.from === prior.id));
        if (leg && visit - (leg.minutes ?? 45) - 10 < end && visit > start && stop.id !== meal.foodStopId) issues.push(prefix + `${meal.kind} overlaps incoming travel to ${stop.search}.`);
      }
    }
    if (day.stops.some(stop => time(stop.scheduledAt)! + stop.durationMinutes > 1260)) issues.push(prefix + 'This day runs past 21:00. Drop or shorten a flexible stop.');
  }
  return [...new Set(issues)];
}
