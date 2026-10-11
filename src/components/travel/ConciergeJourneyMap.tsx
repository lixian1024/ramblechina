'use client';

import dynamic from 'next/dynamic';
import { useState, useCallback, type ReactNode } from 'react';
import { WifiOff } from 'lucide-react';
import type { VerifiedTrip } from '@/lib/travel/concierge-types';
import styles from './Planner.module.css';

type Props = {
  plan: VerifiedTrip | null;
  dayIndex: number;
  allDays: boolean;
  selectedStop: number;
  onSelect: (day: number, stop: number) => void;
  popup: { dayIndex: number; stopIndex: number } | null;
  placeCard: ReactNode;
  onClose: () => void;
  zh: boolean;

};

const GoogleConciergeJourneyMap = dynamic(() => import('./GoogleConciergeJourneyMap'), { ssr: false });
const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() || '';
export default function ConciergeJourneyMap(props: Props) {
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const onFailure = useCallback(() => setFailed(true), []);
  if (!apiKey || failed) {
    return <div className={styles.interactiveMap}>
      <div className={styles.mapFallback} role="alert">
        <WifiOff size={24} aria-hidden="true" />
        <strong>{!apiKey
          ? (props.zh ? 'Google 地图 Key 尚未配置' : 'Google Maps key is not configured')
          : (props.zh ? 'Google 地图暂时无法加载' : 'The Google Maps map could not load')}</strong>
        {apiKey && <button type="button" onClick={() => { setFailed(false); setAttempt(value => value + 1); }}>
          {props.zh ? '重新加载地图' : 'Retry map'}
        </button>}
      </div>
      {props.popup && <div className={styles.mapPlaceFallback}>{props.placeCard}</div>}
    </div>;
  }

  return <GoogleConciergeJourneyMap
    {...props}
    key={attempt}
    onFailure={onFailure}
  />;
}
