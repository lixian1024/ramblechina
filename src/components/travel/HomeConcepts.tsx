import {siteTranslator} from '@/i18n/website';
import type {Locale} from '@/i18n/locales';
import Image from 'next/image';
import { ArrowRight, ArrowUpRight, BookOpen, Check, Compass, MoveUpRight, Sparkles } from 'lucide-react';
import Link from '@/i18n/context';
import {cityView} from '@/content/editorial/zh/resolve';
import { findCity, photoFor } from '@/lib/travel/data';
import NotebookDestinations from './NotebookDestinations';
import PlanEntryLink from '@/components/account/PlanEntryLink';
import styles from './HomeConcepts.module.css';

export const homeConcepts = [
  { id: 'editorial', letter: 'A', name: 'The travel journal' },
  { id: 'cinematic', letter: 'B', name: 'Into the landscape' },
  { id: 'notebook', letter: 'C', name: 'The travel notebook' },
] as const;
export type HomeConcept = typeof homeConcepts[number]['id'];

function Photo({ slug, alt, className = '', preload = false, sizes = '(max-width: 760px) 100vw, 50vw' }: { slug: string; alt: string; className?: string; preload?: boolean; sizes?: string }) {
  return <div className={`${styles.photo} ${className}`}><Image src={photoFor(slug)!.file} alt={alt} fill preload={preload} sizes={sizes} /></div>;
}

function Editorial() {
  return <div className={styles.editorial}>
    <div className={styles.editorialWrap}>
      <div className={styles.journalMasthead}><span>A FIELD GUIDE TO YOUR NEXT ADVENTURE</span><span>CHINA, ONE PLACE AT A TIME</span></div>
      <section className={styles.editorialHero} aria-labelledby="concept-title">
        <div className={styles.editorialCopy}>
          <span className={styles.kicker}>FOR THE CURIOUS TRAVELLER</span>
          <h1 id="concept-title">China,<br />at your<br /><em>own pace.</em></h1>
          <p>Big cities. Quiet corners. A journey that feels like you. Tell us what you love, and start shaping your days.</p>
          <Link href="/plan" className={styles.editorialCta}>Make it your trip <ArrowUpRight size={20} /></Link>
          <span className={styles.signInNote}>Sign in to plan and save your journey.</span>
        </div>
        <figure className={styles.editorialFigure}>
          <Photo slug="guilin" alt="Limestone peaks rising above the Li River near Guilin" className={styles.editorialLandscape} preload />
          <div className={styles.photoLabel}><span>01 / GUILIN</span><span>Room to wander.</span></div>
          <span className={styles.verticalLabel}>LOOK A LITTLE CLOSER</span>
        </figure>
      </section>
      <section className={styles.editorialPlaces} aria-labelledby="editorial-places-title">
        <div className={styles.editorialSectionTitle}><span className={styles.kicker}>PLACES WITH A STORY</span><h2 id="editorial-places-title">Where will curiosity take you?</h2><Link href="/destinations">All destinations <ArrowRight size={17} /></Link></div>
        <div className={styles.editorialPlaceGrid}>{[
          { slug: 'beijing', story: 'Layers of history', detail: 'Imperial courtyards, hutong lanes, and a city still unfolding.' },
          { slug: 'shanghai', story: 'Old soul, new skyline', detail: 'Riverside architecture and the small streets in between.' },
          { slug: 'xian', story: 'A meeting of worlds', detail: 'Ancient walls and the flavours of a Silk Road crossroads.' },
        ].map(({ slug, story, detail }, index) => <article key={slug}>
          <Link href={`/destinations/${slug}`} className={styles.editorialPlaceLink}><Photo slug={slug} alt={photoFor(slug)!.description} sizes="(max-width: 760px) 90vw, 30vw" /><span className={styles.editorialPlaceNumber}>0{index + 1}</span><span className={styles.editorialPlaceName}>{findCity(slug)!.name}<ArrowUpRight size={20} /></span></Link>
          <h3>{story}</h3><p>{detail}</p>
        </article>)}</div>
      </section>
      <section className={styles.editorialFootnotes} aria-label="Practical support">
        <div><span className={styles.kicker}>A LITTLE PREPARATION</span><h2>Less figuring out.<br />More being there.</h2></div>
        <Link href="/essentials"><BookOpen size={22} /><span><strong>Before you go</strong><small>Payments, mobile data, transport and entry basics.</small></span><ArrowUpRight size={20} /></Link>
        <Link href="/local-guide"><Compass size={22} /><span><strong>A local perspective</strong><small>Request a guide. Availability and price confirmed separately.</small></span><ArrowUpRight size={20} /></Link>
      </section>
    </div>
  </div>;
}

export function CinematicHome({locale='en'}:{locale?:Locale}) {
  const t=siteTranslator(locale);
  return <div className={styles.cinematic}>
    <section className={styles.cinemaHero} aria-labelledby="concept-title">
      <Photo slug="guilin" alt={locale==='zh'?'桂林漓江穿过绿色喀斯特山峰':'The Li River winding through green limestone mountains near Guilin'} className={styles.cinemaBackdrop} sizes="100vw" preload />
      <div className={styles.cinemaShade} />
      <div className={styles.cinemaTopline}><span><span className={styles.locationDot} /> {t("GUILIN, CHINA")}</span></div>
      <div className={styles.cinemaCopy}><h1 id="concept-title">{t("A little further.")}<br />{t("A lot more")} <em>{t("China.")}</em></h1><p>{t("Your interests. Your pace. Your China.")}</p><PlanEntryLink className={styles.cinemaCta}>{t("Start your journey")} <ArrowUpRight size={20} /></PlanEntryLink></div>
    </section>
    <section id="cinema-places" className={styles.cinemaPlaces} aria-labelledby="cinema-places-title">
      <div className={styles.cinemaSectionHeading}><div><h2 id="cinema-places-title">{t("What draws you in?")}</h2></div><Link href="/destinations">{t("Explore all places")} <ArrowUpRight size={18} /></Link></div>
      <div className={styles.cinemaPlaceGrid}>{[
        { slug: 'shanghai', title: t("Old soul. New skyline."), category: t("ARCHITECTURE & CITY LIFE") },
        { slug: 'beijing', title: t("Stories that stay."), category: t("HISTORY & CULTURE") },
        { slug: 'chongqing', title: t("The city after dark."), category: t("RIVERS & CITY LIGHTS") },
      ].map(({ slug, title, category }, index) => <figure key={slug}>
        <Link href={`/destinations/${slug}`} className={styles.cinemaPlaceLink}><Photo slug={slug} alt={photoFor(slug)!.description} sizes="(max-width: 760px) 90vw, 30vw" /><span className={styles.cinemaCardIndex}>0{index + 1}</span><div className={styles.cinemaCardCopy}><span>{t(category)}</span><h3>{t(title)}</h3><span>{cityView(findCity(slug)!,locale).name} <ArrowUpRight size={19} /></span></div></Link>
      </figure>)}</div>
    </section>
    <section className={styles.cinemaSupport} aria-labelledby="cinema-support-title"><div><h2 id="cinema-support-title">{t("The details matter.")}</h2></div><div className={styles.cinemaSupportLinks}><Link href="/essentials"><span><strong>{t("Get China-ready.")}</strong><p>{t("Entry, payments, mobile data and transport.")}</p></span><ArrowUpRight size={26} /></Link><Link href="/local-guide"><span><strong>{t("A local perspective.")}</strong><p>{t("Request a guide. Availability and price confirmed separately.")}</p></span><ArrowUpRight size={26} /></Link></div></section>
  </div>;
}

function Notebook() {
  return <div className={styles.notebook}>
    <div className={styles.notebookWrap}>
      <section className={styles.notebookHero} aria-labelledby="concept-title">
        <div className={styles.notebookCopy}><span className={styles.notebookBadge}><Sparkles size={15} /> A BIG ADVENTURE. A LITTLE HELP.</span><h1 id="concept-title">Good trips<br />start <span>here<svg viewBox="0 0 280 24" aria-hidden="true"><path d="M5 14 Q110 0 272 10 M15 21 Q130 9 260 19" /></svg></span><span className={styles.notebookPeriod}>.</span></h1><p>Your China trip doesn’t have to look like everyone else’s. Bring your interests. Leave room for discovery.</p><Link href="/plan" className={styles.notebookCta}>Let’s plan your trip <ArrowRight size={20} /></Link><span className={styles.signInNote}>Sign in to keep your plans in one place.</span><div className={styles.notebookChecks}><span><Check size={16} /> Your interests</span><span><Check size={16} /> Your pace</span><span><Check size={16} /> Room to change</span></div></div>
        <div className={styles.scrapbook} aria-label="Snapshots of China">
          <svg className={styles.scribbleRoute} viewBox="0 0 600 520" aria-hidden="true"><path d="M60 145 C70 40 370 50 470 125 S610 370 410 420 S110 400 80 460" /><circle cx="60" cy="145" r="8" /><circle cx="80" cy="460" r="8" /></svg>
          <figure className={styles.polaroidOne}><span className={styles.tape} /><Photo slug="beijing" alt="The Forbidden City seen from Jingshan Park in Beijing" preload /><figcaption><span>Beijing, with love.</span><MoveUpRight size={20} /></figcaption></figure>
          <figure className={styles.polaroidTwo}><span className={styles.tape} /><Photo slug="shanghai" alt="Historic buildings along Shanghai’s Bund in daylight" /><figcaption><span>See you in Shanghai!</span><span>↗</span></figcaption></figure>
          <span className={styles.roundStamp}>TAKE<br />THE<br /><strong>SCENIC WAY</strong></span><span className={styles.handwritten}>Oh, the places<br />you’ll find. <ArrowUpRight size={26} /></span>
        </div>
      </section>
      <NotebookDestinations />
      <section className={styles.notebookSupport} aria-label="Travel preparation and local support">
        <Link href="/essentials" className={styles.checklistNote}><span className={styles.kicker}>THE BORING BITS, MADE EASIER</span><h2>Before you<br />zip your bag.</h2><ul><li><Check size={17} /> Payments & mobile data</li><li><Check size={17} /> Getting around</li><li><Check size={17} /> Entry & everyday essentials</li></ul><span className={styles.notebookSupportAction}>Open your travel essentials <ArrowUpRight size={19} /></span></Link>
        <Link href="/local-guide" className={styles.guideNote}><span className={styles.kicker}>A FRIENDLIER WAY TO FIND YOUR FEET</span><h2>A little<br />local know-how.</h2><p>Want someone to show you around? Share your cities, interests and preferred guide language.</p><small>Availability, services and price confirmed after your request.</small><span className={styles.notebookSupportAction}>Ask about a local guide <ArrowUpRight size={19} /></span></Link>
      </section>
    </div>
  </div>;
}

export default function HomeConcepts({ variant }: { variant: HomeConcept }) {
  return <>
    <nav className={styles.previewBar} aria-label="Homepage design previews"><span>HOMEPAGE STUDIES</span><div>{homeConcepts.map(({ id, letter, name }) => <Link key={id} href={`/home-designs/${id}`} aria-label={`${letter} ${name}`} aria-current={variant === id ? 'page' : undefined}><b>{letter}</b><span>{name}</span></Link>)}</div><Link href="/" className={styles.currentHome}>Current home <ArrowUpRight size={14} /></Link></nav>
    {variant === 'editorial' ? <Editorial /> : variant === 'cinematic' ? <CinematicHome /> : <Notebook />}
  </>;
}
