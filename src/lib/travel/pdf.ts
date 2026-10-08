import { PDFDocument, StandardFonts, rgb, PDFName, PDFString, PDFArray, pushGraphicsState, popGraphicsState, rectangle, clip, endPath, type PDFPage, type PDFFont } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { cities, findCity, photoFor, visualForDay, type City } from './data';
import type { TravelPlan } from './planner';
const W=595,H=842,M=45,green=rgb(.125,.239,.2),muted=rgb(.39,.44,.40),paper=rgb(.975,.97,.95),line=rgb(.81,.84,.80);
let fontBytes:Promise<Buffer>|undefined;
const safe=(s:string)=>s.replace(/[–—]/g,'-').replace(/[‘’]/g,"'").replace(/[“”]/g,'"').replace(/→/g,' > ');
export async function makePdf({kind,plan,preview=true}:{kind:'guide'|'itinerary';plan?:TravelPlan;preview?:boolean}){
 const doc=await PDFDocument.create();doc.registerFontkit(fontkit);const serif=await doc.embedFont(StandardFonts.TimesRoman);const sans=await doc.embedFont(StandardFonts.Helvetica);const bold=await doc.embedFont(StandardFonts.HelveticaBold);fontBytes??=readFile(path.join(process.cwd(),'public/fonts/NotoSansSC-Regular.otf'));const chinese=await doc.embedFont(new Uint8Array(await fontBytes),{subset:false});
 doc.setTitle(kind==='guide'?'Ramble China - Illustrated China Reference':'Ramble China - Your Journey');doc.setAuthor('Ramble China');doc.setSubject(preview?'Editorial preview':'Illustrated travel reference');
 function text(p:PDFPage,s:string,x:number,y:number,size=11,font:PDFFont=sans,color=green){p.drawText(safe(s),{x,y,size,font,color});}
 function paragraph(p:PDFPage,s:string,x:number,y:number,width=505,size=11,font:PDFFont=sans,color=muted){let row='';for(const word of safe(s).split(/\s+/)){const candidate=row?row+' '+word:word;if(font.widthOfTextAtSize(candidate,size)>width&&row){text(p,row,x,y,size,font,color);y-=size*1.55;row=word;}else row=candidate;}if(row){text(p,row,x,y,size,font,color);y-=size*1.55;}return y;}
 function page(label:string){const p=doc.addPage([W,H]);p.drawRectangle({x:0,y:0,width:W,height:H,color:paper});text(p,'RAMBLE CHINA',M,H-34,8,bold);text(p,label.toUpperCase(),M,25,7,sans,muted);text(p,String(doc.getPageCount()).padStart(2,'0'),W-M-15,25,8);p.drawLine({start:{x:M,y:45},end:{x:W-M,y:45},thickness:.5,color:line});return p;}
 function link(p:PDFPage,label:string,url:string,x:number,y:number,size=9){text(p,label,x,y,size,sans);const ann=doc.context.register(doc.context.obj({Type:'Annot',Subtype:'Link',Rect:[x,y-2,x+sans.widthOfTextAtSize(safe(label),size),y+size+3],Border:[0,0,0],A:{Type:'Action',S:'URI',URI:PDFString.of(url)}}));const annotations=p.node.lookupMaybe(PDFName.of('Annots'),PDFArray);if(annotations)annotations.push(ann);else p.node.set(PDFName.of('Annots'),doc.context.obj([ann]));}
 const cache=new Map<string,Awaited<ReturnType<typeof doc.embedJpg>>>();
 async function photograph(p:PDFPage,c:City,x:number,y:number,width:number,height:number,fit:'cover'|'contain'='cover'){if(!photoFor(c.slug))return;let img=cache.get(c.slug);if(!img){const b=await readFile(path.join(process.cwd(),'public',c.image));img=b[0]===137?await doc.embedPng(b):await doc.embedJpg(b);cache.set(c.slug,img);}const scale=(fit==='contain'?Math.min:Math.max)(width/img.width,height/img.height);const scaled={width:img.width*scale,height:img.height*scale};p.pushOperators(pushGraphicsState(),rectangle(x,y,width,height),clip(),endPath());p.drawImage(img,{x:x+(width-scaled.width)/2,y:y+(height-scaled.height)/2,width:scaled.width,height:scaled.height});p.pushOperators(popGraphicsState());}
 function credit(p:PDFPage,c:City,y=64){const ph=photoFor(c.slug);if(ph){paragraph(p,`Photo: ${ph.author} | ${ph.license}`,M,y,505,6.5,chinese);link(p,'Original photograph & licensing',ph.source,M,y-18,7);}}
 const cover=page(preview?'Editorial preview · September 2026':'September 2026 edition');const hero=kind==='itinerary'&&plan?findCity(plan.route[0])!:findCity('guilin')!;await photograph(cover,hero,0,210,W,485);cover.drawRectangle({x:0,y:0,width:W,height:240,color:green});text(cover,'Ramble China',M,755,45,serif);text(cover,kind==='guide'?'A deeper journey.':'Your journey, made clear.',M,170,37,serif,rgb(1,1,1));paragraph(cover,kind==='guide'?'The illustrated China travel reference. Places, people and practical details for a journey that feels like you.':`${plan!.input.days} days · ${plan!.input.people} travellers · ${plan!.route.map(s=>findCity(s)!.name).join(' / ')}`,M,128,490,13,sans,rgb(.85,.9,.85));text(cover,preview?'COMPLIMENTARY EDITORIAL PREVIEW':process.env.CONTENT_REVIEWED==='true'?'YOUR TRAVEL REFERENCE':'EDITORIAL DRAFT - NOT FOR SALE',M,60,8,bold,rgb(1,1,1));
 if(kind==='guide'){
 const selection=preview?cities.filter(c=>['beijing','shanghai','guilin'].includes(c.slug)):cities;
 const contentsPages:PDFPage[]=[];for(let offset=0;offset<selection.length;offset+=24){const p=page('Find your next chapter');contentsPages.push(p);text(p,'A country to discover.',M,755,34,serif);paragraph(p,'Begin with a place that speaks to you. These chapters are introductions, with practical prompts to help you plan more deeply.',M,710,490,11);selection.slice(offset,offset+24).forEach((c,i)=>{const y=642-i*22;text(p,c.name,M,y,12,serif);text(p,c.region,300,y,9,sans,muted);});}
 const intro=page('Before the journey');text(intro,'A little preparation.',M,755,36,serif);let y=700;for(const [title,body,url] of [
 ['Check entry requirements','Confirm requirements for your passport, route and stay with the official authorities before buying non-refundable travel. Hong Kong and Macao have separate entry arrangements.','https://en.nia.gov.cn/'],
 ['Keep the arrival details offline','Save your accommodation address in Chinese, reservation confirmations, first transfer, insurance details and emergency contacts. Carry more than one way to pay.','https://www.gov.cn/'],
 ['Think door to door','Check the exact station and airport on each ticket. Leave time for local transfers, security, check-in and rest. A train journey is only one part of a travel day.','https://www.12306.cn/en/index.html'],
 ['Travel thoughtfully','Ask before photographing people. Follow local guidance at temples and museums. For food allergies, carry a carefully translated explanation and confirm ingredients directly.',''],
 ] as const){text(intro,title,M,y,21,serif);y=paragraph(intro,body,M,y-30,500,11)-12;if(url){link(intro,'Official reference',url,M,y,9);y-=28;}else y-=15;}
 paragraph(intro,'This reference is an editorial planning draft. Opening hours, prices, transport schedules and reservations require current verification. Read linked sources before committing to bookings.',M,y,500,10);
 for(const [index,c] of selection.entries()){
 const p=page(c.name+' · '+c.province);const startPage=doc.getPageCount();const cp=contentsPages[Math.floor(index/24)];const cy=642-(index%24)*22;text(cp,String(startPage),510,cy,10);const ref=doc.context.register(doc.context.obj({Type:'Annot',Subtype:'Link',Rect:[M,cy-5,550,cy+16],Border:[0,0,0],Dest:[p.ref,'Fit']}));const arr=cp.node.lookupMaybe(PDFName.of('Annots'),PDFArray);if(arr)arr.push(ref);else cp.node.set(PDFName.of('Annots'),doc.context.obj([ref]));
 text(p,c.name,M,749,43,serif);text(p,c.chinese,M,710,16,chinese);text(p,c.province+' / '+c.region,245,713,10);await photograph(p,c,M,350,505,325);text(p,c.tagline.length>68?'Find your own rhythm.':c.tagline,M,313,22,serif);paragraph(p,c.description,M,278,505,12);text(p,`SUGGESTED STAY  ${c.days} days`,M,125,9,bold);paragraph(p,`WHEN TO GO  ${c.season}`,M,104,505,9);credit(p,c,76);

 // Flow complete city notes across pages; never assume a fixed chapter length.
 let sheet!:PDFPage;let yy=0;let currentSection='';
 function lineCount(value:string,width:number,size:number,font:PDFFont){let rows=1,row='';for(const word of safe(value).split(/\s+/)){const next=row?row+' '+word:word;if(row&&font.widthOfTextAtSize(next,size)>width){rows++;row=word;}else row=next;}return rows;}
 function newSheet(title:string,continued=false){currentSection=title;sheet=page(c.name+' · '+title);text(sheet,c.name.toUpperCase()+(continued?' / CONTINUED':''),M,763,9,bold);yy=paragraph(sheet,title,M,724,505,32,serif,green)-25;}
 function ensure(height:number){if(yy-height<70)newSheet(currentSection,true);}
 function block(title:string,body:string,meta?:string,url?:string){
  const height=lineCount(title,505,17,serif)*26.35+lineCount(body,505,10.5,sans)*16.275+(meta?15:0)+(url?20:0)+17;
  ensure(height);if(meta){text(sheet,meta.toUpperCase(),M,yy,7,bold,muted);yy-=15;}
  yy=paragraph(sheet,title,M,yy,505,17,serif,green)-5;yy=paragraph(sheet,body,M,yy,505,10.5)-8;
  if(url){link(sheet,'Find on map',url,M,yy,8);yy-=20;}yy-=4;
 }
 newSheet('Places worth your time.');
 const featured=c.highlights.map(h=>({h,visual:visualForDay(c,h.name)})).find(item=>item.visual.slug!==c.slug);
 if(featured){await photograph(sheet,featured.visual,M+215,yy-160,290,160,'contain');text(sheet,'A CLOSER LOOK',M,yy-12,7,bold,muted);const captionY=paragraph(sheet,featured.h.name,M,yy-42,190,22,serif,green)-10;paragraph(sheet,c.name+' / '+c.province,M,captionY,190,10);yy-=175;credit(sheet,featured.visual,yy);yy-=39;}
 yy=paragraph(sheet,'A starting collection, not a single-day checklist. Dedicated outings need their own travel time.',M,yy,505,10)-22;
 for(const [j,h] of c.highlights.entries())block(h.name,h.description,String(j+1).padStart(2,'0')+' / '+h.scope,'https://www.openstreetmap.org/search?query='+encodeURIComponent(h.name+' '+c.name));
 newSheet('At the table. Where to stay.');
 for(const item of c.guide.foods)block(item.name,item.description,'What to eat');
 for(const item of c.guide.areas)block(item.name,item.description,'Your base');

 newSheet('The practical chapter.');
 for(const item of c.guide.transport)block(item.name,item.description,'Transport');
 for(const item of c.guide.routes)block(item.name,item.description,'Time well spent');
 const sourceHeight=65+Math.ceil(c.guide.sources.length/2)*16;ensure(sourceHeight);
 text(sheet,'SOURCES & UPDATES',M,yy,8,bold);yy-=20;
 yy=paragraph(sheet,'Original editorial notes. References accessed '+c.guide.reviewedAt+'. Confirm current access, reservations and services with operators before booking.',M,yy,505,8)-10;
 for(const [i,source] of c.guide.sources.entries()){link(sheet,source.label,source.url,M+(i%2)*255,yy-Math.floor(i/2)*16,7.5);}

 }
 }else if(plan){
 const overview=page('Your journey at a glance');text(overview,'Room for discovery.',M,755,35,serif);let y=paragraph(overview,plan.route.map(s=>findCity(s)!.name).join('  >  '),M,708,500,20,serif)-20;y=paragraph(overview,`${plan.input.start} to ${plan.days.at(-1)?.date} | ${plan.input.people} travellers | Target CNY ${plan.input.budget}`,M,y,500,11)-20;y=paragraph(overview,`Planning estimate: CNY ${plan.estimated.low}-${plan.estimated.high} for the group. International flights excluded.`,M,y,500,14,bold)-20;y=paragraph(overview,'Assumptions: two travellers per room; CNY 280-750 per room/night; CNY 180-420 per person/day for food, local transport and sights; CNY 300-1,000 per person per intercity journey. One night per trip day is budgeted conservatively. These are planning assumptions, not live quotes.',M,y,500,10)-25;for(const warning of plan.warnings.slice(0,6)){y=paragraph(overview,warning,M,y,500,10)-16;}if(preview)paragraph(overview,'This free preview includes your first two days. The complete paid booklet is not yet on sale.',M,105,500,11);
 for(const d of preview?plan.days.slice(0,2):plan.days){const c=findCity(d.city)!;const p=page('Your personal itinerary');text(p,`DAY ${String(d.day).padStart(2,'0')} / ${d.date}`,M,761,10,bold);text(p,c.chinese,480,761,12,chinese);text(p,d.title,M,718,d.title.length>34?25:32,serif);const visual=d.field?.photo&&photoFor(d.field.photo)?{...c,slug:d.field.photo,image:photoFor(d.field.photo)!.file}:visualForDay(c,d.title);await photograph(p,visual,M,445,505,240);text(p,visual.slug===c.slug?'CITY VIEW / '+c.name.toUpperCase():'FEATURED PLACE / '+d.title.toUpperCase(),M,432,7,sans,muted);let y=411;for(const [label,body] of [['MORNING',d.morning],['AFTERNOON',d.afternoon],['EVENING',d.evening]]){text(p,label,M,y,8,bold);y=paragraph(p,body,M,y-21,505,11)-23;}credit(p,visual,78);
 if(d.field){
  const f=d.field;const fieldPage=page('Field notes / editorial draft');
  text(fieldPage,`DAY ${String(d.day).padStart(2,'0')} / ON THE GROUND`,M,761,9,bold);
  text(fieldPage,d.title,M,721,d.title.length>36?26:32,serif);
  await photograph(fieldPage,visual,M,535,505,155);
  text(fieldPage,'SHOW OR SEARCH THIS NAME',M,512,8,bold);
  text(fieldPage,f.mapQuery||f.chinese,M,478,22,chinese);
  if(f.mapQuery)link(fieldPage,'Open Chinese place search in Amap','https://uri.amap.com/search?keyword='+encodeURIComponent(f.mapQuery)+'&src=chinatravelagent&callnative=0',M,452,9);
  else text(fieldPage,'Confirm the exact station or hotel from your booking.',M,452,9,sans,muted);
  let fy=421;
  for(const [label,body] of [['ACCESS',f.access],['RESERVATION',f.booking],['TRAVEL TIME',f.travelTime],['LUGGAGE',f.luggage],['PLAN B',f.planB]]){
   text(fieldPage,label,M,fy,8,bold);fy=paragraph(fieldPage,body,M,fy-16,505,9,chinese)-15;
  }
  if(fy<120)throw Error('Field notes overflow the printable page.');
  text(fieldPage,`Average daily allowance: CNY ${Math.ceil(plan.estimated.low/plan.input.days)}-${Math.ceil(plan.estimated.high/plan.input.days)} for the group`,M,104,9,bold);
  text(fieldPage,'Planning average only. Live tickets, opening hours and routes are not checked.',M,88,7,sans,muted);
  credit(fieldPage,visual,70);
 }
 }
 }
 return doc.save();
}
