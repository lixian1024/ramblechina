import assert from 'node:assert/strict';
import { createStoryLoader, fetchStoryCatalog, isChinaTravelTitle, normalizeStory, selectStories, storyCutoff, type TravelStory } from '../src/lib/travel-stories/catalog';
import { storyLayout } from '../src/lib/travel-stories/masonry';

const now = new Date('2026-10-13T08:00:00Z');
const channelId = 'UC' + 'a'.repeat(22);
const idFor = (index: number) => 'vid' + String(index).padStart(8, '0');
const story = (index: number, overrides: Partial<TravelStory> = {}): TravelStory => ({
  id: idFor(index), title: 'Exploring China', channelId, channelTitle: 'Controlled travel creator',
  publishedAt: '2026-01-01T00:00:00Z', viewCount: String(index), durationSeconds: 600,
  thumbnail: `https://i.ytimg.com/vi/${idFor(index)}/mqdefault.jpg`, ...overrides,
});
const resource = (index: number) => ({ id: idFor(index),
  snippet: { title: 'Exploring Shanghai, China', channelId, channelTitle: 'Controlled travel creator', publishedAt: '2026-01-01T00:00:00Z', liveBroadcastContent: 'none', thumbnails: { medium: { url: `https://i.ytimg.com/vi/${idFor(index)}/mqdefault.jpg` } } },
  statistics: { viewCount: String(index) }, status: { embeddable: true, privacyStatus: 'public', uploadStatus: 'processed' }, contentDetails: { duration: 'PT10M', contentRating: {} },
});

async function main() {
  assert.equal(storyCutoff(now).toISOString(), '2024-10-12T16:00:00.000Z');
  assert.equal(storyCutoff(new Date('2024-02-29T12:00:00Z')).toISOString(), '2022-02-27T16:00:00.000Z');
  const candidates = Array.from({ length: 105 }, (_, index) => story(index));
  const boundary = story(106, { publishedAt: '2024-10-12T16:00:00Z', viewCount: '90071992547409930' });
  const precise = story(107, { viewCount: '90071992547409929' });
  const invalid = [story(108, { publishedAt: '2024-10-12T15:59:59Z', viewCount: '99999999999999999999' }), story(109, { publishedAt: '2026-10-14T00:00:00Z' }), story(110, { publishedAt: 'invalid' }), story(111, { viewCount: 'unknown' })];
  const selected = selectStories([...candidates.reverse(), boundary, precise, boundary, ...invalid], now);
  assert.equal(selected.total, 107); assert.equal(selected.stories.length, 100); assert.equal(selected.hasMore, true);
  assert.equal(selected.stories[0].id, boundary.id); assert.equal(selected.stories[1].id, precise.id, 'Large view counts must sort without floating-point rounding');
  assert.equal(selectStories([boundary], new Date('2026-10-14T00:00:00Z')).stories.length, 0);
  assert.equal(selectStories(candidates.slice(0, 100), now).hasMore, false);
  for (const title of ['Wuhan Breakfast', 'A journey through Jiuzhaigou', 'China is Living in 2050', 'Our first day in Yangshuo']) assert(isChinaTravelTitle(title));
  for (const title of ['Chinese food in Rome', '$1 Ear Cleaning in India', 'we are pregnant', 'Reacting to China videos', '5 Hours with Mountain Gorillas']) assert(!isChinaTravelTitle(title), title);
  assert(normalizeStory(resource(1), new Set([channelId])));
  assert(normalizeStory({ ...resource(1), contentDetails: { duration: 'PT30S' } }, new Set([channelId])), 'Short videos use the same official view-count order');
  assert(normalizeStory({ ...resource(1), contentDetails: { duration: 'PT4H' } }, new Set([channelId])), 'Do not invent an upper duration limit');
  for (const corrupt of [
    { ...resource(1), status: { ...resource(1).status, embeddable: false } },
    { ...resource(1), status: { ...resource(1).status, privacyStatus: 'private' } },
    { ...resource(1), statistics: {} },
    { ...resource(1), contentDetails: { duration: 'invalid' } },
    { ...resource(1), contentDetails: { duration: 'PT10M', contentRating: { ytAgeRestricted: true, ytRating: 'ytAgeRestricted' } } },
    { ...resource(1), snippet: { ...resource(1).snippet, channelId: 'different-owner' } },
    { ...resource(1), snippet: { ...resource(1).snippet, liveBroadcastContent: 'live' } },
    { ...resource(1), snippet: { ...resource(1).snippet, thumbnails: { medium: { url: 'https://example.com/unrelated.jpg' } } } },
  ]) assert.equal(normalizeStory(corrupt, new Set([channelId])), null);

  let requests = 0, fail = false;
  const fakeFetch: typeof fetch = async (input, options) => {
    requests++;
    const url = new URL(String(input));
    assert(!url.searchParams.has('key'), 'Key must stay out of URLs');
    assert.equal(new Headers(options?.headers).get('X-Goog-Api-Key'), 'controlled-key');
    if (fail) return Response.json({ error: { message: 'Provider detail that must not reach users' } }, { status: 403 });
    if (url.pathname.endsWith('/channels')) return Response.json({ items: [{ id: channelId }] });
    if (url.pathname.endsWith('/search')) {
      assert.equal(url.searchParams.get('order'), 'viewCount');
      assert.equal(url.searchParams.get('videoEmbeddable'), 'true');
      assert.equal(url.searchParams.get('publishedAfter'), storyCutoff(new Date(url.searchParams.get('publishedBefore')!)).toISOString());
      const second = url.searchParams.get('pageToken') === 'second';
      return Response.json({ ...(second ? {} : { nextPageToken: 'second' }), items: Array.from({ length: 50 }, (_, index) => ({ id: { videoId: idFor(index + (second ? 50 : 0)) } })) });
    }
    assert.equal(url.pathname, '/youtube/v3/videos');
    const ids = url.searchParams.get('id')!.split(','); assert(ids.length <= 50);
    return Response.json({ items: ids.map(id => resource(Number(id.slice(3)))) });
  };
  const live = await fetchStoryCatalog({ key: 'controlled-key', now, fetcher: fakeFetch, creators: [{ handle: '@controlled', name: 'Controlled' }] });
  assert.equal(live.state, 'current'); assert.equal(live.stories.length, 100); assert.equal(live.stories[0].viewCount, '99'); assert.equal(requests, 5);
  const loader = createStoryLoader(fakeFetch);
  requests = 0;
  const concurrent = await Promise.all([loader('controlled-key', now), loader('controlled-key', now)]);
  assert.equal(concurrent[0].state, 'current'); const used = requests;
  await loader('controlled-key', new Date(now.getTime() + 1000)); assert.equal(requests, used, 'Concurrent requests and repeat visits reuse a single catalog refresh');
  fail = true;
  const stale = await loader('controlled-key', new Date(now.getTime() + 7 * 3600000));
  assert.equal(stale.state, 'stale'); assert.equal(stale.checkedAt, now.toISOString()); assert(stale.stories.length);
  const unavailable = await loader('controlled-key', new Date(now.getTime() + 25 * 3600000));
  assert.equal(unavailable.state, 'unavailable'); assert.deepEqual(unavailable.stories, []); assert.equal(unavailable.checkedAt, null);
  assert(!JSON.stringify(unavailable).includes('controlled-key')); assert(!JSON.stringify(unavailable).includes('Provider detail'));
  const missing = await createStoryLoader(fakeFetch)('', now); assert.equal(missing.state, 'unavailable'); assert.equal(missing.stories.length, 0);
  const heights = Array.from({ length: 100 }, (_, index) => 280 + (index % 5) * 25);
  for (const width of [288, 358, 740, 1320]) {
    const layout = storyLayout(width, heights);
    layout.positions.forEach((position, index) => {
      assert(position.left >= 0 && position.left + position.width <= width + 0.01, 'Cards stay inside the viewport');
      assert(!index || position.top >= layout.positions[index - 1].top, 'Popularity rank follows visual top-to-bottom order');
      for (let prior = 0; prior < index; prior++) {
        const other = layout.positions[prior];
        const separated = position.left >= other.left + other.width || other.left >= position.left + position.width || position.top >= other.top + heights[prior] || other.top >= position.top + heights[index];
        assert(separated, 'Variable-height masonry cards must not overlap');
      }
      assert(position.top + heights[index] <= layout.height + 0.01);
    });
  }
  console.log('PASS: calendar two-year boundaries, future/invalid dates, deduplication, exact descending view counts, 100 cap, unrelated destinations, channel ownership, short/long durations, embed/private/age/live rejection, paginated official metadata, private key headers, coalesced cache, stale timestamp, outage expiry and missing-key recovery. Controlled evidence only.');
  console.log('PASS: 100 variable-height masonry cards at desktop/tablet/390px/320px content widths preserve rank, fit their containers, and never overlap. Geometry evidence only; not a browser rendering check.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
