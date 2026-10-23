'use client';
import {useLocale,useWebsiteText} from '@/i18n/context';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import {recordGrowthEvent} from '@/lib/growth/analytics';
import {analyticsMeasurementId,DEFAULT_GA_MEASUREMENT_ID} from '@/lib/analytics';

const AuthContext=createContext<{user:User|null;loading:boolean;error:string}>({user:null,loading:true,error:''});
export function AuthProvider({children}:{children:ReactNode}) {
  const t=useWebsiteText(),locale=useLocale();
  const signupClaims=useRef(new Map<string,Promise<boolean>>());
  const [user,setUser]=useState<User|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState('');
  useEffect(()=>{
    if(!isSupabaseConfigured()){const timer=setTimeout(()=>{setLoading(false);setError(t("Account services are not configured."));},0);return()=>clearTimeout(timer);}
    let active=true;
    const client=createClient();
    void client.auth.getUser().then(({data,error})=>{if(active){setUser(data.user);setLoading(false);if(error&&error.name!=='AuthSessionMissingError')setError(t("Account services could not be reached. Please retry."));}}).catch(()=>{if(active){setLoading(false);setError(t("Account services could not be reached. Please retry."));}});
    const {data:{subscription}}=client.auth.onAuthStateChange((_event,session)=>{if(active){setUser(session?.user||null);setLoading(false);setError('');}});
    return()=>{active=false;subscription.unsubscribe();};
  },[t]);
  const userId=user?.id,confirmedAt=user?.email_confirmed_at;
  useEffect(()=>{
    if(!userId||!confirmedAt||!analyticsMeasurementId(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID??DEFAULT_GA_MEASUREMENT_ID,process.env.NODE_ENV)||
      window.location.protocol!=='https:'||!['www.ramblechina.com','ramblechina.com'].includes(window.location.hostname))return;
    let active=true;
    // Sharing a pending promise avoids losing the one-time server receipt on Strict Mode replay.
    let pending=signupClaims.current.get(userId);
    if(!pending){
      pending=fetch('/api/analytics/signup',{method:'POST',cache:'no-store',signal:AbortSignal.timeout(10_000)})
        .then(async response=>response.ok&&(await response.json()).newSignup===true)
        .catch(()=>{signupClaims.current.delete(userId);return false;});
      signupClaims.current.set(userId,pending);
    }
    void pending.then(newSignup=>{
      if(active&&newSignup)recordGrowthEvent('sign_up',{locale:locale==='zh'?'zh':'en',actor:'account',operation:'signup'},{dedupeKey:userId});
    });
    return()=>{active=false;};
  },[userId,confirmedAt,locale]);
  return <AuthContext.Provider value={{user,loading,error}}>{children}</AuthContext.Provider>;
}
export function useAuth(){return useContext(AuthContext);}
