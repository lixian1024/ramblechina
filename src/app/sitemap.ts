import type {MetadataRoute} from 'next';
import {cities} from '@/lib/travel/data';
import {publishedLocales,localizePath} from '@/i18n/locales';
import {publishedFor} from '@/i18n/publication';
import {travelTips} from '@/content/travel-tips';
const origin='https://www.ramblechina.com';
const paths=['/','/destinations','/essentials','/travel-stories','/plan','/local-guide','/about','/credits','/travel-tips','/trip-review',...travelTips.map(guide=>`/travel-tips/${guide.slug}`),...cities.map(city=>`/destinations/${city.slug}`)];
export default function sitemap():MetadataRoute.Sitemap {
 return paths.flatMap(path=>publishedLocales.filter(locale=>publishedFor(locale,path)).map(locale=>({url:origin+localizePath(path,locale),alternates:{languages:Object.fromEntries(publishedLocales.filter(language=>publishedFor(language,path)).map(language=>[language==='zh'?'zh-CN':'en',origin+localizePath(path,language)]))}})));
}
