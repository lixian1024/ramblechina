import {pageMetadata} from '@/i18n/metadata';
import type {Locale} from '@/i18n/locales';
import { notFound } from 'next/navigation';
import { CinematicHome } from '@/components/travel/HomeConcepts';
import { publishedFor } from '@/i18n/publication';
import { isLocale } from '@/i18n/locales';

export async function generateMetadata({params}:{params:Promise<{locale:Locale}>}){const {locale}=await params;return pageMetadata(locale,"/",locale==='zh'?"你的中国之旅":"Your China journey",locale==='zh'?"探索中国，做好行前准备，按兴趣规划旅程。":"Explore China, prepare for your visit and plan a trip around your interests.");}

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale) || !publishedFor(locale, '/')) notFound();
  return <CinematicHome locale={locale} />;
}
