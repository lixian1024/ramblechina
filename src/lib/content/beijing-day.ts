import en from '@/content/locales/en/beijing-day.json';
import type { Evidence, Fact, Place, Entrance, TravelCard, DayPlan, BudgetLine, JourneyOptions, PreflightIssue } from './schema';
import { isDate } from './schema';
export const version='2026-09-27.v1';
const checkedAt='2026-09-27';
const verified=<T>(value:T,sourceIds:string[],note?:string):Fact<T>=>({value,state:'verified',sourceIds,checkedAt,note});
const pending=<T>(note:string):Fact<T>=>({value:null,state:'pending',sourceIds:[],checkedAt:null,note});
export const sources:Evidence[]=[
 {id:'palace-visit',title:'Palace Museum · visitor guide',url:'https://www.dpm.org.cn/Visit.html',kind:'official',checkedAt,note:'South-to-north entry, gates and transport approaches. Temporary controls override suggested approaches.'},
 {id:'palace-booking',title:'Palace Museum · official booking',url:'https://www.dpm.org.cn/subject_booking/',kind:'official',checkedAt,note:'Current booking summary and identity requirements. Legacy COVID text also remains in the page and is not adopted.'},
 {id:'palace-works',title:'Palace Museum · Gate of Supreme Harmony works',url:'https://www.dpm.org.cn/announce_detail/379422.html',kind:'official',checkedAt,note:'Notice dated 31 July 2026: closure for works from 3 August. No reopening date confirmed in this review.'},
 {id:'jingshan-address',title:'Beijing Parks · Jingshan overview',url:'https://gygl.beijing.gov.cn/mlgy/mlgy_lsmy/201911/t20191129_732675.html',kind:'official',checkedAt,note:'Used for the park address, not its older fare or bus details.'},
 {id:'jingshan-ticket',title:'Beijing Government · Jingshan ticket FAQ (2025)',url:'https://english.beijing.gov.cn/12345hotline/faqs/all/202506/t20250620_4117974.html',kind:'official',checkedAt},
 {id:'jingshan-2026',title:'Beijing Government · foreign-visitor ticket assistance (2026)',url:'https://japanese.beijing.gov.cn/specials/beijinginboundtour/faqs/202601/t20260123_4459287.html',kind:'official',checkedAt,note:'Newer guidance permits on-site purchase with identity documents; supersedes an older telephone-reservation guide.'},
 {id:'jingshan-view',title:'Beijing Government · Jingshan viewpoint',url:'https://www.beijing.gov.cn/gate/big5/www.beijing.gov.cn/renwen/rwzyd/qxdw/gdshyqyxc/jshgy/202309/t20230920_3263094.html',kind:'official',checkedAt},
];
export const places:Place[]=[
 {id:'bj-palace',cityId:'beijing',name:{en:en.places['bj-palace'].name,zh:'故宫博物院'},address:pending('Use the verified gate name. The museum mailing address is not a visitor drop-off point.'),entranceIds:['bj-palace-wumen','bj-palace-shenwumen'],image:'/travel/beijing.jpg',photoId:'beijing',durationMinutes:[180,240],durationKind:'editorial-estimate',reservation:{...verified(en.places['bj-palace'].reservation, ['palace-booking']),reviewAfter:'2026-10-27'},access:{...verified(en.places['bj-palace'].access, ['palace-visit','palace-booking','palace-works']),reviewAfter:'2026-10-04'},photography:en.places['bj-palace'].photography},
 {id:'bj-jingshan',cityId:'beijing',name:{en:en.places['bj-jingshan'].name,zh:'景山公园'},address:verified('北京市西城区景山西街44号',['jingshan-address'],'Park address; use the south-gate name for this route.'),entranceIds:['bj-jingshan-south'],image:'/travel/beijing.jpg',photoId:'beijing',durationMinutes:[60,90],durationKind:'editorial-estimate',reservation:{...verified(en.places['bj-jingshan'].reservation, ['jingshan-ticket','jingshan-2026']),reviewAfter:'2026-10-27'},access:verified(en.places['bj-jingshan'].access, ['palace-visit','jingshan-view']),photography:en.places['bj-jingshan'].photography},
];
export const entrances:Entrance[]=[
 {id:'bj-palace-wumen',placeId:'bj-palace',name:{en:en.entrances['bj-palace-wumen'].name,zh:'故宫博物院午门'},role:'entry',mapQuery:'故宫博物院-午门',coordinates:pending('Resolve the entrance with Amap; do not use the museum centre.'),vehicleDropoff:pending('No legal vehicle drop-off point has been confirmed. Do not ask a driver to drive to the pedestrian gate.'),approach:verified('The official guide lists Tian’anmen East/West metro approaches and walking via Donghuamen or Xihuamen. Check current security and pedestrian access; no station exit is asserted here.',['palace-visit'])},
 {id:'bj-palace-shenwumen',placeId:'bj-palace',name:{en:en.entrances['bj-palace-shenwumen'].name,zh:'故宫博物院神武门'},role:'exit',mapQuery:'故宫博物院-神武门',coordinates:pending('Confirm the gate candidate before requesting a route.'),vehicleDropoff:pending('This card is for the walking exit, not a taxi pickup.'),approach:verified('This northern gate is an exit. Jingshan is across the street; follow signed pedestrian crossing facilities.',['palace-visit'])},
 {id:'bj-jingshan-south',placeId:'bj-jingshan',name:{en:en.entrances['bj-jingshan-south'].name,zh:'景山公园南门'},role:'entry',mapQuery:'景山公园-南门',coordinates:pending('Resolve the south gate, not the park centre.'),vehicleDropoff:pending('Roadside stopping permissions are not verified; this route arrives on foot.'),approach:verified('Use the south gate opposite the Palace Museum northern side. For this walk, the gate name is more useful than the park postal address.',['palace-visit','jingshan-address'])},
];
export const cards:TravelCard[]=[
 {id:'card-wumen',entranceId:'bj-palace-wumen',title:{en:en.cards['card-wumen'].title,zh:'午门 · 参观入口'},chinesePhrase:'您好，我要去故宫博物院午门入口，请问步行怎么走？',phraseKind:'ask-directions',caution:en.cards['card-wumen'].caution},
 {id:'card-shenwumen',entranceId:'bj-palace-shenwumen',title:{en:en.cards['card-shenwumen'].title,zh:'神武门 · 参观出口'},chinesePhrase:'请问去神武门出口怎么走？我下一站去景山公园南门。',phraseKind:'ask-directions',caution:en.cards['card-shenwumen'].caution},
 {id:'card-jingshan',entranceId:'bj-jingshan-south',title:{en:en.cards['card-jingshan'].title,zh:'景山公园 · 南门'},chinesePhrase:'您好，请问景山公园南门售票处在哪里？我想用护照买票。',phraseKind:'ask-directions',caution:en.cards['card-jingshan'].caution},
];
export const day:DayPlan={id:'beijing-imperial-day',version,cityId:'beijing',name:en.day.name,cardIds:cards.map(c=>c.id),assumptions:[en.day.assumptions[0],en.day.assumptions[1],en.day.assumptions[2]],stops:[
 {id:'arrive',entranceId:'bj-palace-wumen',window:en.day.stops.arrive.window,title:en.day.stops.arrive.title,duration:en.day.stops.arrive.duration,action:en.day.stops.arrive.action,kind:'transfer'},
 {id:'palace',placeId:'bj-palace',window:en.day.stops.palace.window,title:en.day.stops.palace.title,duration:en.day.stops.palace.duration,action:en.day.stops.palace.action,kind:'visit'},
 {id:'lunch',window:en.day.stops.lunch.window,title:en.day.stops.lunch.title,duration:en.day.stops.lunch.duration,action:en.day.stops.lunch.action,kind:'break'},
 {id:'crossing',entranceId:'bj-palace-shenwumen',window:en.day.stops.crossing.window,title:en.day.stops.crossing.title,duration:en.day.stops.crossing.duration,action:en.day.stops.crossing.action,kind:'transfer'},
 {id:'jingshan',placeId:'bj-jingshan',entranceId:'bj-jingshan-south',window:en.day.stops.jingshan.window,title:en.day.stops.jingshan.title,duration:en.day.stops.jingshan.duration,action:en.day.stops.jingshan.action,kind:'visit'},
]};
export const budget:BudgetLine[]=[
 {id:'admission',label:en.budget.admission.label,range:[50,100],unit:'person',basis:'editorial-allowance',note:en.budget.admission.note},
 {id:'food',label:en.budget.food.label,range:[60,120],unit:'person',basis:'editorial-allowance',note:en.budget.food.note},
 {id:'local',label:en.budget.local.label,range:[20,80],unit:'person',basis:'editorial-allowance',note:en.budget.local.note},
];
export const checklist=[
 {id:'reservation',title:en.checklist.reservation.title,detail:en.checklist.reservation.detail},
 {id:'passport',title:en.checklist.passport.title,detail:en.checklist.passport.detail},
 {id:'approach',title:en.checklist.approach.title,detail:en.checklist.approach.detail},
 {id:'notice',title:en.checklist.notice.title,detail:en.checklist.notice.detail},
 {id:'offline',title:en.checklist.offline.title,detail:en.checklist.offline.detail},
];
export const planB=[
 {title:en.planB[0].title,body:en.planB[0].body},
 {title:en.planB[1].title,body:en.planB[1].body},
 {title:en.planB[2].title,body:en.planB[2].body},
];
export const defaultOptions:JourneyOptions={date:'',people:2,confirmed:[],cardIds:cards.map(c=>c.id)};
export function validateOptions(value:unknown):JourneyOptions{
 if(!value||typeof value!=='object')throw Error('Invalid daybook options.');const v=value as Record<string,unknown>;
 if(typeof v.date!=='string'||(v.date!==''&&!isDate(v.date)))throw Error('Choose a valid date.');
 if(typeof v.people!=='number'||!Number.isInteger(v.people)||v.people<1||v.people>8)throw Error('Choose 1–8 travellers.');
 if(!Array.isArray(v.confirmed)||v.confirmed.some(x=>typeof x!=='string'||!checklist.some(c=>c.id===x)))throw Error('Invalid checklist.');
 if(!Array.isArray(v.cardIds)||v.cardIds.some(x=>typeof x!=='string'||!cards.some(c=>c.id===x)))throw Error('Invalid cards.');
 return {date:v.date,people:v.people,confirmed:[...new Set(v.confirmed)] as string[],cardIds:[...new Set(v.cardIds)] as string[]};
}
export function preflight(options:JourneyOptions,today=new Date().toISOString().slice(0,10)):PreflightIssue[]{
 const issues:PreflightIssue[]=[];
 if(!options.date)issues.push({id:'date',level:'action',text:'Choose a travel date before checking the operating day.'});
 else {if(options.date<today)issues.push({id:'past',level:'action',text:'This date is in the past. Select your intended travel date.'});if(new Date(options.date+'T12:00:00Z').getUTCDay()===1)issues.push({id:'monday',level:'action',text:'This is a Monday. The palace normally closes; only an official dated exception can make this day viable.'});}
 if(!options.confirmed.includes('reservation'))issues.push({id:'reservation',level:'action',text:'A Palace Museum morning reservation is still to be confirmed. This plan does not reserve admission.'});
 if(!options.confirmed.includes('approach'))issues.push({id:'approach',level:'action',text:'Your arrival route and any vehicle drop-off are not confirmed.'});
 const target=options.date>today?options.date:today;
 if(places.some(p=>[p.reservation,p.access].some(f=>f.reviewAfter&&target>f.reviewAfter)))issues.push({id:'freshness',level:'action',text:'Some access or booking notes need a fresh review for this date. Recheck official notices; a saved plan is not a future access guarantee.'});
 issues.push({id:'works',level:'notice',text:'Taihemen works were announced from 3 August 2026. A reopening date was not confirmed in this edition; follow staff directions.'});
 return issues;
}
export function cardContext(card:TravelCard){const entrance=entrances.find(e=>e.id===card.entranceId)!;return {entrance,place:places.find(p=>p.id===entrance.placeId)!};}
export function amapSearchLink(query:string){return 'https://uri.amap.com/search?keyword='+encodeURIComponent(query)+'&city=110100&src=chinatravelagent&callnative=0';}
