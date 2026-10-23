import {notFound} from 'next/navigation';
import {isLocale} from '@/i18n/locales';
import {publishedFor} from '@/i18n/publication';
import {pageMetadata} from '@/i18n/metadata';
import {travelTips, findTravelTip, travelTipView} from '@/content/travel-tips';
import TravelTipArticle from '@/components/travel/TravelTipArticle';

type Props = {params: Promise<{locale: string; slug: string}>};
export function generateStaticParams() {return travelTips.map(guide => ({slug: guide.slug}));}
export async function generateMetadata({params}: Props) {
  const {locale, slug} = await params, guide = findTravelTip(slug);
  if (!guide || !isLocale(locale) || !publishedFor(locale, `/travel-tips/${slug}`)) return {};
  const view = travelTipView(guide, locale);
  return pageMetadata(locale, `/travel-tips/${slug}`, view.title, view.description);
}
export default async function TravelTipPage({params}: Props) {
  const {locale, slug} = await params, guide = findTravelTip(slug);
  if (!guide || !isLocale(locale) || !publishedFor(locale, `/travel-tips/${slug}`)) notFound();
  return <TravelTipArticle guide={guide} locale={locale}/>;
}
