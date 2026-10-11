'use client';

import dynamic from 'next/dynamic';
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

const MapSurface = dynamic(() => import('./DestinationMapSurface'), {
  ssr: false,
  loading: () => <div className={styles.loading} role="status">Unfolding your map…</div>,
});

export default function DestinationMap(props: DestinationMapProps) {
  return (
    <section className={styles.panel} aria-labelledby="destination-map-title">
      <div className={styles.heading}>
        <div>
          <span className={styles.eyebrow}>A SENSE OF PLACE</span>
          <h2 id="destination-map-title">Find your bearings.</h2>
        </div>
        <span className={styles.count}><MapPin size={14} aria-hidden="true" />{props.cities.length} {props.cities.length === 1 ? 'city' : 'cities'}</span>
      </div>
      <MapSurface {...props} />
      <div className={styles.caption}>
        <span><i aria-hidden="true" />Select a city on the map or in the list.</span>
        <span>Google Maps</span>
      </div>
    </section>
  );
}
