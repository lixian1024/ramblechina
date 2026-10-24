'use client';
import {useEffect,useState} from 'react';
import type {PackError,PackErrorCode,PackOrder,PackOrderResponse,PackPreviewResponse} from '@/lib/trip-pack/api-types';
import {PACK_POLICY_VERSION} from '@/lib/trip-pack/api-types';
import {recordGrowthEvent} from '@/lib/growth/analytics';
import {PackDownload} from './PackDownload';
import {packError,packIssue} from './pack-copy';
import styles from './TripPack.module.css';
function safeCheckoutUrl(value:string|null):string|null{try{if(!value)return null;const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password&&!url.port&&!url.search&&!url.hash&&['creem.io','www.creem.io'].includes(url.hostname)&&/^\/test\/checkout\/[^/]+\/[^/]+$/.test(url.pathname)?url.href:null;}catch{return null;}}
class RequestFailure extends Error{constructor(public code?:PackErrorCode,public issues:string[]=[]){super(code);}}
async function request<T>(url:string,body?:unknown):Promise<T>{
 const response=await fetch(url,{cache:'no-store',...(body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})});
 const data=await response.json();if(!response.ok){const failure=data as PackError;throw new RequestFailure(failure.error?.code,failure.issues);}return data;
}
export function PackWorkflow({locale,tripId,orderId,authReady,signedIn}:{locale:'en'|'zh';tripId?:string;orderId?:string;authReady:boolean;signedIn:boolean}){
 const zh=locale==='zh',c=(en:string,cn:string)=>zh?cn:en;
 const [preview,setPreview]=useState<PackPreviewResponse|null>(null),[order,setOrder]=useState<PackOrder|null>(null),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[failure,setFailure]=useState<RequestFailure|null>(null),[refresh,setRefresh]=useState(0),[accepted,setAccepted]=useState(false),[hotelName,setHotelName]=useState(''),[hotelAddress,setHotelAddress]=useState(''),[hotelDirty,setHotelDirty]=useState(false),[preparationFailed,setPreparationFailed]=useState(false),[clock,setClock]=useState(()=>Date.now());
 useEffect(()=>{
  if(!authReady||!signedIn||(!tripId&&!orderId))return;let active=true;
  const load=async()=>{
   try{
    setLoading(true);setAccepted(false);let statusOrder=orderId;
    if(tripId){const data=await request<PackPreviewResponse>(`/api/trip-pack?trip=${encodeURIComponent(tripId)}&locale=${locale}`);if(!active)return;setPreview(data);setOrder(data.order);setClock(Date.now());if(data.order?.state==='pending')statusOrder??=data.order.id;}
    if(statusOrder){const data=await request<PackOrderResponse>(`/api/trip-pack/status?order=${encodeURIComponent(statusOrder)}`);if(active){setOrder(data.order);setClock(Date.now());}}
    if(active)setFailure(null);
   }catch(error){if(active)setFailure(error instanceof RequestFailure?error:new RequestFailure());}
   finally{if(active)setLoading(false);}
  };void load();return()=>{active=false;};
 },[authReady,signedIn,tripId,orderId,locale,refresh]);
 const validConfig=preview?.config.mode==='test'&&preview.config.checkoutAvailable&&preview.config.amount===990&&preview.config.currency==='USD'&&preview.config.policyVersion===PACK_POLICY_VERSION;
 const expires=order?.expiresAt?Date.parse(order.expiresAt):NaN;
 const expired=order?.state==='paid'&&Number.isFinite(expires)&&expires<=clock;
 const currentPack=preview?.order;
 const newerCurrentPack=currentPack&&order&&currentPack.id!==order.id&&(currentPack.state==='prepared'||currentPack.state==='pending'||currentPack.state==='paid'&&currentPack.expiresAt&&Date.parse(currentPack.expiresAt)>clock)?currentPack:null;
 const canStartNewPurchase=expired&&!newerCurrentPack&&validConfig;
 const stalePrepared=order?.state==='prepared'&&(!preview?.preview||order.version!==preview.trip.version||order.locale!==locale||hotelDirty||preparationFailed);
 const readyForCheckout=order?.state==='prepared'&&validConfig&&preview?.preview&&!stalePrepared&&!loading&&!order.needsSupport&&failure?.code!=='checkout_uncertain';
 const resumeUrl=order?.state==='pending'&&!order.needsSupport&&!order.checkoutExpired&&validConfig?safeCheckoutUrl(order.checkoutUrl):null;
 useEffect(()=>{if(!Number.isFinite(expires)||expires<=Date.now())return;const timer=setTimeout(()=>setClock(Date.now()),Math.min(expires-Date.now(),2147483647));return()=>clearTimeout(timer);},[expires,clock]);
 function navigateCheckout(value:string){try{window.location.assign(value);}catch{setFailure(new RequestFailure('unavailable'));}}
 async function perform(action:'prepare'|'checkout'|'status'|'regenerate'){
  setBusy(true);setFailure(null);if(action==='prepare'){setAccepted(false);setPreparationFailed(true);}
  try{
   const hotel=hotelName.trim()||hotelAddress.trim()?{name:hotelName.trim(),address:hotelAddress.trim()}:undefined;
   const body=action==='prepare'?{tripId,version:preview?.trip.version,locale,...(hotel?{hotel}:{})}:action==='regenerate'?{orderId:order?.id,version:preview?.trip.version,locale,...(hotel?{hotel}:{})}:action==='checkout'?{orderId:order?.id,acceptedTerms:true,policyVersion:PACK_POLICY_VERSION}:undefined;
   const data=await request<PackOrderResponse>(`/api/trip-pack/${action}${action==='status'?`?order=${encodeURIComponent(order!.id)}`:''}`,body);setOrder(data.order);setClock(Date.now());
   if(action==='prepare'){setPreparationFailed(false);setHotelDirty(false);setHotelName('');setHotelAddress('');}
   if(action==='prepare'||action==='regenerate')recordGrowthEvent(action==='prepare'?'pack_prepared':'pack_regenerated',{locale,actor:'account'},{dedupeKey:`${data.order.id}:${data.order.revision}`});
   if(action==='checkout'&&data.order.checkoutUrl){const url=safeCheckoutUrl(data.order.checkoutUrl);if(!url)throw new RequestFailure('invalid_payment');recordGrowthEvent('pack_checkout_started',{locale,actor:'account'},{dedupeKey:data.order.id});navigateCheckout(url);}
  }catch(error){setFailure(error instanceof RequestFailure?error:new RequestFailure());}finally{setBusy(false);}
 }
 if(!authReady)return <p role="status">{c('Loading your account…','正在加载账户…')}</p>;
 if(!signedIn)return <p><a className="button" href={`/${locale}/login?next=${encodeURIComponent(`/${locale}/trip-pack${tripId?`?trip=${tripId}`:orderId?`?order=${orderId}`:''}`)}`}>{c('Sign in to open your private Trip Pack','登录查看私人旅行包')}</a></p>;
 if(!tripId&&!orderId)return <p>{c('Save an itinerary in the planner, then open its Trip Pack.','请先在规划器中保存行程，再打开旅行包。')} <a href={`/${locale}/plan`}>{c('Plan a trip →','规划行程 →')}</a></p>;
 return <section className={styles.workflow} aria-label={c('Your private Trip Pack','你的私人旅行包')}>
  <header><span className={styles.eyebrow}>{c('YOUR SAVED ITINERARY','已保存行程')}</span><h2>{c('Ready to take with you','把行程带在身边')}</h2><p>{c('US$9.90 once per saved itinerary · 90 days of updates from confirmed payment. Applicable tax is added at checkout.','每份已保存行程一次 US$9.90 · 自付款确认起可更新 90 天。适用税费在结账时另计。')}</p></header>
  {loading&&<p role="status">{c('Loading your saved trip…','正在加载已保存的行程…')}</p>}
  {failure&&<div role="alert" className={styles.notice}><p>{packError(failure.code,zh)}</p>{failure.issues.length>0&&<ul>{failure.issues.map((issue,i)=><li key={i}>{packIssue(issue,zh)}</li>)}</ul>}{failure.code!=='checkout_uncertain'&&<button className="button outline" disabled={busy||loading} onClick={()=>setRefresh(n=>n+1)}>{c('Retry','重试')}</button>} <a href="mailto:service@ramblechina.com">service@ramblechina.com</a></div>}
  {preview&&<><p className={styles.eyebrow}>{c('CURRENT SAVED TRIP PREVIEW','当前已保存行程预览')}</p><h3>{preview.trip.title}</h3>{preview.preview?<><div className={styles.days}>{preview.preview.days.map((day,i)=><article key={day.date}><h4>{c(`Day ${i+1}`,`第 ${i+1} 天`)} · {day.date}</h4><ol>{day.stops.map((stop,j)=><li key={j}>{zh?stop.nameChinese:stop.nameEnglish}{stop.time&&` · ${stop.time}`} · {stop.durationMinutes} {c('min','分钟')}</li>)}</ol></article>)}</div><div className={styles.cautions}>{preview.preview.warnings.map((warning,i)=><p key={i}>{warning}</p>)}</div></>:<div className={styles.notice}><p>{c('Your saved trip needs attention before a PDF can be prepared. No stops have been removed.','生成 PDF 前需要处理已保存行程中的问题。没有任何地点被删除。')}</p><ul>{preview.issues.map((issue,i)=><li key={i}>{packIssue(issue,zh)}</li>)}</ul></div>}
  <a href={`/${locale}/plan?trip=${encodeURIComponent(preview.trip.id)}`}>{c('Edit saved trip →','修改已保存行程 →')}</a>
  {preview.preview&&(!order||order.state==='prepared'||order.state==='paid'&&(order.canRegenerate&&!expired||canStartNewPurchase))&&<fieldset className={styles.hotel} disabled={busy||loading}><legend>{c('Optional private hotel card','可选私人酒店卡')}</legend><p>{c('Enter only what you want printed in your private PDF. Leave both fields empty to omit it. This is not sent to the planner or payment provider. When replacing a file, re-enter hotel details to include them; previous hotel details are not copied.','仅填写希望印入私人 PDF 的信息。不需要时请将两项留空。此信息不会发送给行程规划或支付服务商。替换文件时，如需酒店卡请重新填写；不会自动复制原文件的酒店信息。')}</p><label>{c('Hotel name','酒店名称')}<input maxLength={240} value={hotelName} onChange={e=>{setHotelName(e.target.value);setHotelDirty(true);}}/></label><label>{c('Hotel address','酒店地址')}<input maxLength={500} value={hotelAddress} onChange={e=>{setHotelAddress(e.target.value);setHotelDirty(true);}}/></label></fieldset>}
  {!validConfig&&<p className={styles.notice}>{c('Checkout is unavailable. Public sales are closed; only invited testers can use test checkout.','结账暂不可用。尚未开放正式销售，仅受邀测试账户可使用测试结账。')}</p>}
  </>}
  {order&&<div className={styles.order}><p className={styles.eyebrow}>{c('TEST ORDER · NO REAL MONEY','测试订单 · 不收取真实款项')}</p><p>{c('Order reference: ','订单编号：')}{order.id}</p>
   {order.needsSupport&&<p role="alert">{packError('checkout_uncertain',zh)}</p>}
   {order.state==='revoked'?<p>{packError('revoked',zh)}</p>:order.state==='pending'?order.checkoutExpired?<p role="alert">{c('This hosted checkout has expired. Contact service@ramblechina.com with your order reference. Do not start another purchase until we confirm the next step.','此托管结账已过期。请将订单编号发送至 service@ramblechina.com；在确认下一步前，请勿再次购买。')}</p>:order.needsSupport||!safeCheckoutUrl(order.checkoutUrl)?<p role="alert">{packError('checkout_uncertain',zh)}</p>:<p role="status">{packError('payment_pending',zh)}</p>:order.state==='paid'?<><p role="status">{c('Test payment confirmed. No real money was charged.','测试付款已确认，未收取真实款项。')}</p><p>{expired?c('The update window has ended. Your last available PDF is retained.','更新期已结束，最后一份可用 PDF 仍保留。'):order.canRegenerate?c('Updates are available until ','可更新至 '):c('Updates are temporarily unavailable. Your paid window has not ended; no new purchase is needed. Window ends ','更新暂不可用。付费更新期尚未结束，无需重新购买。更新期截止：')}{!expired&&order.expiresAt?new Date(order.expiresAt).toLocaleString(zh?'zh-CN':'en-US',{timeZoneName:'short'}):''}</p></>:<><p>{c(`Prepared PDF: saved version ${order.version}, ${order.locale==='zh'?'Chinese':'English'}.`,`已准备 PDF：已保存版本 ${order.version}，${order.locale==='zh'?'中文':'英文'}。`)}</p>{stalePrepared?<p role="alert">{c('Your saved trip has changed, or this prepared PDF is older or in another language. Prepare an updated PDF before checkout. Hotel edits and failed replacements are not included in the previous file.','已保存行程发生变化，或已准备 PDF 为旧版本或其他语言。请先更新 PDF 再结账。酒店修改和未成功的替换不会写入原文件。')}</p>:<p>{c('Your file is prepared. Read the policies before test checkout.','文件已准备好，请在测试结账前阅读相关政策。')}</p>}</>}
   {order.canDownload&&order.state!=='revoked'&&<PackDownload orderId={order.id} locale={locale}/>}
   {resumeUrl&&<button className="button" disabled={busy||loading} onClick={()=>navigateCheckout(resumeUrl)}>{c('Resume test checkout','继续原测试结账')}</button>}
   {order.state==='pending'&&<button className="button outline" disabled={busy||loading} onClick={()=>void perform('status')}>{c('Refresh payment status','刷新付款状态')}</button>}
   {order.canRegenerate&&!expired&&preview?.preview&&order.state==='paid'&&<button className="button outline" disabled={busy||loading} onClick={()=>void perform('regenerate')}>{c('Update PDF from saved trip','从已保存行程更新 PDF')}</button>}
   {order.state==='prepared'&&validConfig&&preview?.preview&&<button className="button outline" disabled={busy||loading} onClick={()=>void perform('prepare')}>{c('Prepare updated PDF','更新已准备 PDF')}</button>}
   {readyForCheckout&&<><label className={styles.accept}><input type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)}/><span>{c('I agree to the ','我同意')}<a href={`/${locale}/terms`} target="_blank" rel="noreferrer">{c('Terms','服务条款')}</a>{c(' and ','及')}<a href={`/${locale}/refunds`} target="_blank" rel="noreferrer">{c('Refund policy','退款政策')}</a>{c('. One-time US$9.90 plus applicable tax; this checkout is test only.','。一次 US$9.90，另加适用税费；本次仅为测试结账。')}</span></label><button className="button" disabled={busy||!accepted} onClick={()=>void perform('checkout')}>{c('Continue to test checkout','继续测试结账')}</button></>}
  </div>}
  {newerCurrentPack&&<p>{c('A current Trip Pack already exists for this trip. Continue there before starting another purchase.','此行程已有当前旅行包，请先在其中继续操作，避免重复购买。')} <a href={`/${locale}/trip-pack?trip=${encodeURIComponent(newerCurrentPack.tripId)}&order=${encodeURIComponent(newerCurrentPack.id)}`}>{c('Open current Trip Pack','打开当前旅行包')}</a></p>}
  {canStartNewPurchase&&preview?.preview&&<div className={styles.notice}><p>{c('Start a fresh US$9.90 test purchase for this saved trip. Prepare a new file and accept the policies again. Your previous file remains in My account. No real money is charged.','为此已保存行程发起一次新的 US$9.90 测试购买。请准备新文件并重新同意政策。原文件仍保留在我的账户，不收取真实款项。')}</p><button className="button" disabled={busy||loading} onClick={()=>void perform('prepare')}>{c('Prepare new test purchase · US$9.90','准备新的测试购买 · US$9.90')}</button></div>}
  {!order&&validConfig&&preview?.preview&&<button className="button" disabled={busy||loading} onClick={()=>void perform('prepare')}>{c('Prepare my PDF','准备我的 PDF')}</button>}
  {busy&&<p role="status">{c('Please wait… Your previous file remains available.','请稍候…原文件仍然可用。')}</p>}
  <p><a href={`/${locale}/account`}>{c('My account & downloads →','我的账户与下载 →')}</a></p>
 </section>;
}
