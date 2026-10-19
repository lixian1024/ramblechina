import {Suspense} from 'react';
import {analyticsMeasurementId, DEFAULT_GA_MEASUREMENT_ID} from '@/lib/analytics';
import {GoogleAnalyticsTracker} from './GoogleAnalyticsTracker';

export function GoogleAnalytics() {
  const measurementId = analyticsMeasurementId(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? DEFAULT_GA_MEASUREMENT_ID, process.env.NODE_ENV, process.env.VERCEL_ENV);
  return measurementId ? <Suspense fallback={null}><GoogleAnalyticsTracker measurementId={measurementId}/></Suspense> : null;
}
