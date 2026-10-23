import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {Header,Footer} from '@/components/travel/Shell';
import {LocaleProvider} from '@/i18n/context';
import {isLocale,publishedLocales} from '@/i18n/locales';
import {publishedFor} from '@/i18n/publication';
import {AuthProvider} from '@/components/account/AuthProvider';
import {GoogleAnalytics} from '@/components/analytics/GoogleAnalytics';
import '../globals.css';
export function generateStaticParams(){return publishedLocales.map(locale=>({locale}))}
export async function generateMetadata({params}:{params:Promise<{locale:string}>}):Promise<Metadata>{const {locale}=await params;return {verification:{google:'FWASTJrgDmflNftUofn2cJyTbE4orjujvKJCWaCkNQA',other:{'msvalidate.01':'77F6395A8B2DDA45390035910D761C17'}},icons:{icon:'/brand/ramble-mark.svg'},title:{default:locale==='ko'?'Ramble China — 더 깊은 중국 여행':locale==='zh'?'Ramble China — 展开中国之旅':'Ramble China — A deeper journey',template:'%s | Ramble China'},description:locale==='ko'?'처음 만나는 중국 여행을 위한 시각적 가이드와 실용적인 여행 카드.':locale==='zh'?'面向初次来华旅行者的可视化旅行参考与实用地点卡。':'Discover China through illustrated destination guides and thoughtful itineraries.'}}
export default async function Layout({children,params}:{children:React.ReactNode;params:Promise<{locale:string}>}){const {locale}=await params;if(!isLocale(locale)||!publishedFor(locale,'/'))notFound();return <html lang={locale==='zh'?'zh-CN':'en'}><body><LocaleProvider locale={locale}><AuthProvider><a className="skip-link" href="#main">{locale==='zh'?'跳到主要内容':'Skip to content'}</a><Header/><main id="main">{children}</main><Footer/></AuthProvider></LocaleProvider><GoogleAnalytics/></body></html>}
