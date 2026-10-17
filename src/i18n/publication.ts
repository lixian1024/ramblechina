import {publishedLocales,type Locale} from './locales';
/** English and Simplified Chinese share current website routes. Legacy PDF editions and design studies retain explicit English fallbacks. */
export function publishedFor(locale:Locale,path:string){return path.startsWith('/')&&(publishedLocales as readonly string[]).includes(locale)&&!(locale==='zh'&&/^\/(guide|checkout|home-designs)(?:\/|$)/.test(path));}
