import { redirect } from 'next/navigation';
import LoginScreen from '@/components/account/LoginScreen';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured, supabaseUrl, supabasePublishableKey } from '@/lib/supabase/config';
import { safeDestination } from '@/lib/account/navigation';
export const metadata={title:'Sign in',description:'Sign in or create an account to save your China trips and local guide requests.'};
export const dynamic='force-dynamic';
export default async function Login({searchParams}:{searchParams:Promise<{next?:string;error?:string;mode?:string}>}) {
  const query=await searchParams, next=safeDestination(query.next),configured=isSupabaseConfigured();let google=false,passwordStep=false;
  if(configured){
    try{const client=await createClient();const {data}=await client.auth.getUser();if(data.user){if(query.mode==='password')passwordStep=true;else redirect(next);}}catch(error){if(error instanceof Error&&error.message.includes('NEXT_REDIRECT'))throw error;}
    try{const response=await fetch(`${supabaseUrl}/auth/v1/settings`,{headers:{apikey:supabasePublishableKey||''},next:{revalidate:300},signal:AbortSignal.timeout(8000)});if(response.ok){const data=await response.json();google=data.external?.google===true;}}catch{/* Email login remains available when provider settings cannot be fetched. */}
  }
  return <LoginScreen configured={configured} google={google} next={next} initialError={query.error} passwordStep={passwordStep}/>;
}
