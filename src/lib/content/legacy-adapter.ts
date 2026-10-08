import { cities } from '../travel/data';
/** Base guides stay published; descriptions never become verified execution facts. */
export function legacyCitySummary(slug:string){const c=cities.find(c=>c.slug===slug);if(!c)return null;return {id:c.slug,name:{en:c.name,zh:c.chinese},publicationLevel:'introductory' as const,executionReady:false,experiences:c.highlights.map((h,i)=>({legacyKey:`${slug}:legacy:${i}`,name:h.name,description:h.description,verification:'pending' as const}))};}
