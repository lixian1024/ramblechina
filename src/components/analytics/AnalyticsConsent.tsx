'use client';
import {useEffect,useState} from 'react';
import {usePathname} from 'next/navigation';
import {chooseAnalytics,PREFERENCES_EVENT,readAnalyticsChoice} from '@/lib/analytics-consent';
import styles from './AnalyticsConsent.module.css';
export function AnalyticsPreferences({zh=false}:{zh?:boolean}){return <button type="button" className={styles.preferences} onClick={()=>window.dispatchEvent(new Event(PREFERENCES_EVENT))}>{zh?'分析偏好设置':'Analytics preferences'}</button>;}
export function AnalyticsConsent(){
 const pathname=usePathname(),zh=/^\/zh(?:\/|$)/.test(pathname),[open,setOpen]=useState(false);
 useEffect(()=>{const show=()=>setOpen(true);const timer=setTimeout(()=>setOpen(readAnalyticsChoice()===null),0);window.addEventListener(PREFERENCES_EVENT,show);return()=>{clearTimeout(timer);window.removeEventListener(PREFERENCES_EVENT,show);};},[]);
 if(!open)return null;
 function choose(value:boolean){chooseAnalytics(value);setOpen(false);}
 return <aside className={styles.banner} aria-label={zh?'可选分析偏好':'Optional analytics preferences'}><div><strong>{zh?'是否允许可选分析？':'Allow optional analytics?'}</strong><p>{zh?'我们仅在你同意后加载 Google Analytics，以了解页面及产品使用情况。拒绝不会影响规划和下载，必要的账户及草稿存储仍会使用。':'We load Google Analytics only with your permission to understand page and product usage. Rejecting keeps planning and downloads available; essential account and draft storage still operates.'} <a href={`/${zh?'zh':'en'}/privacy`}>{zh?'隐私政策':'Privacy policy'}</a></p></div><div className={styles.actions}><button onClick={()=>choose(false)}>{zh?'拒绝分析':'Reject analytics'}</button><button onClick={()=>choose(true)}>{zh?'允许分析':'Accept analytics'}</button></div></aside>;
}
