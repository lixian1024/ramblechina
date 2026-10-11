import { notFound } from 'next/navigation';
import { CinematicHome } from '@/components/travel/HomeConcepts';
import { publishedFor } from '@/i18n/publication';
import { isLocale } from '@/i18n/locales';

export const metadata = {
  title: 'Your China journey',
  description: 'Explore China, prepare for your visit and plan a trip around your interests.',
};

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale) || !publishedFor(locale, '/')) notFound();
  return <CinematicHome />;
}
