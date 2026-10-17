import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {languageDestination} from '../src/i18n/routing';
import {pageMetadata} from '../src/i18n/metadata';
import {websiteText, websiteChinese} from '../src/i18n/website';
import {safeDestination} from '../src/lib/account/navigation';
import {cities} from '../src/lib/travel/data';
import {cityView, overviewSights} from '../src/content/editorial/zh/resolve';
import {editions} from '../src/content/editorial/en/cities';
import {getChineseCityEdition} from '../src/content/editorial/zh/cities';
import * as englishEssentials from '../src/content/editorial/en/essentials';
import * as chineseEssentials from '../src/content/editorial/zh/essentials';
import {guideCities,guideLanguages,guideBudgets} from '../src/lib/travel/guide-request-options';
import {guideOptionLabel} from '../src/i18n/guide-options';
import sitemap from '../src/app/sitemap';
import {POST} from '../src/app/api/trip-concierge/route';

async function main(){
 const snapshot=JSON.parse(readFileSync('src/content/editorial/zh/source-manifest.json','utf8'));
 const source={cities:JSON.parse(readFileSync('src/lib/travel/cities.json','utf8')),guides:JSON.parse(readFileSync('src/lib/travel/guides.json','utf8')),editions,...englishEssentials};
 assert.equal(createHash('sha256').update(JSON.stringify(source)).digest('hex'),snapshot.sourceFingerprint,'Shared source changed: review Chinese editorial copy before refreshing its snapshot');
 for(const city of cities){const view=cityView(city,'zh');assert.match(view.tagline,/[\u4e00-\u9fff]/);assert.match(view.description,/[\u4e00-\u9fff]/);assert.equal(view.name,city.chinese);assert.equal(view.slug,city.slug);assert.equal(view.lat,city.lat);assert.equal(view.lng,city.lng);assert.equal(view.days,city.days);assert.equal(view.image,city.image);assert.equal(view.source,city.source);assert.strictEqual(view.guide,city.guide);assert.equal(overviewSights(city).length,3);assert.strictEqual(cityView(city,'en'),city);}
 for(const base of Object.values(editions)){const translated=getChineseCityEdition(base.slug)!;assert.equal(translated.updated,base.updated);assert.equal(translated.months.length,12);assert.equal(translated.days.length,base.days.length);assert.equal(translated.stays.length,base.stays.length);assert.equal(translated.experiences.length,base.experiences.length);assert.equal(translated.foods.length,base.foods.length);assert.equal(translated.transport.length,base.transport.length);assert.deepEqual(translated.routes.map(route=>route.stops),base.routes.map(route=>route.stops));assert.deepEqual(translated.sources.map(source=>source.url),base.sources.map(source=>source.url));for(let i=0;i<base.experiences.length;i++){const item=translated.experiences[i],original=base.experiences[i];for(const key of ['id','zh','mapQuery','photo','source'] as const)assert.equal(item[key],original[key]);for(const value of [item.why,item.how,item.booking,item.area,item.time])assert.match(value,/[\u4e00-\u9fff]/);assert(!/undefined/.test(JSON.stringify(item)));}}
 assert.equal(getChineseCityEdition('unknown-city'),undefined);
 assert.deepEqual(chineseEssentials.essentials.map(item=>item.id),englishEssentials.essentials.map(item=>item.id));for(let i=0;i<englishEssentials.essentials.length;i++){const source=englishEssentials.essentials[i],view=chineseEssentials.essentials[i];assert.equal(view.steps.length,source.steps.length);assert.deepEqual(view.sources.map(item=>item.url),source.sources.map(item=>item.url));assert.match(view.whenItFails,/[\u4e00-\u9fff]/);}
 assert.deepEqual(chineseEssentials.toolkit.map(item=>item.cn),englishEssentials.toolkit.map(item=>item.cn));
 for(const option of [...guideCities,...guideLanguages,...guideBudgets]){assert.match(guideOptionLabel('zh',option),/[\u4e00-\u9fff]/);assert.equal(guideOptionLabel('en',option),option);}
 assert.equal(languageDestination('/en/destinations/shanghai?foo=bar#food','zh'),'/zh/destinations/shanghai?foo=bar#food');
 assert.equal(languageDestination('/en/plan?trip=existing-id','zh'),'/zh/plan?trip=existing-id');
 assert.equal(languageDestination('/zh/destinations?q=%E4%B8%8A%E6%B5%B7&region=East&selected=shanghai','en'),'/en/destinations?q=%E4%B8%8A%E6%B5%B7&region=East&selected=shanghai');
 const login=new URL(languageDestination('/en/login?next=%2Fen%2Fplan%3Ftrip%3Dexisting-id','zh'),'https://www.ramblechina.com');assert.equal(login.pathname,'/zh/login');assert.equal(login.searchParams.get('next'),'/zh/plan?trip=existing-id');
 assert.equal(languageDestination('/en/guide','zh'),'/en/guide');
 assert.equal(safeDestination('/zh/plan?trip=existing-id'),'/zh/plan?trip=existing-id');for(const bad of ['/ko/plan','//evil.test','/zh/login','/zh/plan\\evil','/zh/account\nLocation:evil'])assert.equal(safeDestination(bad),'/en/account');
 const urls=sitemap();assert.equal(urls.length,100);assert.equal(urls.filter(item=>/^\/zh(?:\/|$)/.test(new URL(item.url).pathname)).length,50);assert(!urls.some(item=>/\/(ko|account|login|checkout)(?:\/|$)/.test(item.url)));
 const metadata=pageMetadata('zh','/destinations/shanghai','上海');assert.equal(metadata.alternates?.canonical,'https://www.ramblechina.com/zh/destinations/shanghai');assert.deepEqual(Object.keys(metadata.alternates?.languages||{}),['en','zh-CN']);
 for(const key of ['Account services are not configured.','This trip was edited in another tab. Reopen its saved version before continuing.','End date must be on or after the start date.','Some videos could not be refreshed.','Select New trip to start planning.'])assert.match(websiteText('zh',key),/[\u4e00-\u9fff]/);
 for(const [key,value] of Object.entries(websiteChinese)){assert(value.trim(),key);assert.equal(websiteText('en',key),key,'English source copy must not change');}
 assert.equal(websiteText('zh','User-written original content'),'User-written original content');
 const invalid=await POST(new Request('http://localhost/api/trip-concierge',{method:'POST',body:JSON.stringify({locale:'zh',messages:[]})}));assert.equal(invalid.status,400);assert.match((await invalid.json()).error,/有效/);
 console.log('PASS: bilingual language/context URLs and auth return safety, 42 Chinese overviews, three complete shared field editions, source snapshot fingerprint, 11 essentials/7 unchanged on-site cards, stable guide preference values, metadata, Chinese failure/invalid-input recovery and unchanged English copy.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
