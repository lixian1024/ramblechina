'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { ArrowUpRight, List, Map as MapIcon, MapPin, Search, X } from 'lucide-react';
import Link from '@/i18n/context';
import { cities, photoFor, regions } from '@/lib/travel/data';
import DestinationMap from './DestinationMap';
import SaveButton from './SaveButton';
import styles from './DestinationExplorer.module.css';

type Props = {
  initial?: string;
  amapJsKey: string;
  amapEnglishEnabled: boolean;
};

export default function DestinationExplorer({ initial = '', amapJsKey, amapEnglishEnabled }: Props) {
  const [query, setQuery] = useState(initial);
  const [region, setRegion] = useState('All');
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<'list' | 'map'>('list');
  const mapPanelRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef(new Map<string, HTMLElement>());

  const results = useMemo(() => {
    const term = query.toLowerCase().trim();
    return cities.filter(city =>
      (region === 'All' || city.region === region) &&
      [city.name, city.chinese, city.province, city.tagline, city.food,
        ...city.guide.foods.map(food => `${food.name} ${food.description}`),
        ...city.highlights.map(highlight => highlight.name),
      ].join(' ').toLowerCase().includes(term),
    );
  }, [query, region]);

  // The document scrolls; the map stays beside the selected city on desktop.
  useEffect(() => {
    const mobileMap = window.matchMedia('(max-width: 800px)').matches && mobileView === 'map';
    const target = mobileMap ? mapPanelRef.current : selectedSlug ? cardsRef.current.get(selectedSlug) : null;
    if (!target || !target.getClientRects().length) return;
    const bounds = target.getBoundingClientRect();
    if (bounds.top < 24 || bounds.bottom > window.innerHeight - 24) {
      target.scrollIntoView({ block: 'nearest', behavior: 'instant' });
    }
  }, [selectedSlug, mobileView]);

  function resetList() {
    setSelectedSlug(null);
  }

  function clearFilters() {
    setQuery('');
    setRegion('All');
    resetList();
  }

  return (
    <section className={styles.explorer} aria-labelledby="destination-explorer-title">
      <div className={styles.toolbar}>
        <div className={styles.intro}>
          <span className={styles.eyebrow}>THE DESTINATION COLLECTION</span>
          <h1 id="destination-explorer-title">Find your kind of China.</h1>
          <p>{cities.length} cities, countless ways to explore. Find a place that speaks to you.</p>
        </div>
        <label className={styles.search}>
          <Search size={18} aria-hidden="true" />
          <input
            type="search"
            aria-label="Search destinations"
            placeholder="City, landscape, or favourite food"
            value={query}
            onChange={event => { setQuery(event.target.value); resetList(); }}
          />
          {query && (
            <button type="button" aria-label="Clear search" onClick={() => { setQuery(''); resetList(); }}>
              <X size={16} aria-hidden="true" />
            </button>
          )}
        </label>
      </div>

      <div className={styles.filters} role="group" aria-label="Filter by region">
        {regions.map(item => (
          <button
            type="button"
            key={item}
            aria-pressed={region === item}
            onClick={() => { setRegion(item); resetList(); }}
          >
            {item === 'All' ? 'All regions' : item}
          </button>
        ))}
      </div>

      <div className={styles.mobileSwitch} role="group" aria-label="Destination view">
        <button type="button" aria-pressed={mobileView === 'list'} onClick={() => setMobileView('list')}>
          <List size={15} aria-hidden="true" /> List <span>{results.length}</span>
        </button>
        <button type="button" aria-pressed={mobileView === 'map'} onClick={() => setMobileView('map')}>
          <MapIcon size={15} aria-hidden="true" /> Map
        </button>
      </div>

      <div className={styles.workspace} data-view={mobileView}>
        <section className={styles.listPanel} aria-labelledby="destination-results-title">
          <div className={styles.listHeading}>
            <h2 id="destination-results-title" aria-live="polite">
              {results.length} {results.length === 1 ? 'place' : 'places'} to discover
            </h2>
            {(query || region !== 'All') && <button type="button" onClick={clearFilters}>Clear filters</button>}
          </div>
          <div className={styles.cityList} aria-label="Destination results">
            {results.map(city => {
              const photo = photoFor(city.slug);
              const selected = selectedSlug === city.slug;
              return (
                <article
                  className={styles.cityCard}
                  key={city.slug}
                  data-selected={selected}
                  aria-labelledby={`destination-${city.slug}`}
                  ref={element => {
                    if (element) cardsRef.current.set(city.slug, element);
                    else cardsRef.current.delete(city.slug);
                  }}
                >
                  <div className={styles.cardVisual}>
                    <Link href={`/destinations/${city.slug}`} className={styles.cityImage} aria-label={`Explore ${city.name}`}>
                      {photo ? (
                        <Image src={city.image} alt={`${city.name} — ${city.tagline}`} fill sizes="(max-width: 380px) 82px, (max-width: 560px) 104px, (max-width: 800px) calc(50vw - 26px), (max-width: 1100px) calc(33.333vw - 34px), (max-width: 1800px) calc(33.333vw - 44px), 556px" />
                      ) : <span className={styles.noPhoto}>{city.chinese}</span>}
                    </Link>
                    <SaveButton slug={city.slug} />
                    {photo && (
                      <a className={styles.photoCredit} href={photo.source} target="_blank" rel="noreferrer" title={`${photo.author} · ${photo.license}`}>
                        Photo credit
                      </a>
                    )}
                  </div>
                  <div className={styles.cardCopy}>
                    <span className={styles.province}>{city.province}</span>
                    <h3 id={`destination-${city.slug}`}>
                      <Link href={`/destinations/${city.slug}`}>{city.name}</Link>
                      <span lang="zh-CN">{city.chinese}</span>
                    </h3>
                    <p>{city.tagline}</p>
                    <span className={styles.cityMeta}>{city.days} days · {city.region}</span>
                    <div className={styles.cardActions}>
                      <button
                        type="button"
                        aria-label={`Show ${city.name} on map`}
                        aria-pressed={selected}
                        onClick={() => { setSelectedSlug(city.slug); setMobileView('map'); }}
                      >
                        <MapPin size={12} aria-hidden="true" /> {selected ? 'On the map' : 'Show on map'}
                      </button>
                      <Link href={`/destinations/${city.slug}`} aria-label={`Explore ${city.name}`}>
                        Explore <ArrowUpRight size={13} aria-hidden="true" />
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
            {results.length === 0 && (
              <div className={styles.empty}>
                <Search size={26} strokeWidth={1.3} aria-hidden="true" />
                <h3>No places found just yet.</h3>
                <p>Try another city, region, or a broader search.</p>
                <button type="button" onClick={clearFilters}>Clear filters</button>
              </div>
            )}
          </div>
        </section>

        <div className={styles.mapPanel} ref={mapPanelRef}>
          <DestinationMap
            cities={results}
            selectedSlug={selectedSlug}
            onSelect={setSelectedSlug}
            apiKey={amapJsKey}
            englishEnabled={amapEnglishEnabled}
          />
        </div>
      </div>
    </section>
  );
}
