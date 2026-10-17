import {pageMetadata} from '@/i18n/metadata';
import type {Locale} from '@/i18n/locales';
import { connection } from 'next/server';
import { notFound } from 'next/navigation';
import TravelStories from '@/components/travel/TravelStories';
import { getStoryCatalog } from '@/lib/travel-stories/catalog';
import { isLocale } from '@/i18n/locales';
import { publishedFor } from '@/i18n/publication';

export async function generateMetadata({params}:{params:Promise<{locale:Locale}>}){const {locale}=await params;return pageMetadata(locale,"/travel-stories",locale==='zh'?"旅行故事":"Travel Stories",locale==='zh'?"旅行者眼中的中国，观看近期国际旅行创作者的 YouTube 视频。":"China through travelers’ eyes. Explore recent YouTube journeys from international travel creators, sorted by views.");}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale) || !publishedFor(locale, '/travel-stories')) notFound();
  await connection();
  const catalog = await getStoryCatalog();
  return <TravelStories catalog={catalog} />;
}
