import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {isLocale} from '@/i18n/locales';
import {publicShare} from '@/lib/sharing/store';
import {SharedItinerary} from '@/components/travel/SharedItinerary';
export const dynamic='force-dynamic';
export const metadata:Metadata={title:'Shared itinerary',description:'A read-only published itinerary snapshot.',robots:{index:false,follow:false,nocache:true},referrer:'no-referrer'};
export default async function SharedTripPage({params}:{params:Promise<{locale:string;token:string}>}){
 const {locale,token}=await params;if(!isLocale(locale))notFound();const zh=locale==='zh';
 let share;
 try{share=await publicShare(token);}catch{return <article style={{maxWidth:800,margin:'3rem auto',padding:'1.5rem'}}><h1>{zh?'暂时无法载入分享行程':'Sharing is temporarily unavailable'}</h1><p>{zh?'请稍后刷新重试。此错误不代表链接已被撤销。':'Refresh to retry later. This error does not mean the owner revoked this link.'}</p></article>;}
 if(!share)notFound();
 return <article style={{maxWidth:800,margin:'3rem auto',padding:'1.5rem',overflowWrap:'anywhere'}}><h1>{zh?'分享的行程':'Shared itinerary'}</h1><p>{zh?'只读快照，发布于':'Read-only snapshot, published'} <time dateTime={share.publishedAt}>{new Date(share.publishedAt).toISOString().replace('T',' ').slice(0,19)} UTC</time>.</p><p>{zh?'保存的修改不会自动更新此链接。地点、营业时间、交通与预约未重新验证，请出行前确认。此页面展示所有者确认公开的停留列表和不确定性提示。':'Saved edits do not automatically update this link. Venue facts, hours, transport and reservations have not been revalidated; confirm them before travel. This page shows the reviewed stop list and uncertainty summaries.'}</p><SharedItinerary snapshot={share.snapshot} locale={locale}/></article>;
}
