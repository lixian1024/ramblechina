import {PolicyPage} from '@/components/trip-pack/PolicyPage';
export async function generateMetadata({params}:{params:Promise<{locale:string}>}){const {locale}=await params;return {title:locale==='zh'?'服务条款':'Terms of service',referrer:'no-referrer' as const};}
export default async function Page({params}:{params:Promise<{locale:string}>}){const {locale}=await params;return <PolicyPage kind="terms" locale={locale}/>;}
