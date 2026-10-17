import { storyCreators } from './creators';

export const STORY_LIMIT = 100;
const REFRESH_MS = 6 * 60 * 60 * 1000;
const FAILURE_RETRY_MS = 10 * 60 * 1000;
const MAX_STALE_MS = 24 * 60 * 60 * 1000;

export type TravelStory = {
  id: string; title: string; channelId: string; channelTitle: string;
  publishedAt: string; viewCount: string; durationSeconds: number; thumbnail: string;
};
export type StoryCatalog = {
  stories: TravelStory[]; total: number; hasMore: boolean;
  checkedAt: string | null; state: 'current' | 'partial' | 'stale' | 'unavailable';
};
type StorySnapshot = StoryCatalog & { candidates: TravelStory[] };
type Creator = { handle: string; name: string };
type Fetcher = typeof fetch;
type Dict = Record<string, unknown>;
const object = (value: unknown): Dict => value && typeof value === 'object' && !Array.isArray(value) ? value as Dict : {};
const items = (value: unknown): unknown[] => Array.isArray(value) ? value : [];
const text = (value: unknown): string => typeof value === 'string' ? value : '';

/** Calendar years, including a clamped Feb 29 boundary; China-time day. */
export function storyCutoff(now: Date) {
  const parts = new Intl.DateTimeFormat('en', { timeZone: 'Asia/Shanghai', year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(now);
  const part = (name: string) => Number(parts.find(item => item.type === name)?.value);
  const year = part('year') - 2, month = part('month') - 1;
  const day = Math.min(part('day'), new Date(Date.UTC(year, month + 1, 0)).getUTCDate());
  return new Date(Date.UTC(year, month, day, -8));
}

export function selectStories(stories: TravelStory[], now: Date): Pick<StoryCatalog, 'stories' | 'total' | 'hasMore'> {
  const cutoff = storyCutoff(now).getTime();
  const unique = new Map<string, TravelStory>();
  for (const story of stories) {
    const date = Date.parse(story.publishedAt);
    if (!/^[\w-]{11}$/.test(story.id) || !Number.isFinite(date) || date < cutoff || date > now.getTime() || !/^\d+$/.test(story.viewCount)) continue;
    if (!unique.has(story.id)) unique.set(story.id, story);
  }
  const sorted = [...unique.values()].sort((a, b) => {
    const left = BigInt(a.viewCount), right = BigInt(b.viewCount);
    return left === right ? Date.parse(b.publishedAt) - Date.parse(a.publishedAt) || a.id.localeCompare(b.id) : left > right ? -1 : 1;
  });
  return { stories: sorted.slice(0, STORY_LIMIT), total: sorted.length, hasMore: sorted.length > STORY_LIMIT };
}

function durationSeconds(value: unknown) {
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(text(value));
  return match ? Number(match[1] || 0) * 3600 + Number(match[2] || 0) * 60 + Number(match[3] || 0) : 0;
}

export function isChinaTravelTitle(title: string) {
  // Creator descriptions often mention past China trips under unrelated uploads.
  // Require the video title itself to identify China or a Chinese destination.
  const destination = /\b(?:china|chinese|beijing|shanghai|chongqing|chengdu|guangzhou|shenzhen|guilin|yangshuo|hangzhou|suzhou|nanjing|xi.?an|yunnan|sichuan|guizhou|guangxi|jiangxi|henan|hunan|hubei|fujian|harbin|wuhan|zhangjiajie|jiuzhaigou|huangshan|lijiang|dali|shaxi|furong|wangxian|kunming|qingdao|tianjin|xiamen|changsha|hong kong|macau|xinjiang|urumqi|kashgar|turpan|leshan|dunhuang|datong|wuxi|changchun|shenyang|sanya|hainan)\b/i;
  const abroad = /\b(?:india|pakistan|bangladesh|saudi|japan|vietnam|thailand|indonesia|malaysia|singapore|london|rome|paris|australia|africa|america|usa|uk|canada|mexico|turkey|russia)\b/i;
  const commentary = /\b(?:politics|political|propaganda|reaction|reacting|election|ccp)\b/i;
  return destination.test(title) && !abroad.test(title) && !commentary.test(title);
}

export function normalizeStory(value: unknown, allowedChannels: Set<string>): TravelStory | null {
  const video = object(value), snippet = object(video.snippet), status = object(video.status), details = object(video.contentDetails);
  const id = text(video.id), channelId = text(snippet.channelId), duration = durationSeconds(details.duration);
  const title = text(snippet.title), views = text(object(video.statistics).viewCount);
  // No unembeddable/deleted/private/age-restricted videos or current live streams.
  // A long vlog may still contain old prices or sponsorships: never treat it as a verified itinerary.
  if (!allowedChannels.has(channelId) || !/^[\w-]{11}$/.test(id) || !isChinaTravelTitle(title) || !text(snippet.channelTitle) || !/^\d+$/.test(views)
    || status.embeddable !== true || status.privacyStatus !== 'public' || status.uploadStatus !== 'processed'
    || text(snippet.liveBroadcastContent) !== 'none' || object(details.contentRating).ytRating === 'ytAgeRestricted'
    || duration <= 0) return null;
  const thumbnails = object(snippet.thumbnails);
  const thumbnail = text(object(thumbnails.medium).url) || text(object(thumbnails.high).url);
  let url: URL;
  try { url = new URL(thumbnail); } catch { return null; }
  if (url.protocol !== 'https:' || url.hostname !== 'i.ytimg.com' || !url.pathname.startsWith(`/vi/${id}/`)) return null;
  return { id, title, channelId, channelTitle: text(snippet.channelTitle), publishedAt: text(snippet.publishedAt), viewCount: views, durationSeconds: duration, thumbnail };
}

class CatalogError extends Error {
  constructor() { super('YouTube video data is temporarily unavailable.'); }
}

export async function fetchStoryCatalog({ key, now = new Date(), fetcher = fetch, creators = storyCreators }: {
  key: string; now?: Date; fetcher?: Fetcher; creators?: readonly Creator[];
}): Promise<StorySnapshot> {
  if (!key.trim()) throw new CatalogError();
  async function youtube(path: string, params: Record<string, string>) {
    const query = new URLSearchParams(params);
    let response: Response;
    try {
      response = await fetcher(`https://www.googleapis.com/youtube/v3/${path}?${query}`, {
        headers: { 'X-Goog-Api-Key': key }, cache: 'no-store', signal: AbortSignal.timeout(12000),
      });
      if (!response.ok) throw new CatalogError();
      const data: unknown = await response.json();
      if (!Array.isArray(object(data).items)) throw new CatalogError();
      return object(data);
    } catch { throw new CatalogError(); }
  }
  let partial = false;
  const channels = await Promise.allSettled(creators.map(async creator => {
    const response = await youtube('channels', { part: 'id,snippet', forHandle: creator.handle, fields: 'items(id,snippet(title))' });
    const id = text(object(items(response.items)[0]).id);
    if (!/^UC[\w-]{22}$/.test(id)) throw new CatalogError();
    return id;
  }));
  const allowedChannels = new Set(channels.flatMap(result => {
    if (result.status === 'fulfilled') return [result.value];
    partial = true; return [];
  }));
  if (!allowedChannels.size) throw new CatalogError();
  const searches = await Promise.all([...allowedChannels].map(async channelId => {
    const ids: string[] = []; let pageToken = '';
    // Two pages per creator: enough to admit that creator's top 100 candidates.
    // Ten creators / a six-hour refresh bounds search quota; no per-visitor search.
    for (let page = 0; page < 2; page++) {
      try {
        const result = await youtube('search', {
          part: 'snippet', channelId, q: 'China', type: 'video', order: 'viewCount', maxResults: '50',
          publishedAfter: storyCutoff(now).toISOString(), publishedBefore: now.toISOString(),
          videoEmbeddable: 'true', videoSyndicated: 'true', safeSearch: 'moderate',
          fields: 'nextPageToken,items(id(videoId))', ...(pageToken ? { pageToken } : {}),
        });
        for (const item of items(result.items)) {
          const id = text(object(object(item).id).videoId);
          if (/^[\w-]{11}$/.test(id)) ids.push(id);
        }
        pageToken = text(result.nextPageToken);
        if (!pageToken) break;
      } catch { partial = true; break; }
    }
    return ids;
  }));
  const ids = [...new Set(searches.flat())];
  if (!ids.length && partial) throw new CatalogError();
  const requests: Promise<Dict>[] = [];
  for (let index = 0; index < ids.length; index += 50) {
    requests.push(youtube('videos', {
      part: 'snippet,statistics,status,contentDetails', id: ids.slice(index, index + 50).join(','),
      fields: 'items(id,snippet(title,channelId,channelTitle,publishedAt,liveBroadcastContent,thumbnails),statistics(viewCount),status(embeddable,privacyStatus,uploadStatus),contentDetails(duration,contentRating))',
    }));
  }
  const results = await Promise.allSettled(requests);
  if (requests.length && results.every(result => result.status === 'rejected')) throw new CatalogError();
  const videos = results.flatMap(result => {
    if (result.status === 'rejected') { partial = true; return []; }
    return items(result.value.items).flatMap(item => {
      const story = normalizeStory(item, allowedChannels);
      return story && ids.includes(story.id) ? [story] : [];
    });
  });
  return { ...selectStories(videos, now), candidates: videos, checkedAt: now.toISOString(), state: partial ? 'partial' : 'current' };
}

export function createStoryLoader(fetcher: Fetcher = fetch) {
  let cached: StorySnapshot | null = null, cacheKey = '', refreshAfter = 0;
  let flight: Promise<StorySnapshot> | null = null;
  return async (key: string, now = new Date()): Promise<StoryCatalog> => {
    if (cacheKey !== key) { cached = null; refreshAfter = 0; flight = null; cacheKey = key; }
    const reselect = (catalog: StorySnapshot): StoryCatalog => ({ ...selectStories(catalog.candidates, now), checkedAt: catalog.checkedAt, state: catalog.state });
    if (cached && now.getTime() < refreshAfter) return reselect(cached);
    if (flight) return reselect(await flight);
    const requestedKey = key;
    flight = fetchStoryCatalog({ key, now, fetcher }).then(catalog => {
      if (cacheKey === requestedKey) { cached = catalog; refreshAfter = now.getTime() + (catalog.state === 'partial' ? FAILURE_RETRY_MS : REFRESH_MS); }
      return catalog;
    }).catch(() => {
      const fallback = cached?.checkedAt && now.getTime() - Date.parse(cached.checkedAt) <= MAX_STALE_MS
        ? { ...cached, state: 'stale' as const }
        : { stories: [], candidates: [], total: 0, hasMore: false, checkedAt: null, state: 'unavailable' as const };
      if (cacheKey === requestedKey) { cached = fallback; refreshAfter = now.getTime() + FAILURE_RETRY_MS; }
      return fallback;
    }).finally(() => { if (cacheKey === requestedKey) flight = null; });
    return reselect(await flight);
  };
}

const load = createStoryLoader();
export const getStoryCatalog = () => load(process.env.YOUTUBE_DATA_API_KEY?.trim() || '');
