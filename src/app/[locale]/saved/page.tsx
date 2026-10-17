import {pageMetadata} from '@/i18n/metadata';
import type {Locale} from '@/i18n/locales';
import Directory from '@/components/travel/Directory';
export async function generateMetadata({params}:{params:Promise<{locale:Locale}>}){const {locale}=await params;return pageMetadata(locale,"/saved",locale==='zh'?"已收藏的地方":"Your saved places",locale==='zh'?"保存在此浏览器中的中国旅行目的地。":"");}
export default function Page(){return <div className="page-space"><Directory savedOnly/></div>}
