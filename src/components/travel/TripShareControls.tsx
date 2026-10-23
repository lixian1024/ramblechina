'use client';
import {useEffect,useRef,useState} from 'react';
import type {Locale} from '@/i18n/locales';
import {recordGrowthEvent} from '@/lib/growth/analytics';
import {sharedSnapshotSchema,type SharedSnapshot} from '@/lib/sharing/snapshot';
import {SharedItinerary} from './SharedItinerary';
import styles from './TripShareControls.module.css';
type Props={tripId:string;locale:Locale};
export function TripShareControls(props:Props){return <Controls key={props.tripId} {...props}/>;}
function Controls({tripId,locale}:Props){
 const zh=locale==='zh';const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[confirmed,setConfirmed]=useState(false),[published,setPublished]=useState(false),[publishedAt,setPublishedAt]=useState<string|null>(null),[preview,setPreview]=useState<SharedSnapshot|null>(null),[link,setLink]=useState(''),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const live=useRef(true);useEffect(()=>{live.current=true;return()=>{live.current=false;};},[]);
 async function load(){
  setOpen(true);setBusy(true);setError('');setConfirmed(false);
  try{const response=await fetch(`/api/trips/${tripId}/share`,{cache:'no-store'});const body=await response.json();if(!response.ok)throw new Error();if(!live.current)return;setPublished(body.published===true);setPublishedAt(typeof body.publishedAt==='string'?body.publishedAt:null);const parsed=sharedSnapshotSchema.safeParse(body.preview);setPreview(parsed.success?parsed.data:null);}
  catch{if(live.current)setError(zh?'分享设置暂时无法载入，请重试。':'Sharing settings could not be loaded. Please retry.');}
  finally{if(live.current)setBusy(false);}
 }
 async function mutate(method:'POST'|'DELETE'){
  if(method==='POST'&&(!confirmed||!preview))return;
  setBusy(true);setError('');setNotice('');if(method==='POST')setLink('');
  try{
   const response=await fetch(`/api/trips/${tripId}/share`,{method,headers:method==='POST'?{'Content-Type':'application/json'}:undefined,body:method==='POST'?JSON.stringify({confirmed:true,locale}):undefined});
   const body=await response.json();if(!response.ok)throw new Error();if(!live.current)return;
   setConfirmed(false);
   if(method==='POST'){
    if(typeof body.path!=='string'||!/^\/(en|zh)\/shared\/[A-Za-z0-9_-]{43}$/.test(body.path))throw new Error();
    setPublished(true);setPublishedAt(body.publishedAt);setLink(typeof window==='undefined'?body.path:new URL(body.path,window.location.origin).href);setNotice(zh?'新链接已发布，旧链接已失效。':'New link published. Earlier links no longer work.');recordGrowthEvent('share_created',{locale:zh?'zh':'en',actor:'account',operation:'share'});
   }else{if(published||link)recordGrowthEvent('share_revoked',{locale:zh?'zh':'en',actor:'account',operation:'share'});setPublished(false);setPublishedAt(null);setLink('');setNotice(zh?'链接已撤销。':'Link revoked.');}
  }catch{if(live.current)setError(zh?'分享设置未能更新，请重试。若发布响应丢失，可再次发布新链接或撤销。':'Sharing could not be updated. Please retry. If a publication response was lost, publish a new link or revoke.');}
  finally{if(live.current)setBusy(false);}
 }
 return <div className={styles.controls}>
  <button type="button" onClick={()=>open?setOpen(false):void load()} aria-expanded={open}>{zh?'分享行程':'Share itinerary'}</button>
  {open&&<section className={styles.panel} aria-label={zh?'分享设置':'Sharing settings'}>
   <button type="button" onClick={()=>setOpen(false)}>{zh?'关闭':'Close'}</button>
   <h3>{zh?'发布只读快照':'Publish a read-only snapshot'}</h3>
   <p>{zh?'只分享已保存的城市、日期、景点顺序、时长与固定的不确定性提示。私人安排理由、酒店、地址、预订备注、照片和对话不在分享字段中。城市和景点名称是公开文本，请检查下方预览，移除私人信息后再分享。':'Only saved cities, dates, stop order, durations and fixed uncertainty summaries are shared. Personal reasons, hotels, addresses, booking notes, photos and conversations are not sharing fields. City and stop names are public text; review the preview and remove private details before sharing.'}</p>
   <p>{zh?'保存的修改不会自动更新分享。每次发布会生成新链接并使旧链接失效。链接只返回一次；丢失后请重新发布。':'Saved edits do not update the public snapshot. Each publication creates a new link and disables the previous one. The link is returned once; publish again if you lose it.'}</p>
   {published&&<p>{zh?'当前快照发布于：':'Current snapshot published: '}{publishedAt?new Date(publishedAt).toLocaleString(zh?'zh-CN':'en-GB'):''}</p>}
   {preview&&<details><summary>{zh?'检查公开内容预览':'Review public content preview'}</summary><SharedItinerary snapshot={preview} locale={locale}/></details>}
   {!busy&&!preview&&!error&&<p>{zh?'请先保存有效行程。':'Save a valid itinerary before publishing.'}</p>}
   <label className={styles.disclosure}><input type="checkbox" checked={confirmed} disabled={busy||!preview} onChange={event=>setConfirmed(event.target.checked)}/><span>{zh?'我已检查预览，并理解任何持有链接的人都能查看其中的城市、日期和行程，直到我撤销链接。':'I reviewed the preview and understand anyone with the link can read its cities, dates and itinerary until I revoke it.'}</span></label>
   <div className={styles.actions}><button type="button" disabled={busy||!confirmed||!preview} onClick={()=>void mutate('POST')}>{zh?'发布新链接':'Publish new link'}</button><button type="button" disabled={busy} onClick={()=>void mutate('DELETE')}>{zh?'撤销链接':'Revoke link'}</button><button type="button" disabled={busy} onClick={()=>void load()}>{zh?'刷新预览':'Refresh preview'}</button></div>
   {busy&&<p role="status">{zh?'正在更新…':'Working…'}</p>}
   {link&&<label className={styles.link}>{zh?'分享链接（选中并复制）':'Share link (select and copy)'}<input aria-label="Share link" readOnly value={link} onFocus={event=>event.target.select()}/></label>}
   {notice&&<p role="status">{notice}</p>}{error&&<p role="alert">{error}</p>}
  </section>}
 </div>;
}
