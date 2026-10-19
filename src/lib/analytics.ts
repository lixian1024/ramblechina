type Gtag = (...args: unknown[]) => void;

// Public GA4 web stream ID supplied by the site owner; this is not an API secret.
export const DEFAULT_GA_MEASUREMENT_ID = 'G-QBCYPGN6SB';

export interface AnalyticsBrowser {
  location: Pick<Location, 'href' | 'origin' | 'hostname' | 'protocol'>;
  document: Pick<Document, 'referrer' | 'title'>;
  dataLayer?: IArguments[];
  gtag?: Gtag;
  __rambleAnalytics?: {measurementId: string; lastPage: string};
}

export function analyticsMeasurementId(value: string | undefined, mode: string | undefined, deployment?: string): string | null {
  const id = value?.trim();
  if (mode !== 'production' || (deployment && deployment !== 'production')) return null;
  return id && /^G-[A-Z0-9]+$/.test(id) ? id : null;
}

function pageUrl(href: string, pathname: string): string {
  const original = new URL(href);
  const clean = new URL(pathname, original.origin);
  // Keep campaign attribution, never trip IDs, search input, auth codes or fragments.
  for (const key of ['utm_source', 'utm_medium', 'utm_campaign']) {
    const value = original.searchParams.get(key);
    if (value && /^[a-zA-Z0-9_.~-]{1,100}$/.test(value)) clean.searchParams.set(key, value);
  }
  return clean.href;
}

function referralOrigin(referrer: string): string {
  try {
    const url = new URL(referrer);
    return /^https?:$/.test(url.protocol) ? url.origin + '/' : '';
  } catch {
    return '';
  }
}

/** Queue safely before gtag.js loads; analytics must never block the travel UI. */
export function recordPageView(browser: AnalyticsBrowser, measurementId: string, pathname: string): void {
  if (!analyticsMeasurementId(measurementId, 'production') || browser.location.protocol !== 'https:' ||
      !['www.ramblechina.com', 'ramblechina.com'].includes(browser.location.hostname)) return;
  try {
    const page = browser.location.origin + pathname;
    const state = browser.__rambleAnalytics;
    if (state?.measurementId === measurementId && state.lastPage === page) return;
    browser.dataLayer ??= [];
    // Google tag's queue uses an Arguments object, matching the official snippet.
    browser.gtag ??= function () {
      // eslint-disable-next-line prefer-rest-params -- gtag.js expects the official Arguments queue format.
      browser.dataLayer!.push(arguments);
    };
    const values = {
      page_location: pageUrl(browser.location.href, pathname),
      page_referrer: state?.lastPage || referralOrigin(browser.document.referrer),
      page_title: browser.document.title,
    };
    browser.gtag('set', values);
    if (state?.measurementId !== measurementId) {
      browser.gtag('js', new Date());
      browser.gtag('config', measurementId, {
        send_page_view: false,
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
      });
    }
    browser.gtag('event', 'page_view', {...values, send_to: measurementId});
    browser.__rambleAnalytics = {measurementId, lastPage: page};
  } catch {
    // An unavailable/blocked analytics service must not affect navigation or forms.
  }
}
