import {pageMetadata} from '@/i18n/metadata';
import type {Locale} from '@/i18n/locales';
import DestinationExplorer from '@/components/travel/DestinationExplorer';

export async function generateMetadata({params}:{params:Promise<{locale:Locale}>}){const {locale}=await params;return pageMetadata(locale,"/destinations",locale==='zh'?"探索目的地":"Explore destinations",locale==='zh'?"探索中国 42 个城市，按地区或关键词查找下一站。":"");}

export default async function Page({ params,searchParams }: {params:Promise<{locale:string}>; searchParams: Promise<{ q?: string;region?:string;selected?:string }> }) {
  const { q,region,selected } = await searchParams;const {locale}=await params;
  return (
    <DestinationExplorer
      initial={q || ''}
      initialRegion={region}
      initialSelected={selected}
      googleMapsKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() || ''}
      englishEnabled={locale!=='zh'}
    />
  );
}
