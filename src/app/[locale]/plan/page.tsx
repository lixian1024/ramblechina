import type { Metadata } from 'next';
import Planner from '@/components/travel/Planner';
import LegacyPlanner from '@/components/travel/LegacyPlanner';
import { productPrice } from '@/lib/travel/commerce';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ city?: string; view?: string }>;
};

export async function generateMetadata({ params }: Pick<Props, 'params'>): Promise<Metadata> {
  const { locale } = await params;
  return locale === 'zh' ? {
    title: '行程规划 · 旅行助手与路线管家',
    description: '先了解想去的地方，再规划每天的安排。旅行助手与路线管家为你查询景点、核对高德地点、交通与天气，并同步更新路线地图。',
  } : {
    title: 'Explore China with Travel Assistant and Route Concierge',
    description: 'Explore places and travel tips with Travel Assistant, then build and refine your route with Amap place, transport and weather checks.',
  };
}

export default async function Page({ params, searchParams }: Props) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  if (locale === 'en' && query.view === 'classic') return <><div className="page-intro wrap"><span className="eyebrow">THE ORIGINAL PLANNER</span><h1>Where curiosity<br />becomes a journey.</h1><p>A curated route draft and a two-day PDF preview.</p><a className="text-link" href="?">Open Route Concierge →</a></div><LegacyPlanner initialCity={query.city} price={await productPrice('itinerary')} /></>;
  return <Planner key={locale} amapJsKey={process.env.AMAP_JS_API_KEY?.trim() || ''} amapEnglishEnabled={locale !== 'zh' && process.env.AMAP_JS_ENGLISH_ENABLED === 'true'} />;
}
