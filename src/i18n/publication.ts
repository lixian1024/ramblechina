import {publishedLocales,type Locale} from './locales';
/** Archived translations remain in the repository; the site publishes only English. */
export function publishedFor(locale:Locale,path:string){return path.startsWith('/')&&(publishedLocales as readonly string[]).includes(locale);}
