'use client';
import {useLocale,useWebsiteText} from '@/i18n/context';

import Image from 'next/image';
import { ArrowUpRight, ChevronRight, Play, SquarePlay as Youtube } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { StoryCatalog, TravelStory } from '@/lib/travel-stories/catalog';
import { moreStoriesUrl } from '@/lib/travel-stories/creators';
import { storyLayout } from '@/lib/travel-stories/masonry';
import {formatLocale} from '@/i18n/website';
import type {Locale} from '@/i18n/locales';
import styles from './TravelStories.module.css';

type Placement = { left: number; top: number; width: number };

function duration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return minutes >= 60 ? `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}` : `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}
const dateLabel = (value: string,locale:Locale) => new Date(value).toLocaleDateString(formatLocale(locale), { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Shanghai' });
const viewsLabel = (value: string,locale:Locale) => new Intl.NumberFormat(formatLocale(locale), { notation: 'compact', maximumFractionDigits: 1 }).format(BigInt(value));

function StoryCard({ story, rank, playing, onPlay, onClose }: {
  story: TravelStory; rank: number; playing: boolean; onPlay: () => void; onClose: () => void;
}) {
  const t=useWebsiteText(),locale=useLocale();
  const [loadFailed, setLoadFailed] = useState(false);
  const url = `https://www.youtube.com/watch?v=${story.id}`;
  return <article className={styles.card} data-story-id={story.id} data-views={story.viewCount}>
    <div className={styles.media}>
      {playing && !loadFailed ? <iframe
        src={`https://www.youtube-nocookie.com/embed/${story.id}?autoplay=1&playsinline=1`}
        title={`${story.title} — YouTube video`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen referrerPolicy="strict-origin-when-cross-origin" onError={() => setLoadFailed(true)}
      /> : <button className={styles.poster} onClick={() => { setLoadFailed(false); onPlay(); }} aria-label={`${locale==='zh'?'播放':'Play '} ${story.title}`}>
        <Image src={story.thumbnail} alt="" width={480} height={270} unoptimized sizes="(max-width: 671px) 100vw, 50vw" />
        <span className={styles.play}><Play size={23} fill="currentColor" strokeWidth={1.5} /></span>
        <span className={styles.rank}>#{String(rank).padStart(2, '0')}</span>
        <span className={styles.duration}>{duration(story.durationSeconds)}</span>
      </button>}
    </div>
    <div className={styles.cardBody}>
      <div className={styles.cardMeta}><span title={`${new Intl.NumberFormat(formatLocale(locale)).format(BigInt(story.viewCount))} ${locale==='zh'?'次 YouTube 观看':'YouTube views'}`}><Youtube size={15} /> {viewsLabel(story.viewCount,locale)} {locale==='zh'?'次观看':'views'}</span><time dateTime={story.publishedAt}>{dateLabel(story.publishedAt,locale)}</time></div>
      <h2><a href={url} title={story.title} target="_blank" rel="noopener noreferrer">{story.title}</a></h2>
      {loadFailed && <p className={styles.playerError} role="alert">{t("The player could not load. Select the video title to watch on YouTube.")}</p>}
      {playing && <div className={styles.cardBottom}><button onClick={onClose}>{t("Close player")}</button></div>}
    </div>
  </article>;
}

export default function TravelStories({ catalog }: { catalog: StoryCatalog }) {
  const t=useWebsiteText(),locale=useLocale();
  const [playing, setPlaying] = useState<string | null>(null);
  const [layout, setLayout] = useState<{ positions: Placement[]; height: number } | null>(null);
  const masonry = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const host = masonry.current;
    if (!host || !catalog.stories.length) return;
    let frame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        setLayout(storyLayout(host.clientWidth, Array.from(host.children).map(child => child.getBoundingClientRect().height)));
      });
    });
    observer.observe(host);
    for (const card of host.children) observer.observe(card);
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, [catalog.stories]);

  return <div className={styles.page}>
    <header className={styles.intro}>
      <div><h1>{t("China through")}<br /><em>{t("travelers’ eyes.")}</em></h1><p>{t("Real journeys. New perspectives. Find a little inspiration for yours.")}</p></div>
      <a className={styles.youtubeLink} href={moreStoriesUrl} target="_blank" rel="noopener noreferrer"><Youtube size={19} /> {t("Explore on YouTube")} <ArrowUpRight size={17} /></a>
    </header>
    {catalog.state === 'partial' && <p className={styles.statusNote} role="status">{t("Some videos could not be refreshed.")}</p>}
    {catalog.state === 'stale' && catalog.checkedAt && <p className={styles.statusNote} role="status">{t("View counts could not be refreshed. Last checked")} {dateLabel(catalog.checkedAt,locale)}.</p>}
    {catalog.state === 'unavailable' || !catalog.stories.length ? <section className={styles.empty} role="status"><Youtube size={32} /><h2>{catalog.state === 'unavailable' ? t("Stories are taking a little longer.") : t("No recent stories to show yet.")}</h2><p>{catalog.state === 'unavailable' ? t("We couldn’t check the latest videos. Please check back soon, or continue exploring on YouTube.") : t("Explore more China travel videos directly on YouTube.")}</p><div><a href={moreStoriesUrl} target="_blank" rel="noopener noreferrer">{t("Watch on YouTube")} <ArrowUpRight size={16} /></a></div></section> : <div
      ref={masonry} className={`${styles.masonry} ${layout ? styles.positioned : ''}`} style={layout ? { height: layout.height } : undefined}
    >{catalog.stories.map((story, index) => <div key={story.id} className={styles.item} style={layout?.positions[index] ? { width: layout.positions[index].width, transform: `translate(${layout.positions[index].left}px, ${layout.positions[index].top}px)` } : undefined}>
      <StoryCard story={story} rank={index + 1} playing={playing === story.id} onPlay={() => setPlaying(story.id)} onClose={() => setPlaying(null)} />
    </div>)}</div>}
    <section className={styles.more} aria-labelledby="more-stories-title"><div><span className={styles.eyebrow}>{t("THE JOURNEY CONTINUES")}</span><h2 id="more-stories-title">{t("There’s more out there.")}</h2><p>{catalog.hasMore ? t("You’ve reached our 100-story collection. Find more journeys on YouTube.") : t("More places, more people, more stories to discover on YouTube.")}</p></div><a href={moreStoriesUrl} target="_blank" rel="noopener noreferrer">{t("Watch more on YouTube")} <ChevronRight size={19} /></a></section>
    <p className={styles.editorialNote}>{t("Videos reflect each creator’s experience and may include sponsorships. Check current travel details before you go.")} <a href="https://www.youtube.com/t/terms" target="_blank" rel="noopener noreferrer">{t("YouTube Terms")}</a> · <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">{t("Google Privacy")}</a></p>
  </div>;
}
