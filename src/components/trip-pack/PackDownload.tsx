'use client';
import {useState} from 'react';
import type {PackError,PackErrorCode} from '@/lib/trip-pack/api-types';
import {packError} from './pack-copy';
/** Private bytes are fetched in place so stale sessions and revoked files never replace the page with JSON. */
export function PackDownload({orderId,locale}:{orderId:string;locale:string}){
 const zh=locale==='zh';const [busy,setBusy]=useState(false),[error,setError]=useState<{code?:PackErrorCode}|null>(null);
 const statusPath=`/${zh?'zh':'en'}/trip-pack?order=${encodeURIComponent(orderId)}`;
 async function download(){
  setBusy(true);setError(null);
  try{
   const response=await fetch(`/api/trip-pack/download?order=${encodeURIComponent(orderId)}`,{cache:'no-store',redirect:'error'});
   if(!response.ok){let failure:PackError|undefined;try{failure=await response.json();}catch{/* Handle an unavailable gateway without exposing its response. */}setError({code:response.status===401?'sign_in':failure?.error?.code});return;}
   if(!response.headers.get('content-type')?.toLowerCase().startsWith('application/pdf')){setError({code:'invalid_file'});return;}
   const blob=await response.blob();if(await blob.slice(0,5).text()!=='%PDF-'){setError({code:'invalid_file'});return;}
   const objectUrl=URL.createObjectURL(blob);
   try{const link=document.createElement('a');link.href=objectUrl;link.download='china-trip-pack-test.pdf';document.body.appendChild(link);link.click();link.remove();}finally{setTimeout(()=>URL.revokeObjectURL(objectUrl),0);}
  }catch{setError({code:'unavailable'});}finally{setBusy(false);}
 }
 return <div><button className="button" type="button" disabled={busy} onClick={()=>void download()}>{busy?(zh?'正在下载…':'Downloading…'):(zh?'下载 PDF':'Download PDF')}</button>{error&&<div role="alert"><p>{packError(error.code,zh)}</p>{error.code==='sign_in'&&<a href={`/${zh?'zh':'en'}/login?next=${encodeURIComponent(statusPath)}`}>{zh?'重新登录':'Sign in again'}</a>} <a href={statusPath}>{zh?'查看订单状态':'Check order status'}</a> · <a href="mailto:service@ramblechina.com">service@ramblechina.com</a></div>}</div>;
}
