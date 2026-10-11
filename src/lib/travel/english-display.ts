import { editions } from '@/content/editorial/en/cities';
import cityPhotoFallbacks from './plan-city-photos.json';
import type { VerifiedDay, VerifiedStop } from './concierge-types';

const hasChinese = (value: string) => /[\u3400-\u9fff]/u.test(value);
const cityPhotos = cityPhotoFallbacks as Record<string, { city: string }>;
const knownPlaces = Object.values(editions).flatMap(edition => edition.experiences);

export function readableEnglish(value: string | undefined, fallback: string): string {
  return value && !hasChinese(value) ? value : fallback;
}

export function cityLabel(day: VerifiedDay, zh: boolean): string {
  if (zh) return day.city;
  if (day.cityEnglish && !hasChinese(day.cityEnglish)) return day.cityEnglish;
  return cityPhotos[day.city]?.city || cityPhotos[day.city.replace(/市$/, '')]?.city || readableEnglish(day.city, 'City to confirm');
}

export function stopNumber(dayIndex: number, stopIndex: number): string {
  return `${dayIndex + 1}.${stopIndex + 1}`;
}

export function stopLabel(stop: VerifiedStop, day: VerifiedDay, index: number, zh: boolean): string {
  if (zh) return stop.nameChinese || stop.name;
  if (stop.nameEnglish && !hasChinese(stop.nameEnglish)) return stop.nameEnglish;
  if (stop.name && !hasChinese(stop.name)) return stop.name;
  const aliases = [stop.place?.name, stop.search, stop.name].filter((value): value is string => Boolean(value));
  const known = knownPlaces.find(place => aliases.some(value => value === place.zh || value === place.mapQuery || value.startsWith(`${place.zh}(`) || value.startsWith(`${place.zh}（`)));
  return known?.name || `Stop ${index + 1} in ${cityLabel(day, false)}`;
}

export function hotelLabel(day: VerifiedDay, zh: boolean): string {
  if (zh) return day.hotelPlace?.name || day.hotel || '';
  return readableEnglish(day.hotel, `Hotel in ${cityLabel(day, false)}`);
}

export function placeAddress(stop: VerifiedStop, day: VerifiedDay, zh: boolean): string {
  if (!stop.place) return zh ? 'Google地点待匹配' : 'Google place to confirm';
  if (zh) return [stop.place.name, stop.place.address].filter(Boolean).join(' · ');
  const address = stop.place.address;
  if (address && !hasChinese(address)) return address;
  const { lat, lng } = stop.place.point;
  return `English street address unavailable · ${cityLabel(day, false)} · map pin ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}
