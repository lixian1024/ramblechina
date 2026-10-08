import type {Locale} from './locales';
/** A locale prefix is not a promise that every editorial product has been translated. */
export function publishedFor(locale:Locale,path:string){if(locale==='en')return true;return path==='/'||path==='/journeys/beijing-imperial-day'||(locale==='zh'&&path==='/plan');}
