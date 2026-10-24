'use client';
import {useEffect,useState} from 'react';
import {usePathname} from 'next/navigation';
import Script from 'next/script';
import {recordPageView,type AnalyticsBrowser} from '@/lib/analytics';
import {chooseAnalytics,CONSENT_EVENT,CONSENT_KEY,readAnalyticsChoice,refreshAnalyticsChoice} from '@/lib/analytics-consent';
export function GoogleAnalyticsTracker({measurementId}:{measurementId:string}){
 const pathname=usePathname(),[accepted,setAccepted]=useState(false);
 useEffect(()=>{
  const update=()=>{const choice=readAnalyticsChoice()===true;(window as unknown as AnalyticsBrowser).__rambleAnalyticsConsent=choice;setAccepted(choice);};
  const storage=(event:StorageEvent)=>{if(event.key===CONSENT_KEY){const choice=refreshAnalyticsChoice();if(choice!==true)chooseAnalytics(false);update();}};update();
  window.addEventListener(CONSENT_EVENT,update);window.addEventListener('storage',storage);
  return()=>{window.removeEventListener(CONSENT_EVENT,update);window.removeEventListener('storage',storage);};
 },[]);
 useEffect(()=>{if(accepted){(window as unknown as Record<string,unknown>)[`ga-disable-${measurementId}`]=false;try{(window as unknown as AnalyticsBrowser).gtag?.('consent','update',{analytics_storage:'granted',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});}catch{/* A blocked tag must not interrupt the travel UI. */}recordPageView(window,measurementId,pathname);}},[accepted,measurementId,pathname]);
 return accepted?<Script id="ramble-google-analytics" src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`} strategy="afterInteractive"/>:null;
}
