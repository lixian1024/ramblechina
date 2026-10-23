import {pageMetadata} from '@/i18n/metadata';
import type {Locale} from '@/i18n/locales';
import { notFound } from 'next/navigation';
import { CinematicHome } from '@/components/travel/HomeConcepts';
import { publishedFor } from '@/i18n/publication';
import { isLocale } from '@/i18n/locales';

export async function generateMetadata({params}:{params:Promise<{locale:Locale}>}){const {locale}=await params;return pageMetadata(locale,"/",locale==='zh'?"初次来华旅行规划":"China Trip Planner for First-Time Visitors",locale==='zh'?"为第一次来中国的旅行者规划、修改行程，了解每日路线、预约事项与尚待核实的信息。":"Plan and revise your first China trip. Understand daily routes, booking requirements and what still needs checking before you travel.");}

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale) || !publishedFor(locale, '/')) notFound();
  return <CinematicHome locale={locale} />;
}
