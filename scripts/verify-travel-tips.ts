import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {travelTips, travelTipView, findTravelTip} from '../src/content/travel-tips';
import TravelTipArticle from '../src/components/travel/TravelTipArticle';
import sitemap from '../src/app/sitemap';

// Catch lost translations, dangling citations, missing failure recovery or links that
// send Chinese readers to an English planner; test the actual rendered article.
assert.equal(travelTips.length, 2);
assert.equal(findTravelTip('not-a-guide'), undefined);
const urls = sitemap().map(item => item.url);
for (const guide of travelTips) {
  assert.match(guide.checkedAt, /^\d{4}-\d{2}-\d{2}$/);
  assert(guide.checkedAt <= new Date().toISOString().slice(0, 10), 'No future source checks');
  assert(guide.sources.length >= 2);
  for (const source of guide.sources) {
    const host = new URL(source.url).hostname;
    assert(host.endsWith('.dpm.org.cn') || host.endsWith('.12306.cn'), host);
  }
  for (const locale of ['en', 'zh'] as const) {
    const view = travelTipView(guide, locale);
    assert(view.steps.length >= 4);
    assert(view.problems.length >= 2);
    assert(view.limitations.length > 40);
    if (locale === 'zh') assert.match(view.title, /[\u4e00-\u9fff]/);
    for (const step of view.steps) for (const id of step.sources) assert(guide.sources.some(source => source.id === id), 'Every inline citation must resolve');
    const html = renderToStaticMarkup(createElement(TravelTipArticle, {guide, locale}));
    assert(html.includes(guide.checkedAt));
    assert(html.includes(`href="/${locale}/plan"`));
    for (const source of guide.sources) assert(html.includes(source.url.replaceAll('&', '&amp;')));
    assert(urls.includes(`https://www.ramblechina.com/${locale}/travel-tips/${guide.slug}`));
    assert(!html.includes('application/ld+json'), 'Do not add speculative FAQ ranking schema');
  }
}
assert(urls.includes('https://www.ramblechina.com/zh/travel-tips'));
assert(!urls.some(url => url.includes('/shared/')), 'Private capability views stay out of discovery');
console.log('PASS: two bilingual sourced guides, explicit limitations/recovery, rendered source dates/planner links and public sitemap entries.');
