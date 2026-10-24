import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {PDFDocument,PDFName,PDFString,PDFArray,rgb,type PDFPage} from 'pdf-lib';
import {createRequire} from 'node:module';
import {Readable} from 'node:stream';
import QRCode from 'qrcode';
import {packDocumentSchema,type PackDocument} from './model';

type LegacyFontkit=Parameters<PDFDocument['registerFontkit']>[0];
type LegacyFont=ReturnType<LegacyFontkit['create']>;
type ModernSubset={includeGlyph(glyph:unknown):number;encode():Uint8Array;cff?:unknown};
const upstreamFontkit=createRequire(import.meta.url)('fontkit') as {create(data:Uint8Array):Omit<LegacyFont,'createSubset'>&{createSubset():ModernSubset}};
// fontkit 2.0.4 has the CFF fixes; pdf-lib expects its older stream serialization API.
const packFontkit:LegacyFontkit={create(data){
 const font=upstreamFontkit.create(data);const createSubset=font.createSubset.bind(font);
 return Object.assign(font,{createSubset(){
  const subset=createSubset();
  return Object.assign(subset,{encodeStream:()=>Readable.from([subset.encode()])});
 }});
}};

const WIDTH=420,HEIGHT=595,MARGIN=32,BOTTOM=44,CONTENT=WIDTH-MARGIN*2;
const ink=rgb(.12,.24,.2),muted=rgb(.34,.39,.36),accent=rgb(.56,.28,.17),rule=rgb(.82,.85,.81),paper=rgb(.986,.982,.966);
const clean=(value:string)=>value.normalize('NFC').replace(/[–—‑]/g,'-').replace(/\t/g,' ');
/** Local deterministic export. No research, supplier lookups, model calls or route generation. */
export async function renderPackPdf(input:PackDocument,preview=false):Promise<Uint8Array>{
 const document=packDocumentSchema.parse(input);
 const pdf=await PDFDocument.create();pdf.registerFontkit(packFontkit);
 const font=await pdf.embedFont(await readFile(path.join(process.cwd(),'public/fonts/NotoSansSC-Regular.otf')),{subset:true});
 const characterSet=new Set(font.getCharacterSet());
 const zh=document.locale==='zh';
 const t=(en:string,chinese:string)=>zh?chinese:en;
 pdf.setTitle(t('China Trip Pack / Shanghai','中国旅行包 / 上海'));pdf.setAuthor('Ramble China');pdf.setSubject('Private saved itinerary / independent editorial sources');
 pdf.setCreationDate(new Date(document.generatedAt));pdf.setModificationDate(new Date(document.generatedAt));
 let page!:PDFPage;let y=0,section='';
 const raw=(text:string,x:number,at:number,size=11,color=ink)=>{
  const value=clean(text);
  for(const char of value)if(!characterSet.has(char.codePointAt(0)!)&&char!=='\n')throw new Error(`The PDF font does not support character U+${char.codePointAt(0)!.toString(16).toUpperCase()}. Edit that character and retry.`);
  page.drawText(value,{x,y:at,size,font,color});
 };
 const addPage=(label=section,continued=false)=>{
  if(!continued)section=label;
  if(continued)label+=t(' / continued',' / 续');page=pdf.addPage([WIDTH,HEIGHT]);page.drawRectangle({x:0,y:0,width:WIDTH,height:HEIGHT,color:paper});
  raw('RAMBLE CHINA / CHINA TRIP PACK',MARGIN,HEIGHT-24,7.2,muted);
  raw(preview?t('PREVIEW / not a ticket','预览 / 非票券'):t('PRIVATE / not a ticket','私人文件 / 非票券'),MARGIN,22,7,muted);
  raw(String(pdf.getPageCount()).padStart(2,'0'),WIDTH-MARGIN-14,22,8,muted);
  page.drawLine({start:{x:MARGIN,y:35},end:{x:WIDTH-MARGIN,y:35},color:rule,thickness:.6});
  y=HEIGHT-57;
  if(label){raw(label,MARGIN,y,9,accent);y-=23;}
 };
 const ensure=(height:number)=>{if(y-height<BOTTOM)addPage(section,true);};
 const lines=(text:string,size:number,width:number)=>{
  const result:string[]=[];
  for(const source of clean(text).split('\n')){
   if(!source){result.push('');continue;}
   let line='';
   for(const char of source){
    if(line&&font.widthOfTextAtSize(line+char,size)>width){
     const split=line.lastIndexOf(' ');
     if(split>line.length*.4){result.push(line.slice(0,split));line=line.slice(split+1)+char;}
     else{result.push(line);line=char;}
    }else line+=char;
   }
   if(line)result.push(line.trimEnd());
  }
  return result;
 };
 const paragraph=(text:string,size=11,width=CONTENT,color=ink)=>{
  for(const line of lines(text,size,width)){ensure(size*1.5);if(line)raw(line,MARGIN,y,size,color);y-=size*1.5;}
  y-=7;
 };
 const heading=(text:string,size=21)=>{ensure(size*2+10);paragraph(text,size,CONTENT,ink);};
 const link=(label:string,url:string,size=10)=>{
  ensure(size*1.5+10);raw(label,MARGIN,y,size,accent);
  const annotation=pdf.context.register(pdf.context.obj({Type:'Annot',Subtype:'Link',Rect:[MARGIN,y-3,MARGIN+Math.min(CONTENT,font.widthOfTextAtSize(clean(label),size)),y+size+3],Border:[0,0,0],A:{Type:'Action',S:'URI',URI:PDFString.of(url)}}));
  const arr=page.node.lookupMaybe(PDFName.of('Annots'),PDFArray);if(arr)arr.push(annotation);else page.node.set(PDFName.of('Annots'),pdf.context.obj([annotation]));y-=size*1.5+8;
 };
 addPage(t('YOUR SAVED PLAN','您保存的行程'));
 heading(t('Shanghai, ready to carry.','随身携带的上海行程。'),26);
 paragraph(`${document.startDate} - ${document.days.at(-1)!.date}`,17);
 paragraph(t(`${document.days.length} day${document.days.length>1?'s':''} / ${document.days.reduce((sum,day)=>sum+day.stops.length,0)} saved stops`,`${document.days.length}天 / ${document.days.reduce((sum,day)=>sum+day.stops.length,0)}个已保存停留`),11,CONTENT,muted);
 paragraph(t('Offline destination cards, your saved sequence, and checks before you go.','离线目的地卡片、已保存的顺序，以及出发前待确认事项。'),13);
 paragraph(t('Generated: ','文件生成：')+document.generatedAt.slice(0,10),10,CONTENT,muted);
 paragraph(t('Fact review dates appear beside each source. This is a planning document; entry, tickets, bookings and live navigation are not included.','每项来源均标有事实核对日期。这是一份规划文件；不包含入场、门票、预约或实时导航。'),11);
 for(const warning of document.warnings.slice(0,3))paragraph(warning,10.5,CONTENT,muted);
 for(const [dayIndex,day] of document.days.entries()){
  addPage(t(`DAY ${dayIndex+1} / SAVED SEQUENCE`,`第${dayIndex+1}天 / 已保存顺序`));heading(day.date,23);
  paragraph(t('Times and durations below are saved planning suggestions. Check travel and meal buffers separately.','以下时间和停留时长为已保存的规划建议。请另行确认交通和用餐缓冲。'),10,CONTENT,muted);
  for(const [stopIndex,stop] of day.stops.entries()){
   ensure(83);heading(`${dayIndex+1}.${stopIndex+1}  ${zh?stop.nameChinese:stop.nameEnglish}`,16);
   paragraph(zh?stop.nameEnglish:stop.nameChinese,12);
   paragraph((stop.time||t('Time to choose','时间待定'))+t(` / ${stop.durationMinutes} min suggested`,` / 建议停留${stop.durationMinutes}分钟`),10.5,CONTENT,muted);
   if(stop.booked)paragraph(t('Booking marked in your itinerary; confirm the actual ticket.','行程中标记已预约；请确认实际票券。'),10,CONTENT,accent);
  }
 }
 addPage(t('BEFORE YOU GO / CHECKLIST','出发前 / 确认清单'));heading(t('Check, then travel.','确认后再出发。'),23);
 for(const [index,warning] of document.warnings.entries())paragraph(`${index+1}. ${warning}`,10.5,CONTENT,muted);
 const seen=new Set<string>();
 for(const day of document.days)for(const stop of day.stops){
  if(seen.has(stop.venueId))continue;seen.add(stop.venueId);
  addPage(t('DESTINATION CARD / SHOW FOR DIRECTIONS','目的地卡片 / 可出示问路'));
  heading(stop.nameChinese,26);heading(stop.nameEnglish,19);paragraph(stop.pinyin,10.5,CONTENT,muted);
  paragraph(t('Please help me find this place.','请问这个地方怎么走？'),14);
  if(stop.address){paragraph(t('Source-listed address / confirm the entrance','来源所列地址 / 请确认入口'),9.5,CONTENT,muted);paragraph(stop.address,13);}
  else paragraph(t('A specific entrance and street address have not been independently confirmed. Search the Chinese destination name; confirm the correct meeting point.','尚未独立确认具体入口与街道地址。请搜索中文目的地名称，并确认准确集合地点。'),10.5,CONTENT,muted);
  const appearances=document.days.flatMap((entry,index)=>entry.stops.filter(candidate=>candidate.venueId===stop.venueId).map(candidate=>({candidate,index,date:entry.date})));
  for(const {candidate,index,date} of appearances){
   paragraph(t(`Day ${index+1} / ${date} / `,`第${index+1}天 / ${date} / `)+(candidate.time||t('time to choose','时间待定'))+t(` / ${candidate.durationMinutes} min suggested`,` / 建议停留${candidate.durationMinutes}分钟`),10);
   paragraph(t('Saved booking status: ','行程预约标记：')+(candidate.booked?t('marked booked; not independently confirmed','已预约；未独立核实'):t('not marked booked','未标记已预约')),10,CONTENT,muted);
   if(candidate.bookingNote)paragraph(t('Your saved booking note: ','您保存的预约备注：')+candidate.bookingNote,10.5);
  }
  const mapUrl='https://uri.amap.com/search?'+new URLSearchParams({keyword:stop.nameChinese,city:'310000',src:'ramblechina',callnative:'0'}).toString();
  const backupMapUrl='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent('上海 '+stop.nameChinese);
  ensure(114);
  const qrTop=y;
  const qr=await pdf.embedPng(await QRCode.toBuffer(mapUrl,{type:'png',width:240,margin:4,errorCorrectionLevel:'M'}));
  page.drawImage(qr,{x:WIDTH-MARGIN-78,y:y-78,width:78,height:78});
  paragraph(t('AMAP / ONLINE NAME SEARCH','高德 / 在线名称搜索'),9,CONTENT-92,accent);
  for(const line of lines(t('Scan with another device. The QR and link search this name; they are not verified directions.','可用另一台设备扫描。二维码与链接用于名称搜索，并非已核实导航。'),9.5,CONTENT-92)){raw(line,MARGIN,y,9.5,muted);y-=14;}
  y=Math.min(y,qrTop-88);
  link(t('Open Amap name search','打开高德名称搜索'),mapUrl);
  link(t('Google Maps backup search','Google 地图备用搜索'),backupMapUrl);
  paragraph(t('Official source / reviewed ','官方来源 / 核对日期 ')+stop.reviewedAt,9.5,CONTENT,muted);
  link(t('Open official source','打开官方来源'),stop.sourceUrl);
  paragraph(stop.sourceUrl,8,CONTENT,muted);
 }
 if(document.hotel){
  addPage(t('YOUR HOTEL RETURN CARD','您的酒店返回卡'));heading(t('Return to my hotel.','请带我回酒店。'),24);
  paragraph(t('Entered by you. This address and the legal drop-off point have not been verified.','由您自行填写。此地址与合法下客点未经核实。'),11,CONTENT,muted);
  heading(document.hotel.name,18);paragraph(document.hotel.address,16);
  paragraph(t('Please confirm the destination and fare with the driver. This card does not arrange transport.','请与司机确认目的地和车费。此卡片不提供交通预订。'),11,CONTENT,muted);
 }
 const bytes=await pdf.save();
 if(bytes.length>2*1024*1024)throw new Error('The PDF exceeds the 2 MiB export limit. Shorten optional notes and retry.');
 return bytes;
}
