'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import type { Journey, Point } from '@/lib/travel/workbench';
import styles from './Planner.module.css';

export type JourneyMapProps = {
  journey: Journey;
  dayIndex: number;
  overview: boolean;
  selected: string | null;
  onSelect: (id: string, day: number) => void;
  pinning: boolean;
  onPin: (point: Point) => void;
};

const loading = () => <div className={styles.mapLoading} role="status">Unfolding your map…</div>;
const GoogleJourneyMap = dynamic(() => import('./GoogleJourneyMap'), { ssr: false, loading });
const OpenStreetJourneyMap = dynamic(() => import('./OpenStreetJourneyMap'), { ssr: false, loading });

export default function JourneyMap(props: JourneyMapProps) {
  const [backup, setBackup] = useState(false);
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
  if (key && !backup) {
    return <GoogleJourneyMap {...props} apiKey={key} onUseBackup={() => setBackup(true)} />;
  }
  return <>
    {backup && <div className={styles.mapProviderNotice} role="status">Showing the OpenStreetMap backup. Your itinerary is unchanged.</div>}
    <OpenStreetJourneyMap {...props} />
  </>;
}
