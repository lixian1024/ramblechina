import { photosForAmapPlaces } from '@/lib/travel/concierge-amap';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const raw = await request.text();
  if (raw.length > 1200) return Response.json({ error: 'Too many places.' }, { status: 413 });
  let ids: unknown;
  try { ids = (JSON.parse(raw) as { ids?: unknown }).ids; }
  catch { return Response.json({ error: 'Invalid request.' }, { status: 400 }); }
  if (!Array.isArray(ids) || ids.length < 1 || ids.length > 10 || ids.some(id => typeof id !== 'string' || !/^[A-Za-z0-9]{5,40}$/.test(id))) {
    return Response.json({ error: 'Invalid place IDs.' }, { status: 400 });
  }
  try {
    const photos = await photosForAmapPlaces([...new Set(ids)]);
    return Response.json({ photos }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch { return Response.json({ photos: {} }, { headers: { 'Cache-Control': 'private, no-store' } }); }
}
