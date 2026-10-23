import assert from 'node:assert/strict';
import {pageMetadata} from '../src/i18n/metadata';

// Catch missing previews, mismatched canonical/OG URLs and duplicated brand templates.
for (const locale of ['en', 'zh'] as const) {
  const title = locale === 'en' ? 'China Trip Planner for First-Time Visitors' : '初次来华旅行规划';
  const metadata = pageMetadata(locale, '/', title, 'A useful planning description.');
  assert.deepEqual(metadata.title, {absolute: `${title} | Ramble China`});
  assert.equal(metadata.openGraph?.title, `${title} | Ramble China`);
  assert.equal(metadata.openGraph?.url, `https://www.ramblechina.com/${locale}`);
  assert.equal(metadata.openGraph?.description, 'A useful planning description.');
  assert.equal(metadata.openGraph?.locale, locale === 'zh' ? 'zh_CN' : 'en_US');
  assert(metadata.twitter && 'card' in metadata.twitter);
  assert.equal(metadata.twitter.card, 'summary_large_image');
  const images = metadata.openGraph?.images as {url: string; width: number; height: number}[];
  assert.equal(images[0].url, `https://www.ramblechina.com/og/${locale}/home.png`);
  assert.equal(images[0].width, 1200);
  assert.equal(images[0].height, 630);
}
const city = pageMetadata('zh', '/destinations/shanghai', '上海旅行指南', '上海行前参考');
assert.equal(city.alternates?.canonical, 'https://www.ramblechina.com/zh/destinations/shanghai');
assert.deepEqual(city.alternates?.languages, {en: 'https://www.ramblechina.com/en/destinations/shanghai', 'zh-CN': 'https://www.ramblechina.com/zh/destinations/shanghai'});
assert.equal((city.openGraph?.images as {url: string}[])[0].url, 'https://www.ramblechina.com/og/zh/city-shanghai.png');
assert.deepEqual(pageMetadata('en', '/', 'A title | Ramble China').title, {absolute: 'A title | Ramble China'});
async function verifyPreviews() {
  const {GET} = await import('../src/app/og/[locale]/[key]/route');
  for (const [locale, key] of [['en', 'home.png'], ['zh', 'home.png'], ['zh', 'city-shanghai.png'], ['en', 'guide-forbidden-city-tickets.png']]) {
    const response = await GET(new Request('https://www.ramblechina.com/og/test'), {params: Promise.resolve({locale, key})});
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type') || '', /image\/png/);
    assert.deepEqual(Array.from(new Uint8Array(await response.arrayBuffer()).slice(0, 8)), [137, 80, 78, 71, 13, 10, 26, 10]);
  }
  for (const [locale, key] of [['ko', 'home.png'], ['en', 'city-made-up.png'], ['en', 'guide-private-text.png'], ['en', 'anything.png'], ['en', 'home']]) {
    const response = await GET(new Request('https://www.ramblechina.com/og/test'), {params: Promise.resolve({locale, key})});
    assert.equal(response.status, 404, 'Only public known page keys can generate previews');
  }
  console.log('PASS: branded bilingual canonical/OG/Twitter metadata, single brand suffix, actual PNG previews and unknown-key rejection.');
}
verifyPreviews().catch(error => {console.error(error); process.exitCode = 1;});
