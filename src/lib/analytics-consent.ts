import type {AnalyticsBrowser} from './analytics';
export const CONSENT_KEY='ramble-analytics-choice';
export const CONSENT_EVENT='ramble-analytics-choice';
export const PREFERENCES_EVENT='ramble-analytics-preferences';
const pageChoices=new WeakMap<object,boolean>();
export function readAnalyticsChoice():boolean|null{
 if(pageChoices.has(window))return pageChoices.get(window)!;
 try{const value=window.localStorage.getItem(CONSENT_KEY);return value==='accepted'?true:value==='rejected'?false:null;}catch{return null;}
}
/** A cross-tab storage event supersedes this page's explicit previous choice. */
export function refreshAnalyticsChoice():boolean|null{pageChoices.delete(window);return readAnalyticsChoice();}
/** The persisted value is a choice, without identifiers or timestamps. */
export function chooseAnalytics(accepted:boolean){
 const browser=window as unknown as AnalyticsBrowser;
 pageChoices.set(window,accepted);
 browser.__rambleAnalyticsConsent=accepted;
 try{window.localStorage.setItem(CONSENT_KEY,accepted?'accepted':'rejected');}catch{/* Choice still applies for this page when storage is unavailable. */}
 if(!accepted){
  const id=browser.__rambleAnalytics?.measurementId;
  if(id){(window as unknown as Record<string,unknown>)[`ga-disable-${id}`]=true;try{browser.gtag?.('consent','update',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});}catch{/* A blocked tag cannot prevent withdrawal. */}}
  for(const raw of document.cookie.split(';')){
   const name=raw.trim().split('=')[0];if(!/^_ga(?:_|$)/.test(name))continue;
   for(const domain of ['',window.location.hostname,`.${window.location.hostname}`,'.ramblechina.com','ramblechina.com'])document.cookie=`${name}=; Max-Age=0; Path=/;${domain?` Domain=${domain};`:''} SameSite=Lax; Secure`;
  }
  // Google instruments this array's push method. Next Script caches its bootstrap,
  // so preserve the array/function identities while discarding all queued data.
  if(browser.dataLayer)browser.dataLayer.length=0;
  if(browser.__rambleAnalytics){
   browser.__rambleAnalytics.lastPage='';
   // The removed config may still have been waiting for a slow Google bootstrap.
   // Reassert it on renewed consent; send_page_view:false prevents automatic views.
   browser.__rambleAnalytics.needsConfiguration=true;
  }
 }
 window.dispatchEvent(new Event(CONSENT_EVENT));
}
