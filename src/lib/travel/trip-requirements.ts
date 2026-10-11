import type { DraftDay, DraftTrip, TripMessage } from './concierge-types';

export type TripRequirements = { days?: number; startDate?: string };
export class TripRequirementsError extends Error {}

const numbers: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
export const calendarDate = (value: unknown): value is string => typeof value === 'string'
  && /^\d{4}-\d{2}-\d{2}$/.test(value)
  && !Number.isNaN(Date.parse(`${value}T12:00:00Z`))
  && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value;
export function tripDate(start: string, index: number) {
  const date = new Date(`${start}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + index);
  return date.toISOString().slice(0, 10);
}

/** Read only traveller constraints, never numbers invented in an assistant reply/title. */
export function tripRequirements(messages: TripMessage[], previous: unknown, now = new Date()): TripRequirements {
  const old = previous && typeof previous === 'object' ? previous as Partial<DraftTrip> : undefined;
  const requirements: TripRequirements = {
    days: Array.isArray(old?.days) && old.days.length ? old.days.length : undefined,
    startDate: calendarDate(old?.startDate) ? old.startDate : undefined,
  };
  for (const message of messages) {
    if (message.role !== 'user' || message.intent === 'out-of-scope' || message.intent === 'travel-assistant') continue;
    const count = message.text.match(/\b(\d{1,3}|one|two|three|four|five|six|seven|eight|nine|ten)(?:[\s-]+(?:easy|relaxed|slow|full|leisurely))*[\s-]*days?\b/i)
      || message.text.match(/(\d{1,3}|[一二两三四五六七八九十]{1,3})\s*天/);
    if (count) {
      const numeral = count[1].toLowerCase();
      const tens = numeral.match(/^([一二两三四五六七八九])?十([一二三四五六七八九])?$/);
      const days = numbers[numeral] ?? (tens ? (tens[1] ? numbers[tens[1]] : 1) * 10 + (tens[2] ? numbers[tens[2]] : 0) : Number(numeral));
      if (!Number.isInteger(days) || days < 1 || days > 10) throw new TripRequirementsError('Trips currently support 1–10 days. Your existing trip is unchanged.');
      requirements.days = days;
    }
    const start = message.text.match(/\b(?:start(?:ing)?(?:\s+(?:date|from|on))?|depart(?:ing|ure)?(?:\s+(?:from|on|date))?|begin(?:ning)?(?:\s+(?:from|on))?|from)\s*[:：]?\s*(\d{4}-\d{2}-\d{2}|\d{1,2}(?:st|nd|rd|th)?\s+[a-z]+(?:\s+\d{4})?|[a-z]+\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{4})?)/i)
      || message.text.match(/(?:从|出发日期[：:]?|开始日期[：:]?)\s*(\d{4}-\d{2}-\d{2}|\d{1,2}月\d{1,2}[日号])/);
    if (!start) continue;
    const value = start[1].toLowerCase();
    if (/^\d{4}-/.test(value)) {
      if (!calendarDate(value)) throw new TripRequirementsError('The trip start date is invalid. Your existing trip is unchanged.');
      requirements.startDate = value;
      continue;
    }
    const dayFirst = value.match(/^(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]+)(?:\s+(\d{4}))?$/);
    const monthFirst = value.match(/^([a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?$/);
    const chinese = value.match(/^(\d{1,2})月(\d{1,2})[日号]$/);
    const month = chinese ? Number(chinese[1]) : months.indexOf((dayFirst?.[2] || monthFirst?.[1] || '').slice(0, 3)) + 1;
    if (!month) continue; // A non-date phrase such as "from Chengdu" is not a date constraint.
    const day = Number(dayFirst?.[1] || monthFirst?.[2] || chinese?.[2]);
    const explicitYear = dayFirst?.[3] || monthFirst?.[3];
    const today = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Shanghai' });
    let year = explicitYear ? Number(explicitYear) : Number(today.slice(0, 4));
    const iso = () => `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (!explicitYear && iso() < today) year++;
    if (!calendarDate(iso())) throw new TripRequirementsError('The trip start date is invalid. Your existing trip is unchanged.');
    requirements.startDate = iso();
  }
  return requirements;
}

export function intentionalOpenDay(day: DraftDay) {
  return Boolean(day.note?.trim() && (day.kind === 'transfer' || day.kind === 'rest'
    || (day.intercityMode && day.intercityNote?.trim())));
}

/** Hard gate before publishing: a title or a promise cannot substitute for actual dates. */
export function tripRequirementIssues(plan: DraftTrip, requirements: TripRequirements): string[] {
  const issues: string[] = [];
  if (requirements.days && plan.days.length !== requirements.days) issues.push(`Return exactly ${requirements.days} calendar days, including transfer/rest days; received ${plan.days.length}. Do not shorten the trip or invent filler places.`);
  if (plan.days.length > 10) issues.push('Return at most 10 calendar days.');
  const start = requirements.startDate || plan.startDate;
  if (start) {
    if (plan.startDate !== start) issues.push(`The trip must start on ${start}.`);
    const wrongDates = plan.days.flatMap((day, index) => day.date === tripDate(start, index) ? [] : [`Day ${index + 1} must be dated ${tripDate(start, index)}.`]);
    issues.push(...wrongDates);
  }
  plan.days.forEach((day, index) => {
    if (!day.stops.length && !intentionalOpenDay(day)) issues.push(`Day ${index + 1} is empty. Provide real visits or an explicitly labelled transfer/rest day with an explanatory note; do not silently remove the date.`);
  });
  return issues;
}
