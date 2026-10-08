import DestinationExplorer from '@/components/travel/DestinationExplorer';

export const metadata = { title: 'Explore destinations' };

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  return (
    <DestinationExplorer
      initial={q || ''}
      amapJsKey={process.env.AMAP_JS_API_KEY?.trim() || ''}
      amapEnglishEnabled={process.env.AMAP_JS_ENGLISH_ENABLED === 'true'}
    />
  );
}
