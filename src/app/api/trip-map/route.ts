import { staticAmap } from '@/lib/travel/concierge-amap';
import type { MapPoint } from '@/lib/travel/concierge-types';

export const runtime = 'nodejs';

function coordinate(value: string): MapPoint | null {
  const parts = value.split(',').map(Number);
  if (parts.length !== 2 || !parts.every(Number.isFinite)) return null;
  const [lng, lat] = parts;
  if (lng < 73 || lng > 135 || lat < 18 || lat > 54) return null;
  return { lng, lat };
}

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  const raw = query.get('points') || '';
  if (raw.length > 550) return new Response('Too many map points', { status: 400 });
  const points = raw ? raw.split(';').map(coordinate) : [];
  if (points.length > 10 || points.some(point => !point)) return new Response('Invalid map points', { status: 400 });
  const center = coordinate(query.get('center') || '') || { lng: 121.4737, lat: 31.2304 };
  return staticAmap(points as MapPoint[], center);
}
