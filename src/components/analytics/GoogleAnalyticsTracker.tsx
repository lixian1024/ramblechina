'use client';

import {useEffect} from 'react';
import {usePathname} from 'next/navigation';
import Script from 'next/script';
import {recordPageView} from '@/lib/analytics';

export function GoogleAnalyticsTracker({measurementId}: {measurementId: string}) {
  const pathname = usePathname();
  useEffect(() => {
    recordPageView(window, measurementId, pathname);
  }, [measurementId, pathname]);

  return <Script id="ramble-google-analytics" src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`} strategy="afterInteractive"/>;
}
