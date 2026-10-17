"use client";
import {useWebsiteText} from '@/i18n/context';
import { useMemo, useState } from 'react';
import Link,{useLocale} from '@/i18n/context';
import {cityView,regionChinese} from '@/content/editorial/zh/resolve';
import { Search, ArrowUpRight } from 'lucide-react';
import { cities, regions } from '@/lib/travel/data';
import CityCard from './CityCard';
import { useSaved } from './SaveButton';
export default function Directory({compact=false,initial='',savedOnly=false}:{compact?:boolean;initial?:string;savedOnly?:boolean}){
  const t=useWebsiteText(),locale=useLocale();
 const [query,setQuery]=useState(initial);const [region,setRegion]=useState('All');const saved=useSaved();
 const savedFilter=savedOnly?saved.join(','):null;
 const results=useMemo(()=>{
  const savedSlugs=new Set(savedFilter?.split(',')??[]);
  return cities.map(c=>cityView(c,locale)).filter(c=>(savedFilter===null||savedSlugs.has(c.slug))&&(region==='All'||c.region===region)&&[c.name,c.chinese,c.province,c.tagline,c.food,...c.guide.foods.map(f=>f.name+' '+f.description),...c.highlights.map(h=>h.name)].join(' ').toLowerCase().includes(query.toLowerCase().trim()));
 },[query,region,savedFilter,locale]);
 return <section className="directory wrap" id="explore"><div className="section-heading"><div><h2 className={!savedOnly&&!compact?'sr-only':undefined}>{savedOnly?t("Your little corner of China."):compact?t("Where will China take you?"):t("Destinations")}</h2><p>{savedOnly?t("A collection for your next journey. Saved on this browser."):t("Ancient capitals, mountain mornings, and meals worth travelling for.")}</p></div>{compact?<Link className="text-link" href="/destinations">{t("All 42 destinations")} <ArrowUpRight size={17}/></Link>:<label className="search-field"><Search size={18}/><input aria-label={t("Search destinations")} placeholder={t("City, landscape, or favourite food")} value={query} onChange={e=>setQuery(e.target.value)}/></label>}</div><div className="filters" aria-label={t("Filter by region")}>{regions.map(r=><button key={r} aria-pressed={region===r} className={region===r?'active':''} onClick={()=>setRegion(r)}>{locale==='zh'?regionChinese[r]:r}</button>)}</div>{!compact&&<p className="fine result-count" aria-live="polite">{locale==='zh'?`${results.length} 个目的地`:`${results.length} ${results.length===1?'place':'places'} to discover`}</p>}<div className="city-grid">{(compact?results.slice(0,4):results).map(c=><CityCard city={c} locale={locale} key={c.slug}/>)}</div>{results.length===0&&<div className="empty"><h3>{savedOnly?t("Your next journey starts with a place."):t("No places found just yet.")}</h3><p>{savedOnly?t("Tap the bookmark on any destination to keep it here."):t("Try another city, region, or a broader search.")}</p><Link className="button" href="/destinations">{t("Explore destinations")}</Link></div>}</section>
}
