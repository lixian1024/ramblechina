import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isLocale } from '@/i18n/locales';
import { publishedFor } from '@/i18n/publication';
import HomeConcepts, { homeConcepts, type HomeConcept } from '@/components/travel/HomeConcepts';

export const metadata: Metadata = {
  title: 'Homepage design previews',
  robots: { index: false, follow: false },
};

export function generateStaticParams() {
  return homeConcepts.map(({ id }) => ({ variant: id }));
}

export default async function HomeDesign({ params }: { params: Promise<{ locale: string; variant: string }> }) {
  const { locale, variant } = await params;
  if (!isLocale(locale) || !publishedFor(locale, '/') || !homeConcepts.some(({ id }) => id === variant)) notFound();
  return <HomeConcepts variant={variant as HomeConcept} />;
}
