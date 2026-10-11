'use client';

import { useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import Link from '@/i18n/context';
import styles from './HomeConcepts.module.css';

const places = [
  { slug: 'beijing', name: 'Beijing', note: 'Courtyards, hutongs & imperial history', interests: ['Culture'] },
  { slug: 'shanghai', name: 'Shanghai', note: 'Riverfront architecture & neighbourhood walks', interests: ['City life'] },
  { slug: 'guilin', name: 'Guilin', note: 'Karst peaks & river landscapes', interests: ['Nature'] },
  { slug: 'chengdu', name: 'Chengdu', note: 'Teahouses & Sichuan flavours', interests: ['Food', 'City life'] },
  { slug: 'xian', name: "Xi’an", note: 'Ancient walls & a Silk Road crossroads', interests: ['Culture', 'Food'] },
  { slug: 'chongqing', name: 'Chongqing', note: 'Hillside streets & riverside nights', interests: ['City life', 'Food'] },
];
const interests = ['All', 'Culture', 'City life', 'Nature', 'Food'];

export default function NotebookDestinations() {
  const [interest, setInterest] = useState('All');
  const visible = places.filter(place => interest === 'All' || place.interests.includes(interest));
  return <section className={styles.notebookPlaces} aria-labelledby="notebook-places-title">
    <div className={styles.notebookPlacesHeading}><div><span className={styles.kicker}>FIRST, FOLLOW YOUR CURIOSITY</span><h2 id="notebook-places-title">Pick your kind of place.</h2></div><span className={styles.handwrittenSmall}>No wrong place to start. ↙</span></div>
    <div className={styles.interestFilters} role="group" aria-label="Filter destination guides by interest">{interests.map(item => <button type="button" key={item} aria-pressed={interest === item} onClick={() => setInterest(item)}>{item}</button>)}</div>
    <p className={styles.resultCount} aria-live="polite">{visible.length} destination {visible.length === 1 ? 'guide' : 'guides'}{interest !== 'All' ? ` · ${interest}` : ''}</p>
    <div className={styles.notebookCityGrid}>{visible.map(({ slug, name, note }) => <Link key={slug} href={`/destinations/${slug}`}><span><strong>{name}</strong><small>{note}</small></span><ArrowUpRight size={22} /></Link>)}</div>
    <Link href="/destinations" className={styles.notebookAllPlaces}>Browse all destinations <ArrowUpRight size={17} /></Link>
  </section>;
}
