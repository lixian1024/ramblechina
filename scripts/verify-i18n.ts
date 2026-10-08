import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {beijingFactFingerprint} from '../src/content/fingerprint';
import {plannedLocales,publishedLocales,isLocale,localizePath,bestLocale} from '../src/i18n/locales';
import {publishedFor} from '../src/i18n/publication';
import {resolveBeijing} from '../src/content/resolve-beijing';
import {dbText} from '../src/i18n/daybook-ui';
import {getMessages} from '../src/i18n/messages';
import {cards,places,day} from '../src/lib/content/beijing-day';
const fingerprint=beijingFactFingerprint();if(process.argv.includes('--print-fingerprint')){console.log(fingerprint);process.exit(0)}
const manifest=JSON.parse(readFileSync('src/content/publication-manifest.json','utf8')) as Record<string,{state:string;factFingerprint:string;preparedAt:string}>;
assert.equal(plannedLocales.length,11);assert.deepEqual([...publishedLocales],['en','ko','zh']);
assert.equal(bestLocale('ko-KR,ko;q=0.9,en;q=0.8'),'ko');assert.equal(bestLocale('zh-CN,zh;q=0.9,en;q=0.8'),'zh');assert.equal(getMessages('zh').nav.destinations,'目的地');assert.equal(bestLocale('fr-FR,fr;q=0.9,en;q=0.4'),'en');
assert.equal(localizePath('/destinations/beijing','ko'),'/ko/destinations/beijing');assert.equal(localizePath('/en/guide','ko'),'/ko/guide');assert.equal(localizePath('/api/pdf','ko'),'/api/pdf');
assert(publishedFor('zh','/plan'));assert(!publishedFor('ko','/plan'));assert(publishedFor('zh','/journeys/beijing-imperial-day'));assert(!publishedFor('zh','/destinations/beijing'));assert(publishedFor('ko','/journeys/beijing-imperial-day'));assert(!publishedFor('ko','/destinations/beijing'));assert(isLocale('ko')&&isLocale('zh')&&!isLocale('fr'));
for(const locale of publishedLocales){assert(manifest[locale]);assert.equal(manifest[locale].state,'prototype');assert.equal(manifest[locale].factFingerprint,fingerprint,`${locale}: operational facts changed; re-review translation before publishing`);const view=resolveBeijing(locale);assert.deepEqual(view.cards.map(c=>c.id),cards.map(c=>c.id));assert.deepEqual(view.day.stops.map(s=>s.id),day.stops.map(s=>s.id));assert.deepEqual(view.places.map(p=>p.id),places.map(p=>p.id));assert(view.day.stops.every(s=>s.title&&s.action));assert(view.places.every(p=>p.reservation.value&&p.access.value));}
const ui=readFileSync('src/i18n/daybook-ui.ts','utf8');const keys=new Set([...ui.matchAll(/'([^'\n]+)'\s*:/g)].map(m=>m[1]));for(const file of ['src/components/journey/JourneyWorkbench.tsx','src/components/journey/AmapExplorer.tsx']){const source=readFileSync(file,'utf8');for(const match of source.matchAll(/\b(?:t|dbText\(locale,)\('([^']+)'\)/g)){assert(keys.has(match[1]),`${path.basename(file)}: missing UI message ${match[1]}`);assert.notEqual(dbText('zh',match[1]),match[1],`${path.basename(file)}: missing Chinese UI message ${match[1]}`)}}
console.log('PASS: eleven planned locales, published paths, English/Korean/Chinese content identity, operational fact fingerprint, UI messages.');
