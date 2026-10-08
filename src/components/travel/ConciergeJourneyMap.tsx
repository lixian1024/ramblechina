'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { WifiOff } from 'lucide-react';
import type { VerifiedTrip } from '@/lib/travel/concierge-types';
import styles from './Planner.module.css';

type Props = {
  plan: VerifiedTrip | null;
  dayIndex: number;
  allDays: boolean;
  selectedStop: number;
  onSelect: (day: number, stop: number) => void;
  zh: boolean;
  amapJsKey: string;
  amapEnglishEnabled: boolean;
};

const AmapConciergeJourneyMap = dynamic(() => import('./AmapConciergeJourneyMap'), { ssr: false });
export default function ConciergeJourneyMap({ amapJsKey, amapEnglishEnabled, ...props }: Props) {
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  if (!amapJsKey || failed) {
    return <div className={styles.interactiveMap}>
      <div className={styles.mapFallback} role="alert">
        <WifiOff size={24} aria-hidden="true" />
        <strong>{!amapJsKey
          ? (props.zh ? '高德地图 Key 尚未配置' : 'Amap key is not configured')
          : (props.zh ? '高德地图暂时无法加载' : 'The Amap map could not load')}</strong>
        {amapJsKey && <button type="button" onClick={() => { setFailed(false); setAttempt(value => value + 1); }}>
          {props.zh ? '重新加载地图' : 'Retry map'}
        </button>}
      </div>
    </div>;
  }

  return <AmapConciergeJourneyMap
    {...props}
    key={`${amapEnglishEnabled ? 'en' : 'zh'}-${attempt}`}
    apiKey={amapJsKey}
    englishEnabled={amapEnglishEnabled}
    onFailure={() => setFailed(true)}
  />;
}
