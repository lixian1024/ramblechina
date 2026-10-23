import {z} from 'zod';
import type {AnalyticsBrowser} from '@/lib/analytics';

export const growthEvents = ['planner_start', 'itinerary_generated', 'itinerary_first_edit', 'sign_up',
  'itinerary_saved', 'planner_error', 'share_created', 'share_revoked', 'research_requested'] as const;
export type GrowthEvent = typeof growthEvents[number];
const parametersSchema = z.object({
  locale: z.enum(['en','zh']).optional(),
  actor: z.enum(['guest','account']).optional(),
  operation: z.enum(['generate','edit','save','signup','share','research']).optional(),
  failure: z.enum(['aborted','quota','configuration','network','validation','provider','storage','unknown']).optional(),
  days: z.number().int().min(1).max(10).optional(),
}).strict();
export type GrowthParameters = z.infer<typeof parametersSchema>;
export type GrowthBrowser = Pick<AnalyticsBrowser,'location'|'gtag'|'__rambleAnalytics'>;
const recorded = new WeakMap<GrowthBrowser, Set<string>>();

/** Invoke only at the actual outcome. Dedupe keys stay in memory and never enter GA4. */
export function recordGrowthEvent(name: GrowthEvent, parameters: GrowthParameters = {}, options: {
  dedupeKey?: string; browser?: GrowthBrowser;
} = {}): void {
  try {
    if (!(growthEvents as readonly string[]).includes(name)) return;
    const parsed = parametersSchema.safeParse(parameters);
    if (!parsed.success) return;
    const browser = options.browser ?? (typeof window !== 'undefined' ? window as unknown as GrowthBrowser : undefined);
    if (!browser?.gtag || browser.location.protocol !== 'https:' ||
      !['www.ramblechina.com','ramblechina.com'].includes(browser.location.hostname) || !browser.__rambleAnalytics) return;
    const key = options.dedupeKey ? `${name}:${options.dedupeKey}` : undefined;
    const sent = recorded.get(browser) ?? new Set<string>();
    if (key && sent.has(key)) return;
    browser.gtag('event', name, {...parsed.data, send_to: browser.__rambleAnalytics.measurementId});
    if (key) {sent.add(key); recorded.set(browser, sent);}
  } catch {
    // Tracking is optional; a blocked script must never interrupt travel planning.
  }
}
