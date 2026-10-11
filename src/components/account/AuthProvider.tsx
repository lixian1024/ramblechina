'use client';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/supabase/config';

const AuthContext=createContext<{user:User|null;loading:boolean;error:string}>({user:null,loading:true,error:''});
export function AuthProvider({children}:{children:ReactNode}) {
  const [user,setUser]=useState<User|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState('');
  useEffect(()=>{
    if(!isSupabaseConfigured()){const timer=setTimeout(()=>{setLoading(false);setError('Account services are not configured.');},0);return()=>clearTimeout(timer);}
    let active=true;
    const client=createClient();
    void client.auth.getUser().then(({data,error})=>{if(active){setUser(data.user);setLoading(false);if(error&&error.name!=='AuthSessionMissingError')setError('Account services could not be reached. Please retry.');}}).catch(()=>{if(active){setLoading(false);setError('Account services could not be reached. Please retry.');}});
    const {data:{subscription}}=client.auth.onAuthStateChange((_event,session)=>{if(active){setUser(session?.user||null);setLoading(false);setError('');}});
    return()=>{active=false;subscription.unsubscribe();};
  },[]);
  return <AuthContext.Provider value={{user,loading,error}}>{children}</AuthContext.Provider>;
}
export function useAuth(){return useContext(AuthContext);}
