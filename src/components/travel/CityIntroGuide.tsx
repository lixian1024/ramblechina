import {siteTranslator} from '@/i18n/website';
import Image from 'next/image';
import Link from '@/i18n/context';
import {ArrowLeft,ArrowUpRight,Clock,CalendarDays} from 'lucide-react';
import {cities,photoFor,type City} from '@/lib/travel/data';
import {cityView,overviewSights} from '@/content/editorial/zh/resolve';
import SaveButton from './SaveButton';
import CityCard from './CityCard';
import type {Locale} from '@/i18n/locales';

export default function CityIntroGuide({city,locale}:{city:City;locale:Locale}){
 const t=siteTranslator(locale);
 const view=cityView(city,locale),photo=photoFor(city.slug);
 return <>
  <div className="wrap breadcrumb"><Link href="/destinations"><ArrowLeft size={15}/>{t("All destinations")}</Link><span>{t("Chinese destination overview")}</span></div>
  <section className="city-heading wrap"><div><span className="eyebrow">{view.province}</span><h1>{view.name}</h1><p>{view.tagline}</p></div><SaveButton slug={city.slug} label/></section>
  {photo&&<figure className="city-guide-hero wrap"><div className="city-panorama"><Image src={city.image} alt={`${view.name}风景`} fill preload sizes="(max-width:700px) 100vw, 90vw"/></div></figure>}
  <div className="city-facts wrap"><span><Clock size={20}/><b>{view.days} {t("days")}</b>{t("Suggested stay")}</span><span><CalendarDays size={20}/><b>{view.season}</b>{t("A good time to visit")}</span></div>
  <div className="city-guide-layout wrap"><aside className="city-guide-index"><nav aria-label={t("City overview chapters")}>{[['overview','Overview'],['sights','Start here'],['food','Food'],['before','Before you go'],['sources','Sources & limits']].map(([id,label])=><a key={id} href={`#${id}`}>{t(label)}</a>)}</nav><Link className="text-link" href={`/plan?city=${city.slug}`}>{t("Plan")} {view.name} <ArrowUpRight size={15}/></Link></aside><div className="city-guide-body">
   <section id="overview" className="guide-chapter"><h2>{t("Meet the city.")}</h2><p className="lead">{view.description}</p></section>
   <section id="sights" className="guide-chapter"><h2>{t("Places to start with.")}</h2><p className="guide-section-intro">{t("These are starting points, not a one-day checklist. Plan around geography, actual opening and booking requirements.")}</p><div className="guide-detail-list">{overviewSights(city).map(name=><article key={name}><h3>{name}</h3><a className="text-link" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name+' '+view.name)}`} target="_blank" rel="noopener noreferrer">在地图查找 <ArrowUpRight size={14}/></a></article>)}</div></section>
   <section id="food" className="guide-chapter"><h2>{t("Local flavours.")}</h2><p className="lead">{view.food}</p><p className="guide-small-note">{t("Recipes vary by kitchen. Confirm ingredients and sauces directly if you have allergies or dietary restrictions.")}</p></section>
   <section id="before" className="guide-chapter"><h2>{t("Before you go.")}</h2><p>{view.tip}</p><Link href="/essentials" className="text-link">查看行前准备 <ArrowUpRight size={15}/></Link></section>
   <section id="sources" className="guide-chapter guide-sources"><h2>{t("Sources & limits.")}</h2><p>{t("This is a Chinese overview. The detailed English notes include additional accommodation, transport and route context.")} {t("Source pages accessed")} {city.guide.reviewedAt}。{t("This is not a live check of every venue. Confirm current opening, booking, prices and transport before departure.")}</p><ul>{city.guide.sources.map((source,index)=><li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer">{t("Reference")} {index+1} ↗</a></li>)}</ul><a className="text-link" href={`/en/destinations/${city.slug}`} lang="en">查看详细英文笔记 <ArrowUpRight size={15}/></a></section>
  </div></div><section className="wrap related"><h2>{t("Keep exploring.")}</h2><div className="city-grid">{cities.filter(other=>other.slug!==city.slug&&other.region===city.region).slice(0,4).map(other=><CityCard key={other.slug} city={other} locale={locale}/>)}</div></section>
 </>;
}
