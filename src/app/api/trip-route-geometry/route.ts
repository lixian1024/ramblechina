import {guardedLookup} from '@/lib/growth/trial';
import { routeBetween } from '@/lib/travel/concierge-amap';
import type { VerifiedStop } from '@/lib/travel/concierge-types';

export const runtime = 'nodejs';

type Place = NonNullable<VerifiedStop['place']>;
type Job = { from: Place; to: Place };

function place(value: unknown): Place | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const source = value as Record<string, unknown>;
  const point = source.point as Record<string, unknown> | undefined;
  const lng = Number(point?.lng), lat = Number(point?.lat);
  const citycode = typeof source.citycode === 'string' ? source.citycode : '';
  const adcode = typeof source.adcode === 'string' ? source.adcode : '';
  if (!Number.isFinite(lng) || lng < 73 || lng > 135 || !Number.isFinite(lat) || lat < 18 || lat > 54) return null;
  if (!/^[0-9]{0,6}$/.test(citycode) || !/^[0-9]{0,6}$/.test(adcode)) return null;
  return { id: '', name: '', address: '', point: { lng, lat, system: point?.system === 'GCJ-02' ? 'GCJ-02' : 'WGS84' }, provider: source.provider === 'Amap' ? 'Amap' : 'Google', citycode, adcode, checkedAt: '' };
}

async function lookup(request: Request) {
  const size = Number(request.headers.get('content-length') || 0);
  if (size > 32_000) return Response.json({ error: 'Route request is too large.' }, { status: 413 });
  let jobs: Job[];
  let easier = false;
  try {
    const text = await request.text();
    if (text.length > 32_000) return Response.json({ error: 'Route request is too large.' }, { status: 413 });
    const data = JSON.parse(text) as Record<string, unknown>;
    if (!Array.isArray(data.legs) || data.legs.length > 50) throw new Error('Invalid route request.');
    easier = data.easier === true;
    jobs = data.legs.map(raw => {
      const item = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
      const from = place(item.from), to = place(item.to);
      if (!from || !to) throw new Error('Invalid route place.');
      return { from, to };
    });
  } catch { return Response.json({ error: 'Invalid route request.' }, { status: 400 }); }

  const results: { index: number; geometry: NonNullable<Awaited<ReturnType<typeof routeBetween>>>['geometry'] }[] = [];
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(3, jobs.length) }, async () => {
    while (next < jobs.length) {
      const index = next++;
      const route = await routeBetween(jobs[index].from, jobs[index].to, easier).catch(() => undefined);
      if (route?.geometry?.length) results.push({ index, geometry: route.geometry });
    }
  }));
  return Response.json({ routes: results }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request:Request){return guardedLookup(request,()=>lookup(request));}
