"use client";
import {useWebsiteText} from '@/i18n/context';
import { useSyncExternalStore } from 'react';
import { Bookmark } from 'lucide-react';
const key='china-unfold-saved';
const subscribe=(cb:()=>void)=>{window.addEventListener('storage',cb);window.addEventListener('saved-change',cb);return()=>{window.removeEventListener('storage',cb);window.removeEventListener('saved-change',cb);}};
const snapshot=()=>{try{return localStorage.getItem(key)||'[]';}catch{return '[]';}};
export function useSaved(){const value=useSyncExternalStore(subscribe,snapshot,()=> '[]');try{const parsed=JSON.parse(value);return Array.isArray(parsed)?parsed.filter((x:unknown)=>typeof x==='string') as string[]:[];}catch{return [] as string[];}}
export default function SaveButton({slug,label=false}:{slug:string;label?:boolean}){
  const t=useWebsiteText();const saved=useSaved();const active=saved.includes(slug);return <button className={label?'button outline save-label':'save-button'} aria-label={active?t("Remove from saved places"):t("Save this place")} aria-pressed={active} onClick={()=>{try{localStorage.setItem(key,JSON.stringify(active?saved.filter(s=>s!==slug):[...saved,slug]));window.dispatchEvent(new Event('saved-change'));}catch{alert(t("Your browser could not save this place. Please enable local storage."));}}}><Bookmark size={18} fill={active?'currentColor':'none'}/>{label&&(active?t("Saved to your places"):t("Save this place"))}</button>}
