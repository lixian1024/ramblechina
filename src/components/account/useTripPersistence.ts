'use client';
import type {Locale} from '@/i18n/locales';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { TripMessage, VerifiedTrip } from '@/lib/travel/concierge-types';
import { storedMessages, storedTrip } from '@/lib/travel/trip-storage';
import type { SavedTrip, TripSnapshot } from '@/lib/account/trips';
import {recordGrowthEvent} from '@/lib/growth/analytics';

export function useTripPersistence(tripId:string|undefined,busy:boolean,enabled=true,locale:Locale='en') {
  const [messages,setMessages]=useState<TripMessage[]>([]),[plan,setPlan]=useState<VerifiedTrip|null>(null);
  const [ready,setReady]=useState(false),[loadError,setLoadError]=useState(''),[saveError,setSaveError]=useState('');
  const [saveState,setSaveState]=useState<'idle'|'saving'|'saved'|'unsaved'>('idle'),[retry,setRetry]=useState(0);
  const [savedFingerprint,setSavedFingerprint]=useState(''),[conflict,setConflict]=useState(false);
  const identity=useRef({id:tripId||'',version:0,generation:0});
  const committed=useRef(''),latest=useRef<TripSnapshot>({plan:null,messages:[]});
  const flight=useRef(false),blocked=useRef(false),mounted=useRef(true);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  const [loadedPlan,setLoadedPlan]=useState<VerifiedTrip|null>(null);
  const [savedTripId,setSavedTripId]=useState(tripId||'');
  useEffect(()=>{
    if(!enabled)return;
    let active=true;
    const controller=new AbortController();
    const timer=setTimeout(()=>{
      if(!tripId){setReady(true);return;}
      void fetch(`/api/trips/${encodeURIComponent(tripId)}`,{cache:'no-store',signal:controller.signal}).then(async response=>{const data=await response.json();if(!response.ok)throw Error(data.error);return data as SavedTrip;}).then(data=>{
        if(!active)return;
        const snapshot={plan:storedTrip(data.snapshot.plan),messages:storedMessages(data.snapshot.messages)};
        identity.current={id:data.id,version:data.version,generation:identity.current.generation};committed.current=JSON.stringify(snapshot);setSavedFingerprint(committed.current);
        setMessages(snapshot.messages);setPlan(snapshot.plan);setLoadedPlan(snapshot.plan);setReady(true);setSaveState('saved');
      }).catch(error=>{if(active){setLoadError(error instanceof Error?error.message:'This trip could not be loaded.');}});
    },0);
    return()=>{active=false;controller.abort();clearTimeout(timer);};
  },[tripId,enabled]);
  const restoreDraft=useCallback((draft:TripSnapshot)=>{
    const restored={plan:storedTrip(draft.plan),messages:storedMessages(draft.messages)};
    // Keep one identity for the display and refresh guard, as on an account load.
    setMessages(restored.messages);setPlan(restored.plan);setLoadedPlan(restored.plan);
  },[]);
  const snapshot=useMemo(()=>({plan:storedTrip(plan),messages:storedMessages(messages.slice(-40))}),[plan,messages]);
  useEffect(()=>{latest.current=snapshot;},[snapshot]);
  const flush=useCallback(async()=>{
    if(!enabled||flight.current||blocked.current||!ready||busy)return;
    const snapshot=latest.current,serialized=JSON.stringify(snapshot);
    if((!snapshot.plan&&!snapshot.messages.length)||serialized===committed.current)return;
    if(!identity.current.id)identity.current.id=crypto.randomUUID();
    const target={...identity.current};flight.current=true;setSaveState('saving');setSaveError('');
    try{
      const response=await fetch(target.version?`/api/trips/${target.id}`:'/api/trips',{method:target.version?'PATCH':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:target.id,version:target.version,snapshot}),signal:AbortSignal.timeout(20000)});
      const data=await response.json();
      if(!response.ok){if(response.status===409){blocked.current=true;setConflict(true);}throw Error(data.error||'This trip could not be saved.');}
      if(!mounted.current||target.generation!==identity.current.generation)return;
      identity.current.version=data.version;committed.current=serialized;setSavedFingerprint(serialized);
      window.history.replaceState(null,'',`/${locale}/plan?trip=${target.id}`);setSavedTripId(target.id);
      recordGrowthEvent('itinerary_saved',{locale:locale==='zh'?'zh':'en',actor:'account',operation:'save'},{dedupeKey:target.id});
      setSaveState(JSON.stringify(latest.current)===serialized?'saved':'unsaved');
    }catch(error){if(mounted.current&&target.generation===identity.current.generation){setSaveState('unsaved');setSaveError(error instanceof Error?error.message:'Your changes could not be saved. Keep this page open and retry.');}}
    finally{flight.current=false;}
  },[ready,busy,enabled,locale]);
  useEffect(()=>{
    if(!enabled||!ready||busy||saveError)return;
    const timer=setTimeout(()=>void flush(),700);return()=>clearTimeout(timer);
  },[messages,plan,ready,busy,flush,saveState,saveError,retry,enabled]);
  useEffect(()=>{
    if(!enabled)return;
    const warn=(event:BeforeUnloadEvent)=>{if(JSON.stringify(latest.current)!==committed.current&&(latest.current.plan||latest.current.messages.length)){event.preventDefault();event.returnValue='';}};
    window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);
  },[enabled]);
  function reset(){identity.current={id:'',version:0,generation:identity.current.generation+1};setSavedTripId('');committed.current='';blocked.current=false;setConflict(false);setSavedFingerprint('');setMessages([]);setPlan(null);setLoadedPlan(null);setSaveState('idle');setSaveError('');window.history.replaceState(null,'',`/${locale}/plan`);}
  function retrySave(){if(blocked.current)return;setSaveError('');setRetry(value=>value+1);}
  const dirty=enabled&&JSON.stringify(snapshot)!==savedFingerprint&&Boolean(snapshot.plan||snapshot.messages.length);
  return {messages,setMessages,plan,setPlan,restoreDraft,ready:!enabled||ready,loadError,loadedPlan,saveState,saveError,retrySave,saveNow:flush,reset,conflict,dirty,savedTripId};
}
