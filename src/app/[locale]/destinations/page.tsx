import DestinationExplorer from '@/components/travel/DestinationExplorer';

export const metadata = { title: 'Explore destinations' };

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  return (
    <DestinationExplorer
      initial={q || ''}
      googleMapsKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() || ''}
      englishEnabled={true}
    />
  );
}
