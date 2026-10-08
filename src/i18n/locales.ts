export const plannedLocales=['en','ko','zh','ru','ms','vi','th','es','fr','de','ja'] as const;
export type PlannedLocale=(typeof plannedLocales)[number];
export const publishedLocales=['en','ko','zh'] as const;
export type Locale=(typeof publishedLocales)[number];
export const defaultLocale:Locale='en';
export const languageNames:Record<Locale,string>={en:'English',ko:'한국어',zh:'简体中文'};
export function isLocale(value:string):value is Locale{return (publishedLocales as readonly string[]).includes(value)}
export function isPlannedLocale(value:string):value is PlannedLocale{return (plannedLocales as readonly string[]).includes(value)}
export function localizePath(path:string,locale:Locale){if(!path.startsWith('/')||path.startsWith('//'))return path;if(path.startsWith('/api/')||path.startsWith('/_next/'))return path;const bare=path.replace(/^\/(en|ko|zh)(?=\/|$)/,'')||'/';return `/${locale}${bare==='/'?'':bare}`;}
export function bestLocale(accept:string|null):Locale{if(!accept)return defaultLocale;const parts=accept.toLowerCase().split(',').map((part,index)=>{const [tag,...options]=part.trim().split(';');const q=options.find(o=>o.trim().startsWith('q='));return {tag:tag.split('-')[0],weight:q?Number(q.trim().slice(2)):1,index};}).filter(p=>Number.isFinite(p.weight)&&p.weight>0).sort((a,b)=>b.weight-a.weight||a.index-b.index);for(const p of parts){if(isLocale(p.tag))return p.tag;}return defaultLocale;}
