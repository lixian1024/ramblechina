import {localizePath, type Locale} from './locales';
import {publishedFor} from './publication';

/** Keep stable entities, trip IDs, search filters and hash anchors on language changes. */
export function languageDestination(path: string, locale: Locale) {
  const url = new URL(path, 'https://www.ramblechina.com');
  const bare = url.pathname.replace(/^\/(en|zh|ko)(?=\/|$)/, '') || '/';
  url.pathname = localizePath(bare, publishedFor(locale, bare) ? locale : 'en');
  const next = url.searchParams.get('next');
  if (next && /^\/(en|zh)\/(account|plan|local-guide)(?:[/?#]|$)/.test(next)) url.searchParams.set('next', localizePath(next, locale));
  return url.pathname + url.search + url.hash;
}
