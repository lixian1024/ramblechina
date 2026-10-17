'use client';
import {useWebsiteText} from '@/i18n/context';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { ArrowUpRight, List, Map as MapIcon, MapPin, Search, X } from 'lucide-react';
import Link,{useLocale} from '@/i18n/context';
import {cityView,regionChinese} from '@/content/editorial/zh/resolve';
import { cities, photoFor, regions } from '@/lib/travel/data';
import DestinationMap from './DestinationMap';
import SaveButton from './SaveButton';
import styles from './DestinationExplorer.module.css';

type Props = {
  initial?: string;
  initialRegion?:string;
  initialSelected?:string;
  googleMapsKey: string;
  englishEnabled: boolean;
};

export default function DestinationExplorer({ initial = '', initialRegion='All',initialSelected='',googleMapsKey, englishEnabled }: Props) {
  const t=useWebsiteText(),locale=useLocale();
  const displayCities=useMemo(()=>cities.map(city=>cityView(city,locale)),[locale]);
  const [query, setQuery] = useState(initial);
  const [region, setRegion] = useState(regions.includes(initialRegion)?initialRegion:'All');
  const [selectedSlug, setSelectedSlug] = useState<string | null>(cities.some(city=>city.slug===initialSelected)?initialSelected:null);
  const [mobileView, setMobileView] = useState<'list' | 'map'>('list');
  const mapPanelRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef(new Map<string, HTMLElement>());

  const results = useMemo(() => {
    const term = query.toLowerCase().trim();
    return displayCities.filter(city =>
      (region === 'All' || city.region === region) &&
      [city.name,city.slug,cities.find(base=>base.slug===city.slug)?.name, city.chinese, city.province, city.tagline, city.food,
        ...city.guide.foods.map(food => `${food.name} ${food.description}`),
        ...city.highlights.map(highlight => highlight.name),
      ].join(' ').toLowerCase().includes(term),
    );
  }, [query, region,displayCities]);

  useEffect(()=>{const url=new URL(window.location.href);for(const [key,value] of [['q',query],['region',region==='All'?'':region],['selected',selectedSlug||'']]){if(value)url.searchParams.set(key,value);else url.searchParams.delete(key);}window.history.replaceState(window.history.state,'',url.pathname+url.search+url.hash);},[query,region,selectedSlug]);

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
      <h1 id="destination-explorer-title" className="sr-only">{t("Destinations")}</h1>
      <div className={styles.toolbar}>
        <div className={styles.filters} role="group" aria-label={t("Filter by region")}>
          {regions.map(item => (
            <button
              type="button"
              key={item}
              aria-pressed={region === item}
              onClick={() => { setRegion(item); resetList(); }}
            >
              {locale==='zh'?regionChinese[item]:item === 'All' ? t("All regions") : item}
            </button>
          ))}
        </div>
        <label className={styles.search}>
          <Search size={18} aria-hidden="true" />
          <input
            type="search"
            aria-label={t("Search destinations")}
            placeholder={t("City, landscape, or favourite food")}
            value={query}
            onChange={event => { setQuery(event.target.value); resetList(); }}
          />
          {query && (
            <button type="button" aria-label={t("Clear search")} onClick={() => { setQuery(''); resetList(); }}>
              <X size={16} aria-hidden="true" />
            </button>
          )}
        </label>
      </div>

      <div className={styles.mobileSwitch} role="group" aria-label={t("Destination view")}>
        <button type="button" aria-pressed={mobileView === 'list'} onClick={() => setMobileView('list')}>
          <List size={15} aria-hidden="true" /> {t("List")} <span>{results.length}</span>
        </button>
        <button type="button" aria-pressed={mobileView === 'map'} onClick={() => setMobileView('map')}>
          <MapIcon size={15} aria-hidden="true" /> {t("Map")} </button>
      </div>

      <div className={styles.workspace} data-view={mobileView}>
        <section className={styles.listPanel} aria-labelledby="destination-results-title">
          <div className={styles.listHeading}>
            <h2 id="destination-results-title" aria-live="polite">
              {locale==='zh'?`${results.length} 个目的地`:`${results.length} ${results.length === 1 ? 'place' : 'places'} to discover`}
            </h2>
            {(query || region !== 'All') && <button type="button" onClick={clearFilters}>{t("Clear filters")}</button>}
          </div>
          <div className={styles.cityList} aria-label={t("Destination results")}>
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
                    <Link href={`/destinations/${city.slug}`} className={styles.cityImage} aria-label={locale==='zh'?`探索${city.name}`:`Explore ${city.name}`}>
                      {photo ? (
                        <Image src={city.image} alt={`${city.name} — ${city.tagline}`} fill sizes="(max-width: 380px) 82px, (max-width: 560px) 104px, (max-width: 800px) calc(50vw - 26px), (max-width: 1100px) calc(33.333vw - 34px), (max-width: 1800px) calc(33.333vw - 44px), 556px" />
                      ) : <span className={styles.noPhoto}>{city.chinese}</span>}
                    </Link>
                    <SaveButton slug={city.slug} />
                  </div>
                  <div className={styles.cardCopy}>
                    <span className={styles.province}>{city.province}</span>
                    <h3 id={`destination-${city.slug}`}>
                      <Link href={`/destinations/${city.slug}`}>{city.name}</Link>
                      {locale!=='zh'&&<span lang="zh-CN">{city.chinese}</span>}
                    </h3>
                    <p>{city.tagline}</p>
                    <span className={styles.cityMeta}>{city.days} {locale==='zh'?'天':'days'} · {locale==='zh'?regionChinese[city.region]:city.region}</span>
                    <div className={styles.cardActions}>
                      <button
                        type="button"
                        aria-label={locale==='zh'?`在地图显示${city.name}`:`Show ${city.name} on map`}
                        aria-pressed={selected}
                        onClick={() => { setSelectedSlug(city.slug); setMobileView('map'); }}
                      >
                        <MapPin size={12} aria-hidden="true" /> {selected ? t("On the map") : t("Show on map")}
                      </button>
                      <Link href={`/destinations/${city.slug}`} aria-label={locale==='zh'?`探索${city.name}`:`Explore ${city.name}`}>{t("Explore")} <ArrowUpRight size={13} aria-hidden="true" />
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
            {results.length === 0 && (
              <div className={styles.empty}>
                <Search size={26} strokeWidth={1.3} aria-hidden="true" />
                <h3>{t("No places found just yet.")}</h3>
                <p>{t("Try another city, region, or a broader search.")}</p>
                <button type="button" onClick={clearFilters}>{t("Clear filters")}</button>
              </div>
            )}
          </div>
        </section>

        <div className={styles.mapPanel} ref={mapPanelRef}>
          <DestinationMap
            cities={results}
            selectedSlug={selectedSlug}
            onSelect={setSelectedSlug}
            apiKey={googleMapsKey}
            englishEnabled={englishEnabled}
          />
        </div>
      </div>
    </section>
  );
}
