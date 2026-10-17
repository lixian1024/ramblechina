import { createClient } from '@/lib/supabase/server';
import { safeDestination } from '@/lib/account/navigation';
const redirect=(path:string)=>new Response(null,{status:303,headers:{Location:path,'Cache-Control':'private, no-store'}});

// Adapted from travelagent: PKCE exchange, with a restricted local return path.
export async function GET(request:Request) {
  const {searchParams}=new URL(request.url);
  const destination=safeDestination(searchParams.get('next'));
  const locale=destination.startsWith('/zh/')?'zh':'en';
  const code=searchParams.get('code');
  try {
    if (code) {
      const client=await createClient();
      const {error}=await client.auth.exchangeCodeForSession(code);
      if(!error)return redirect(searchParams.get('signup')==='1'?`/${locale}/login?mode=password&next=${encodeURIComponent(destination)}`:destination);
    }
  } catch { /* Return a recoverable error without exposing credentials or provider payloads. */ }
  return redirect(`/${locale}/login?next=${encodeURIComponent(destination)}&error=${encodeURIComponent('Sign-in could not be completed. Please try again.')}`);
}
