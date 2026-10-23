import {calendarDate, tripDate, tripRequirements} from './trip-requirements';
import type {DraftDay, DraftStop, DraftTrip, TripMessage, VerifiedStop, VerifiedTrip} from './concierge-types';

/** Curated operator policy, not a live opening-hours or holiday feed. */
export const yuGardenAccessRule = {
  id:'shanghai-yu-garden-interior', city:'上海',
  sourceUrl:'https://www.yugarden.com.cn/Page/ArticleView/articleDetail1523.html',
  sourceTitle:'Yu Garden management · recurring Monday closure notice',
  publishedAt:'2019-11-18', effectiveFrom:'2019-12-02', reviewedAt:'2026-10-23',
  closedWeekday:1,
  policy:'The garden interior is closed on Mondays except national holidays. No date-specific official exception has been verified by this curated rule. Do not infer a holiday exception or opening hours.',
} as const;
export class VenueAccessError extends Error {}
/** Public recovery text never contains model output or raw traveller prose. */
export function venueAccessFailure(locale:string){return locale==='zh'
  ?`豫园内园的参观安排与官方周一闭园规则存在冲突，或必须保留的预约尚未满足。已有行程未改变。请确认参观日期、预约及当天例外公告后重试；不要假定节假日一定开放。官方来源：${yuGardenAccessRule.sourceUrl}（公告 ${yuGardenAccessRule.publishedAt}；核对 ${yuGardenAccessRule.reviewedAt}）。`
  :`The Yu Garden interior visit conflicts with the operator’s Monday closure policy, or a required booking could not be preserved. Your existing itinerary is unchanged. Confirm the visit date, reservation and any official date-specific exception before retrying. Official source: ${yuGardenAccessRule.sourceUrl} (notice ${yuGardenAccessRule.publishedAt}; reviewed ${yuGardenAccessRule.reviewedAt}).`;}
const clean=(value:string)=>value.normalize('NFKC').toLowerCase().replace(/[\s()（）·—－-]/g,'');
const interiorAliases=new Set(['豫园','上海豫园','豫园内园','上海豫园内园','豫园古典园林','Yu Garden','YuGarden','Yuyuan Garden','Yu Yuan Garden','Shanghai Yu Garden','Yuyuan Classical Garden'].map(clean));
const isShanghai=(city:string)=>/^(?:上海市?|shanghai)(?:\s*(?:上海市?|shanghai))?$/i.test(city.trim());
type Identity=Pick<DraftStop,'name'|'search'|'nameChinese'|'nameEnglish'> & {place?:Pick<NonNullable<VerifiedStop['place']>,'name'>};
export function isYuGardenInterior(stop:Identity){return [stop.name,stop.search,stop.nameChinese,stop.nameEnglish,stop.place?.name].some(value=>Boolean(value&&interiorAliases.has(clean(value))));}
function mentionsInterior(text:string){
  const withoutBazaar=text.replace(/\b(?:yu\s*garden|yuyuan)\s+(?:bazaar|market|old\s+street)\b|豫园(?:商城|商场|市场|老街)/gi,'');
  return /\b(?:yu\s*garden|yu\s+yuan\s+garden|yuyuan\s+(?:garden|classical\s+garden))\b|豫园/i.test(withoutBazaar);
}
/** Explicit changes to this venue only; negated changes keep the held constraint. */
export function venueBookingChangeRequested(text:string):'cancel'|'reschedule'|undefined{
  if(!mentionsInterior(text))return;
  if(/[?？]|\b(?:do i|do we|should i|should we|would i|would we|need to)\b|是否|需要.*吗|要不要/i.test(text))return;
  if(/(?:do not|don't|never|不要|别|不能|请勿)\s*(?:want\s+to\s+)?(?:cancel|remove|skip|exclude|reschedul\w*|move|change|取消|删除|移除|改期|改签|调整|修改|更改)/i.test(text))return;
  const named=text.replace(/\b(?:shanghai\s+)?(?:yu\s*garden|yu\s+yuan\s+garden|yuyuan\s+(?:garden|classical\s+garden))\b|上海豫园|豫园/gi,'VENUE');
  if(/\b(?:do not|don't)\s+(?:want\s+to\s+)?(?:visit|include|go\s+to)\s+(?:(?:the|my)\s+)?VENUE\b/i.test(named))return 'cancel';
  if(/\b(?:cancel|remove|skip|exclude|avoid|delete)\s+(?:(?:my|our|the|a|an|visit\s+to|booking\s+(?:at|for)|reservation\s+(?:at|for))\s+){0,4}VENUE\b|(?:取消|删除|移除|删掉|不要|不去)(?:我(?:的)?|我们(?:的)?|去|到|参观)?\s*VENUE|VENUE.{0,30}(?:is cancelled|has been cancelled|已取消)/i.test(named))return 'cancel';
  if(/\b(?:reschedul\w*|move|change)\b.{0,40}VENUE|(?:调整|修改|更改|改期|改签|移动).{0,12}VENUE|VENUE.{0,12}(?:预约|票).{0,12}(?:调整|修改|更改|改期|改签|改到)/i.test(named))return 'reschedule';
}
export function venueCandidateBlocked(search:string,city:string,date?:string){
  return isShanghai(city)&&isYuGardenInterior({name:search,search})&&Boolean(date&&calendarDate(date)&&date>=yuGardenAccessRule.effectiveFrom&&new Date(`${date}T12:00:00Z`).getUTCDay()===yuGardenAccessRule.closedWeekday);
}
export function venueAccessContext(messages:TripMessage[],previous:unknown){
  return {calendar:tripRequirements(messages,previous),rules:[yuGardenAccessRule],exceptionEvidence:[],instructions:'Apply only to the exact Shanghai garden interior, not Yuyuan Bazaar, shops, restaurants or the surrounding streets. Never guess national-holiday exceptions. Keep held bookings with an explicit source-linked access conflict; never silently drop a requested must-visit. Unbooked blocked visits must be repaired or fail.'};
}
function dateForDay(plan:Pick<DraftTrip,'startDate'|'days'>,day:DraftDay,index:number,messages:TripMessage[],previous:unknown){
  const requestedStart=tripRequirements(messages,previous).startDate;
  const old=previous&&typeof previous==='object'?previous as Partial<DraftTrip>:undefined;
  const oldDate=Array.isArray(old?.days)?old.days[index]?.date:undefined;
  if(!requestedStart&&calendarDate(oldDate))return oldDate;
  const start=requestedStart||plan.startDate;
  return start&&calendarDate(start)?tripDate(start,index):calendarDate(day.date)?day.date:undefined;
}
function requirement(messages:TripMessage[],previous:unknown){
  let must=false,held=false;
  const currentChange=venueBookingChangeRequested(messages.filter(message=>message.role==='user').at(-1)?.text||'');
  for(const message of messages){
    if(message.role!=='user')continue;
    for(const sentence of message.text.split(/(?<=[.!?。！？;；])\s*/)){
      if(!mentionsInterior(sentence))continue;
      const change=venueBookingChangeRequested(sentence);
      if(change==='cancel'){must=false;held=false;continue;}
      if(change==='reschedule')must=true;
      if(/must|include|keep|visit|一定|必须|包含|保留|想去/i.test(sentence))must=true;
      const negated=/\b(?:not|not yet|never|haven't|have not)\s+(?:been\s+)?booked\b|\b(?:do not|don't|never|haven't|have not)\s+(?:have|hold|buy|bought)\b|\bhave\s+(?:no|not|never)\s+(?:(?:a|any)\s+)?(?:tickets?|reservations?)\b|\bwithout\s+(?:a\s+)?(?:ticket|reservation)|没有.{0,20}(?:票|预约)|未(?:预约|购票)|尚未预约|还没|没买|没订/i.test(sentence);
      const question=/[?？]|\b(?:do i|do we|should i|should we|need to|need a)\b|需要.*吗|是否|要不要/i.test(sentence);
      if(!negated&&!question&&/\bbooked\b|held\s+ticket|\b(?:i|we)\s+(?:already\s+)?(?:have|hold)\s+(?:(?:a|an|our|my|the|confirmed|valid|booked|paid|yu\s*garden|yuyuan|for|at)\s+){0,6}tickets?\b|(?:have|hold|confirmed|existing)\s+(?:an?\s+)?reservation\b|reservation\s+(?:is\s+)?confirmed|已预约|订了|已购票|有.*票/i.test(sentence)){must=true;held=true;}
    }
  }
  const old=previous&&typeof previous==='object'?previous as Partial<DraftTrip>:undefined;
  const bookings=currentChange==='cancel'?[]:(Array.isArray(old?.days)?old.days:[]).flatMap((day,index)=>(Array.isArray(day?.stops)?day.stops:[]).filter(stop=>stop?.booked&&isYuGardenInterior(stop)).map(stop=>({stop,day,index})));
  return {must:currentChange==='cancel'?false:must||bookings.length>0,held:currentChange==='cancel'?false:held||bookings.length>0,bookings:currentChange==='reschedule'?[]:bookings};
}
const issue=(date:string,detail:string)=>`Yu Garden interior on ${date}: ${detail} Official standing rule: Monday closure except national holidays; no date-specific official exception is verified. Source ${yuGardenAccessRule.sourceUrl} (notice ${yuGardenAccessRule.publishedAt}; reviewed ${yuGardenAccessRule.reviewedAt}). Do not invent an exception or silently substitute the bazaar.`;

/** Independent of Shanghai layout/pace checks; also applies to every old-plan edit. */
export function venueAccessIssues(plan:DraftTrip,messages:TripMessage[],previous:unknown):string[]{
  const issues:string[]=[];
  const required=requirement(messages,previous);
  const visits=plan.days.flatMap((day,index)=>isShanghai(day.city)?day.stops.filter(isYuGardenInterior).map(stop=>({stop,day,index,date:dateForDay(plan,day,index,messages,previous)})):[]);
  for(const visit of visits)if(venueCandidateBlocked('豫园',visit.day.city,visit.date)&&!required.held)issues.push(issue(visit.date!,'Do not schedule an interior visit without a traveller-held booking. A model-invented booked flag is not evidence. Move it to a permitted date only when that respects the traveller; otherwise use researched alternatives or fail.'));
  if(required.must&&!visits.length)issues.push(issue(tripRequirements(messages,previous).startDate||plan.startDate||'date not provided','The traveller explicitly requires this venue or holds a booking. Restore the constraint or fail; do not remove it as a repair.'));
  if(required.held&&visits.length&&!visits.some(visit=>visit.stop.booked))issues.push(issue(visits[0].date||'date not provided','Retain the traveller’s held-booking status and show its access conflict.'));
  for(const booking of required.bookings){
    const oldDate=dateForDay({startDate:(previous as DraftTrip).startDate,days:(previous as DraftTrip).days},booking.day,booking.index,[],previous);
    if(!visits.some(visit=>visit.stop.booked&&(!oldDate||visit.date===oldDate)&&(!booking.stop.at||visit.stop.at===booking.stop.at)))issues.push(issue(oldDate||'date not provided','The existing held booking and its date/time must remain unless the traveller explicitly cancels this venue.'));
  }
  return [...new Set(issues)];
}
type Research=NonNullable<VerifiedTrip['research']>;
export function withVenueAccessSource(research:Research):Research{
  if(research.sources.some(source=>source.url===yuGardenAccessRule.sourceUrl))return research;
  const index=Math.max(0,...research.sources.map(source=>source.index))+1;
  return {...research,sources:[...research.sources,{index,title:`${yuGardenAccessRule.sourceTitle} (published ${yuGardenAccessRule.publishedAt}; reviewed ${yuGardenAccessRule.reviewedAt})`,url:yuGardenAccessRule.sourceUrl,site:'Yu Garden'}]};
}
/** Keep uncertainty visible even on non-Mondays; this rule never certifies opening. */
export function annotateVenueAccess(plan:VerifiedTrip,messages:TripMessage[],previous:unknown,locale:string){
  const zh=locale==='zh';let conflicts=0;
  if(plan.days.some(day=>isShanghai(day.city)&&day.stops.some(isYuGardenInterior)))plan.research=withVenueAccessSource(plan.research||{checkedAt:yuGardenAccessRule.reviewedAt,summary:zh?'人工核对的常规开放规则，不代表实时入场验证。':'Curated standing access policy, not live admission verification.',sources:[]});
  const sourceIndex=plan.research?.sources.find(source=>source.url===yuGardenAccessRule.sourceUrl)?.index;
  plan.days.forEach((day,index)=>{
    if(!isShanghai(day.city))return;
    const date=dateForDay(plan,day,index,messages,previous);
    for(const stop of day.stops){
      if(!isYuGardenInterior(stop))continue;
      const blocked=venueCandidateBlocked('豫园',day.city,date);
      const note=blocked
        ? zh?`${date} 豫园内园开放冲突：保留你的已持预约，但官方常规规定周一闭园（国家法定节假日除外），尚无该日例外的官方依据。不能依赖这次预约直接入园，请联系场馆核实或明确修改日期。`
          : `${date} Yu Garden interior access conflict: your held booking is retained, but the operator’s standing rule closes Mondays except national holidays. No official exception for this date is verified. Do not rely on this booking for entry; confirm with the venue or explicitly change the date.`
        : zh?`豫园内园：${date?`${date} 的实际开放仍未实时核实`:'尚未提供参观日期'}；官方常规规定周一闭园（国家法定节假日除外）。此规则不证明其他日期一定开放，请向场馆确认。`
          : `Yu Garden interior: ${date?`actual access on ${date} is not live-verified`:'the visit date is not provided'}; the standing rule closes Mondays except national holidays. This does not verify opening on other dates. Confirm with the operator.`;
      const sourced=zh?`${note} 官方来源[${sourceIndex}]（公告 ${yuGardenAccessRule.publishedAt}；核对 ${yuGardenAccessRule.reviewedAt}）。`:`${note} Official source: ${yuGardenAccessRule.sourceUrl} (notice ${yuGardenAccessRule.publishedAt}; reviewed ${yuGardenAccessRule.reviewedAt}).`;
      if(!day.checks.includes(sourced))day.checks.push(sourced);
      stop.visitTip=blocked?`${sourced} ${stop.visitTip||''}`.trim():`${stop.visitTip||''} ${sourced}`.trim();
      if(blocked){conflicts++;if(!plan.checks.includes(sourced))plan.checks.push(sourced);}
    }
  });
  return conflicts;
}
