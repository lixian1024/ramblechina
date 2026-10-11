import {NextRequest,NextResponse} from 'next/server';
import {bestLocale,isLocale,isPlannedLocale,localizePath} from './i18n/locales';
import {publishedFor} from './i18n/publication';
import {updateSession} from './lib/supabase/proxy';
export async function proxy(request:NextRequest){
 const {pathname}=request.nextUrl;
 if(pathname.startsWith('/api/')||pathname.startsWith('/auth/'))return updateSession(request);
 if(pathname.startsWith('/_AMapService/')||pathname.startsWith('/_next/')||pathname.startsWith('/travel/')||pathname.startsWith('/fonts/')||pathname.includes('.'))return NextResponse.next();
 const segments=pathname.split('/').filter(Boolean);const first=segments[0];
 if(first&&isLocale(first)){const bare='/'+segments.slice(1).join('/');if(!publishedFor(first,bare==='/'?'/':bare)){const url=request.nextUrl.clone();url.pathname=localizePath(bare,'en');return NextResponse.redirect(url,307);}return updateSession(request);}
 if(first&&isPlannedLocale(first))return new NextResponse('This language edition is not published yet.',{status:404});
 const locale=pathname==='/'?bestLocale(request.headers.get('accept-language')):'en';const url=request.nextUrl.clone();url.pathname=localizePath(pathname,locale);return NextResponse.redirect(url,pathname==='/'?307:308);
}
export const config={matcher:['/((?!_AMapService/|_next/|travel/|fonts/|favicon.ico|.*\\..*).*)']};
