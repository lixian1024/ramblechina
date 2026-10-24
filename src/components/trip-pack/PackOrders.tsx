'use client';
import {useEffect,useState} from 'react';
import type {PackOrdersResponse,PackError} from '@/lib/trip-pack/api-types';
import {PackDownload} from './PackDownload';
import {packError} from './pack-copy';
import styles from './TripPack.module.css';
export function PackOrders({locale}:{locale:string}){
 const zh=locale==='zh';const [data,setData]=useState<PackOrdersResponse|null>(null),[error,setError]=useState(''),[reload,setReload]=useState(0);
 useEffect(()=>{let active=true;void fetch('/api/trip-pack/orders',{cache:'no-store'}).then(async response=>{const value=await response.json();if(!response.ok)throw Error(packError((value as PackError).error?.code,zh));if(active){setData(value);setError('');}}).catch(e=>{if(active)setError(e instanceof Error?e.message:packError(undefined,zh));});return()=>{active=false;};},[reload,zh]);
 return <section className={styles.orders}><h2>{zh?'旅行包与下载':'Trip Packs & downloads'}</h2><p>{zh?'私人文件仅向所属账户开放。删除行程或账户前，请先下载副本。':'Private files belong to this account. Download a copy before deleting a trip or your account.'}</p>{error?<div role="alert"><p>{error}</p><button className="button outline" onClick={()=>setReload(n=>n+1)}>{zh?'重试':'Retry'}</button></div>:!data?<p role="status">{zh?'正在加载旅行包…':'Loading your Trip Packs…'}</p>:data.orders.length===0?<p>{zh?'尚无旅行包，可从已保存行程开始。':'No Trip Packs yet. Start from one of your saved trips.'}</p>:data.orders.map(order=><article key={order.id}><strong>{zh?'测试订单 · 不收取真实款项':'Test order · no real money'}</strong><p>{order.id}</p><p>{order.state==='paid'?(zh?'测试付款已确认':'Test payment confirmed'):order.state==='pending'?(zh?'等待付款确认':'Awaiting payment confirmation'):order.state==='revoked'?(zh?'权限已撤销':'Access revoked'):(zh?'文件已准备好':'File prepared')}</p>{order.needsSupport&&<p>{packError('checkout_uncertain',zh)} <a href="mailto:service@ramblechina.com">service@ramblechina.com</a></p>}{order.canDownload&&order.state!=='revoked'&&<PackDownload orderId={order.id} locale={locale}/>}<a href={`/${locale}/trip-pack?trip=${encodeURIComponent(order.tripId)}&order=${encodeURIComponent(order.id)}`} referrerPolicy="no-referrer">{zh?'查看旅行包与状态 →':'Open Pack & status →'}</a></article>)}</section>;
}
