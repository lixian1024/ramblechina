import { photosForGooglePlaces, validPlaceId } from '@/lib/travel/google-maps';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const raw = await request.text();
  if (raw.length > 3200) return Response.json({ error: 'Too many places.' }, { status: 413 });
  let ids: unknown;
  const expected:Record<string,{query:string;city:string}>={};
  try {
    const data=JSON.parse(raw) as {ids?:unknown;places?:unknown};
    if(data.places!==undefined){
      if(!Array.isArray(data.places)||data.places.length!==1)throw new Error();
      const place=data.places[0];
      if(!place||typeof place!=='object'||!validPlaceId(place.id)||typeof place.query!=='string'||!place.query.trim()||place.query.length>120||typeof place.city!=='string'||!place.city.trim()||place.city.length>40)throw new Error();
      expected[place.id]={query:place.query.trim(),city:place.city.trim()};
      ids=[place.id];
    }else ids=data.ids;
  }
  catch { return Response.json({ error: 'Invalid request.' }, { status: 400 }); }
  if (!Array.isArray(ids) || ids.length < 1 || ids.length > 10 || ids.some(id => !validPlaceId(id))) {
    return Response.json({ error: 'Invalid place IDs.' }, { status: 400 });
  }
  try {
    const photos = await photosForGooglePlaces([...new Set(ids)],expected);
    return Response.json({ photos }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch { return Response.json({ photos: {} }, { headers: { 'Cache-Control': 'private, no-store' } }); }
}
