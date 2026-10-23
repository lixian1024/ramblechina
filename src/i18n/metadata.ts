import type {Metadata} from 'next';
import {localizePath, publishedLocales, type Locale} from './locales';
import {publishedFor} from './publication';
const origin='https://www.ramblechina.com';
export function pageMetadata(locale:Locale,path:string,title:string,description?:string):Metadata {
  const brandedTitle = title.endsWith(' | Ramble China') ? title : `${title} | Ramble China`;
  const canonical = origin + localizePath(path, locale);
  const previewKey = path === '/' ? 'home' : /^\/destinations\/[a-z0-9-]+$/.test(path) ? `city-${path.split('/')[2]}` : /^\/travel-tips\/[a-z0-9-]+$/.test(path) ? `guide-${path.split('/')[2]}` : 'general';
  const image = {url: `${origin}/og/${locale}/${previewKey}.png`, width: 1200, height: 630, alt: brandedTitle};
  return {
    title: {absolute: brandedTitle}, description,
    alternates: {canonical, languages: Object.fromEntries(publishedLocales.filter(language=>publishedFor(language,path)).map(language=>[language==='zh'?'zh-CN':'en',origin+localizePath(path,language)]))},
    openGraph: {type: 'website', siteName: 'Ramble China', title: brandedTitle, description, url: canonical, locale: locale === 'zh' ? 'zh_CN' : 'en_US', alternateLocale: locale === 'zh' ? ['en_US'] : ['zh_CN'], images: [image]},
    twitter: {card: 'summary_large_image', title: brandedTitle, description, images: [image]},
  };
}
