'use client';
import {useWebsiteText} from '@/i18n/context';

import dynamic from 'next/dynamic';
import {useLocale} from '@/i18n/context';
import { MapPin } from 'lucide-react';
import type { City } from '@/lib/travel/data';
import styles from './DestinationMap.module.css';

export type DestinationMapProps = {
  cities: City[];
  selectedSlug: string | null;
  onSelect: (slug: string | null) => void;
  apiKey: string;
  englishEnabled: boolean;
};

function MapLoading(){const t=useWebsiteText();return <div className={styles.loading} role="status">{t("Unfolding your map…")}</div>;}

const MapSurface = dynamic(() => import('./DestinationMapSurface'), {
  ssr: false,
  loading: MapLoading,
});

export default function DestinationMap(props: DestinationMapProps) {
  const t=useWebsiteText(),locale=useLocale();
  return (
    <section className={styles.panel} aria-labelledby="destination-map-title">
      <div className={styles.heading}>
        <div>
          <span className={styles.eyebrow}>{t("A SENSE OF PLACE")}</span>
          <h2 id="destination-map-title">{t("Find your bearings.")}</h2>
        </div>
        <span className={styles.count}><MapPin size={14} aria-hidden="true" />{props.cities.length} {locale==='zh'?'座城市':props.cities.length === 1 ? 'city' : 'cities'}</span>
      </div>
      <MapSurface {...props} />
      <div className={styles.caption}>
        <span><i aria-hidden="true" />{t("Select a city on the map or in the list.")}</span>
        <span>Google Maps</span>
      </div>
    </section>
  );
}
