import {ImageResponse} from 'next/og';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {findCity} from '@/lib/travel/data';
import {findTravelTip, travelTipView} from '@/content/travel-tips';

export const runtime = 'nodejs';
type Context = {params: Promise<{locale: string; key: string}>};

// Only known public content may enter an image; no free-form query text or trip data.
export async function GET(_request: Request, {params}: Context) {
  const {locale, key: filename} = await params;
  if ((locale !== 'en' && locale !== 'zh') || !filename.endsWith('.png')) return new Response('Not found', {status: 404});
  // The extension also keeps this resource outside the locale-redirect proxy.
  const key = filename.slice(0, -4);
  const zh = locale === 'zh';
  let title = zh ? '初次来华，从容出发' : 'Your first China trip, with room to wander.';
  let eyebrow = zh ? '旅行规划与实用指南' : 'CHINA TRIP PLANNER & PRACTICAL GUIDES';
  if (key.startsWith('city-')) {
    const city = findCity(key.slice(5));
    if (!city) return new Response('Not found', {status: 404});
    title = zh ? `${city.chinese}，初次到访参考` : `${city.name}, for your first visit.`;
    eyebrow = zh ? '目的地旅行指南' : 'A RAMBLE CHINA DESTINATION GUIDE';
  } else if (key.startsWith('guide-')) {
    const guide = findTravelTip(key.slice(6));
    if (!guide) return new Response('Not found', {status: 404});
    title = travelTipView(guide, locale).title;
    eyebrow = zh ? '官方来源 · 实用步骤' : 'OFFICIAL SOURCES · PRACTICAL STEPS';
  } else if (key !== 'home' && key !== 'general') return new Response('Not found', {status: 404});

  const font = await readFile(join(process.cwd(), 'public/fonts/RambleOG-Subset.otf'));
  return new ImageResponse(
    <div style={{display:'flex',width:'100%',height:'100%',background:'#f4f3eb',color:'#173e30',fontFamily:'Ramble OG',padding:'52px 64px',flexDirection:'column',justifyContent:'space-between'}}>
      <div style={{display:'flex',alignItems:'center',gap:18}}><div style={{display:'flex',alignItems:'center',justifyContent:'center',width:62,height:62,border:'2px solid #173e30',borderRadius:16,fontSize:43}}>R</div><div style={{display:'flex',fontSize:30,letterSpacing:-1}}>Ramble China</div></div>
      <div style={{display:'flex',flexDirection:'column',marginTop:24}}><div style={{display:'flex',fontSize:18,color:'#637b64',letterSpacing:2,marginBottom:22}}>{eyebrow}</div><div style={{display:'flex',fontSize:zh?58:64,lineHeight:1.15,letterSpacing:zh?0:-2,maxWidth:1040}}>{title}</div></div>
      <div style={{display:'flex',width:'100%',alignItems:'center',justifyContent:'space-between',marginTop:28,borderTop:'1px solid #b8c6b3',paddingTop:22,fontSize:19,color:'#4f6957'}}><span>ramblechina.com</span><span>{zh?'规划 · 修改 · 看懂路线':'Plan · Revise · Understand your route'}</span></div>
    </div>,
    {width:1200,height:630,fonts:[{name:'Ramble OG',data:font,weight:400,style:'normal'}],headers:{'Cache-Control':'public, max-age=86400'}},
  );
}
