import { z } from 'zod';
import type { VerifiedTrip, TripMessage } from '@/lib/travel/concierge-types';
import { storedTrip, storedMessages } from '@/lib/travel/trip-storage';

const stop = z.object({ id: z.string().min(1).max(160), name: z.string().min(1).max(240), search: z.string().max(500), durationMinutes: z.number().finite().min(0).max(1440) }).passthrough();
const day = z.object({ id: z.string().min(1).max(160), city: z.string().min(1).max(160), title: z.string().max(500), date: z.string().optional(), stops: z.array(stop).max(30), legs: z.array(z.object({ from: z.string(), to: z.string() }).passthrough()).max(40) }).passthrough();
const plan = z.object({ title: z.string().min(1).max(240), summary: z.string().max(16000), days: z.array(day).min(1).max(10), createdAt: z.string().datetime({offset:true}) }).passthrough();
const message = z.object({ role: z.enum(['user','assistant']), text: z.string().max(24000), agent: z.enum(['route-concierge','travel-assistant']).optional(), intent: z.enum(['route-concierge','travel-assistant','out-of-scope']).optional(), sources: z.array(z.object({ index: z.number().optional(), title: z.string().max(500), url: z.string().url().max(2000), site: z.string().max(240).optional() })).max(30).optional() });
export const tripWriteSchema = z.object({ id: z.string().uuid(), version: z.number().int().min(0), snapshot: z.object({ plan: plan.nullable(), messages: z.array(message).max(40) }).refine(value => value.plan || value.messages.length, 'Nothing to save.') });
export type TripSnapshot = { plan: VerifiedTrip | null; messages: TripMessage[] };
export type SavedTrip = { id: string; version: number; title: string; snapshot: TripSnapshot; updated_at: string; created_at: string };
export function safeSnapshot(value: unknown): TripSnapshot {
  const parsed = tripWriteSchema.shape.snapshot.parse(value);
  // Provider fields must also be stripped server-side, not just by the UI.
  // Canonical JSON also makes duplicate-response retries comparable to jsonb rows.
  return JSON.parse(JSON.stringify({ plan: storedTrip(parsed.plan as unknown as VerifiedTrip | null), messages: storedMessages(parsed.messages as TripMessage[]) })) as TripSnapshot;
}
export function snapshotTitle(value: TripSnapshot) { return value.plan?.title || value.messages.find(message => message.role === 'user')?.text.slice(0,120) || 'Travel conversation'; }
