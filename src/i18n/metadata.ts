import type {Metadata} from 'next';
import {localizePath, publishedLocales, type Locale} from './locales';
import {publishedFor} from './publication';
const origin='https://www.ramblechina.com';
export function pageMetadata(locale:Locale,path:string,title:string,description?:string):Metadata {
  return {title,description,alternates:{canonical:origin+localizePath(path,locale),languages:Object.fromEntries(publishedLocales.filter(language=>publishedFor(language,path)).map(language=>[language==='zh'?'zh-CN':'en',origin+localizePath(path,language)]))}};
}
