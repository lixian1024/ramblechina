import {z} from 'zod';
import {packVenueById,packVenueForAlias} from './catalog';
import {calendarDate,tripDate,tripRequirements} from '../travel/trip-requirements';
import type {TripMessage} from '../travel/concierge-types';

const calendar=z.string().refine(calendarDate,'A valid calendar date is required.');
const plain=(max:number)=>z.string().trim().min(1).max(max).refine(value=>!/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value),'Control characters are not supported.');
const clock=z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);
const hotelSchema=z.object({name:plain(240),address:plain(500)}).strict();
const stopSchema=z.object({venueId:plain(100),nameEnglish:plain(240),nameChinese:plain(240),pinyin:plain(240),address:plain(500).optional(),sourceUrl:z.string().url().max(2000),reviewedAt:calendar,durationMinutes:z.number().int().min(1).max(1440),time:clock.optional(),booked:z.boolean(),bookingNote:plain(1000).optional()}).strict();
const baseSchema=z.object({schemaVersion:z.literal(1),locale:z.enum(['en','zh']),generatedAt:z.string().datetime({offset:true}),startDate:calendar,days:z.array(z.object({date:calendar,stops:z.array(stopSchema).min(1).max(30)}).strict()).min(1).max(3),warnings:z.array(plain(2000)).max(120),hotel:hotelSchema.optional()}).strict();
export const packDocumentSchema=baseSchema.superRefine((document,context)=>{
 document.days.forEach((day,index)=>{
  if(day.date!==tripDate(document.startDate,index)) context.addIssue({code:'custom',path:['days',index,'date'],message:'Dates must be consecutive from the start date.'});
  if(day.stops.reduce((sum,stop)=>sum+stop.durationMinutes,0)>1440)context.addIssue({code:'custom',path:['days',index,'stops'],message:'Saved stop durations exceed one calendar day.'});
  let earliestEnd=0;
  day.stops.forEach((stop,i)=>{
   const venue=packVenueById(stop.venueId);
   if(!venue || (['nameEnglish','nameChinese','pinyin','address','sourceUrl','reviewedAt'] as const).some(key=>stop[key]!==venue[key]))context.addIssue({code:'custom',path:['days',index,'stops',i],message:'Venue facts must match the independent catalog.'});
   if(venue?.closedMonday&&new Date(`${day.date}T12:00:00Z`).getUTCDay()===1)context.addIssue({code:'custom',path:['days',index,'stops',i],message:'Yu Garden interior conflicts with Monday closure; no date-specific exception is verified.'});
   const start=stop.time?Number(stop.time.slice(0,2))*60+Number(stop.time.slice(3)):earliestEnd;
   const end=Math.max(start,earliestEnd)+stop.durationMinutes;
   if(start<earliestEnd||end>1440)context.addIssue({code:'custom',path:['days',index,'stops',i,stop.time?'time':'durationMinutes'],message:'Saved visit times overlap or extend beyond the day.'});
   earliestEnd=end;
  });
 });
});
export type PackDocument=z.infer<typeof packDocumentSchema>;
const inputStop=z.object({name:plain(240),search:z.string().max(500).optional(),nameChinese:z.string().max(240).optional(),nameEnglish:z.string().max(240).optional(),durationMinutes:z.number().int().min(1).max(1440),at:z.union([clock,z.literal('')]).optional(),booked:z.boolean().optional(),bookingNote:z.string().max(1000).optional()});
const inputSnapshot=z.object({plan:z.object({startDate:z.string().optional(),days:z.array(z.object({city:plain(160),cityEnglish:z.string().optional(),date:calendar,stops:z.array(inputStop).min(1).max(30)})).min(1).max(3)}),messages:z.array(z.object({role:z.enum(['user','assistant']),text:z.string().max(24000),intent:z.enum(['route-concierge','travel-assistant','out-of-scope']).optional()})).max(40).optional()});
const shanghai=(value:string)=>/^(?:上海市?|shanghai)(?:\s*(?:上海市?|shanghai))?$/i.test(value.trim());
/** Whitelist projection: only catalog facts and explicit saved planning choices leave this function. */
export function preparePack(snapshot:unknown,locale:'en'|'zh',hotel?:{name:string;address:string},now=new Date().toISOString()):{document:PackDocument|null;issues:string[]}{
 const parsed=inputSnapshot.safeParse(snapshot);
 if(!parsed.success)return {document:null,issues:['A saved Shanghai itinerary with 1-3 dated days and supported stops is required.',...parsed.error.issues.map(issue=>`${issue.path.join('.')}: ${issue.message}`)]};
 const {plan,messages=[]}=parsed.data;
 const issues:string[]=[];
 const startDate=plan.startDate||plan.days[0].date;
 if(!calendarDate(startDate))issues.push('The saved start date is invalid.');
 if(!z.string().datetime({offset:true}).safeParse(now).success)issues.push('The document generation date is invalid.');
 if(locale!=='en'&&locale!=='zh')issues.push('Choose English or Chinese.');
 let explicitHotel:PackDocument['hotel'];
 if(hotel){const result=hotelSchema.safeParse(hotel);if(result.success)explicitHotel=result.data;else issues.push('Enter both a valid hotel name and address, or leave the optional hotel card empty.');}
 try{const requested=tripRequirements(messages as TripMessage[],undefined,new Date(now));if(requested.startDate&&requested.startDate!==startDate)issues.push(`The saved start date does not match the requested start date ${requested.startDate}.`);if(requested.days&&requested.days!==plan.days.length)issues.push('The saved day count does not match the requested day count.');}catch{issues.push('The requested trip date or day count is invalid.');}
 const warnings=locale==='zh'?['此文件保留已保存的地点顺序，不重新规划路线。时间和停留时长为行程建议，交通、用餐缓冲与开放时间未重新核实。','生成日期不等于事实核对日期。请出发前确认当前营业、门票、预约、证件及临时管控；地图链接和二维码需要网络。','已预约标记和备注是行程中的记录，不是票券或预约确认。']:['This file preserves your saved stop order; it does not replan the route. Times and durations are planning suggestions. Transport, meal buffers and opening times have not been revalidated.','The generation date is separate from fact review dates. Recheck current hours, tickets, reservations, identity requirements and temporary controls before travel. Map links and QR codes need internet.','Booking flags and notes are saved itinerary records, not tickets or reservation confirmations.'];
 const days:PackDocument['days']=plan.days.map((day,index)=>{
  if(!shanghai(day.city)||(day.cityEnglish&&!shanghai(day.cityEnglish)))issues.push(`Day ${index+1}: only Shanghai is supported.`);
  if(calendarDate(startDate)&&day.date!==tripDate(startDate,index))issues.push(`Day ${index+1}: dates must be consecutive from the saved start date.`);
  const stops:PackDocument['days'][number]['stops']=[];
  for(const [i,stop] of day.stops.entries()){
   const labels=[stop.name,stop.search,stop.nameChinese,stop.nameEnglish].filter((value):value is string=>Boolean(value?.trim()));
   const matches=labels.map(packVenueForAlias);
   const venue=matches[0];
   if(!venue||matches.some(match=>!match)){issues.push(`Day ${index+1}, stop ${i+1}: unsupported destination "${stop.name}". Confirm its exact supported venue identity.`);continue;}
   if(matches.some(match=>match?.id!==venue.id)){issues.push(`Day ${index+1}, stop ${i+1}: conflicting venue identity for "${stop.name}".`);continue;}
   const {id,nameEnglish,nameChinese,pinyin,address,sourceUrl,reviewedAt}=venue;
   stops.push({venueId:id,nameEnglish,nameChinese,pinyin,...(address?{address}:{}),sourceUrl,reviewedAt,durationMinutes:stop.durationMinutes,...(stop.at?{time:stop.at}:{}),booked:stop.booked===true,...(stop.bookingNote?.trim()?{bookingNote:stop.bookingNote.trim()}:{} )});
   const caution=`${nameEnglish} / ${nameChinese}: ${venue.note[locale]}`;
   if(!warnings.includes(caution))warnings.push(caution);
  }
  return {date:day.date,stops};
 });
 if(issues.length)return {document:null,issues};
 const result=packDocumentSchema.safeParse({schemaVersion:1,locale,generatedAt:now,startDate,days,warnings,...(explicitHotel?{hotel:explicitHotel}:{})});
 return result.success?{document:result.data,issues:[]}:{document:null,issues:result.error.issues.map(issue=>`${issue.path.join('.')}: ${issue.message}`)};
}
