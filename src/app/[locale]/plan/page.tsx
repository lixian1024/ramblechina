import type { Metadata } from 'next';
import Planner from '@/components/travel/Planner';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ city?: string; view?: string; trip?:string }>;
};

export async function generateMetadata({ params }: Pick<Props, 'params'>): Promise<Metadata> {
  const { locale } = await params;
  return locale === 'zh' ? {
    title: '行程规划 · 旅行助手与路线管家',
    description: '先了解想去的地方，再规划每天的安排。旅行助手与路线管家为你查询景点、核对 Google 地点和道路路线、高德公交与天气，并同步更新路线地图。',
  } : {
    title: 'Explore China with Travel Assistant and Route Concierge',
    description: 'Explore places and travel tips with Travel Assistant, then build and refine your route with Google places and road routes, plus Amap transit and weather checks.',
  };
}

export default async function Page({ params, searchParams }: Props) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  return <Planner key={`${locale}:${query.trip||'new'}`} tripId={query.trip} />;
}
