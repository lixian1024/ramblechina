/** Execution data v1. Display names are never identifiers. */
export type Localized = { en: string; zh: string };
export type FactState = 'verified' | 'pending' | 'conflicting' | 'expired';
export type Evidence = { id: string; title: string; url: string; kind: 'official' | 'provider' | 'editorial'; checkedAt: string; note?: string };
export type Fact<T> = { value: T | null; state: FactState; sourceIds: string[]; checkedAt: string | null; reviewAfter?: string; note?: string };
export type Coordinates = { longitude: number; latitude: number; system: 'GCJ-02' | 'WGS84' };
export type Place = { id: string; cityId: string; name: Localized; address: Fact<string>; entranceIds: string[]; image: string; photoId: string; durationMinutes: [number, number]; durationKind: 'editorial-estimate'; reservation: Fact<string>; access: Fact<string>; photography: string };
export type Entrance = { id: string; placeId: string; name: Localized; role: 'entry' | 'exit'; mapQuery: string; coordinates: Fact<Coordinates>; vehicleDropoff: Fact<string>; approach: Fact<string> };
export type TravelCard = { id: string; entranceId: string; title: Localized; chinesePhrase: string; phraseKind: 'ask-directions'; caution: string };
export type RouteStop = { id: string; entranceId?: string; placeId?: string; window: string; title: string; duration: string; action: string; kind: 'visit' | 'transfer' | 'break' };
export type DayPlan = { id: string; version: string; cityId: string; name: string; stops: RouteStop[]; cardIds: string[]; assumptions: string[] };
export type BudgetLine = { id: string; label: string; range: [number, number]; unit: 'person'; basis: 'editorial-allowance'; note: string };
export type JourneyOptions = { date: string; people: number; confirmed: string[]; cardIds: string[] };
export type PreflightIssue = { id: string; level: 'action' | 'notice'; text: string };
export function isDate(value: unknown): value is string { if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const t=Date.parse(value+'T00:00:00Z');return Number.isFinite(t)&&new Date(t).toISOString().slice(0,10)===value; }
export function isCoordinates(value: unknown): value is Coordinates { if(!value||typeof value!=='object')return false;const v=value as Coordinates;return Number.isFinite(v.longitude)&&Number.isFinite(v.latitude)&&Math.abs(v.longitude)<=180&&Math.abs(v.latitude)<=90&&['GCJ-02','WGS84'].includes(v.system); }
export function factUsable<T>(fact: Fact<T>, today: string){ return fact.state==='verified'&&fact.value!==null&&(!fact.reviewAfter||today<=fact.reviewAfter); }
