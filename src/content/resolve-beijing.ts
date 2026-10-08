import {budget as baseBudget,cards as baseCards,checklist as baseChecklist,day as baseDay,places as basePlaces,planB as basePlanB,preflight as basePreflight} from '@/lib/content/beijing-day';
import type {JourneyOptions,PreflightIssue} from '@/lib/content/schema';
import type {Locale} from '@/i18n/locales';
import {koreanBeijing as ko} from './locales/ko/beijing-day';
import {chineseBeijing as zh} from './locales/zh/beijing-day';
export function resolveBeijing(locale:Locale){
 if(locale==='en')return {day:baseDay,places:basePlaces,cards:baseCards,checklist:baseChecklist,budget:baseBudget,planB:basePlanB};
 const copy=locale==='ko'?ko:zh;
 const day={...baseDay,name:copy.dayName,assumptions:locale==='ko'?['베이징에서 온전히 관광할 수 있는 하루를 가정합니다. 호텔 이동은 아직 계획하지 않았습니다.','고궁 오전 입장 예약이 필요한 샘플입니다. 제안 시간은 예약이 아닙니다.','열차, 호텔, 가이드나 입장권은 포함되지 않습니다.']:[...zh.assumptions],stops:baseDay.stops.map(s=>({...s,...copy.stops[s.id as keyof typeof copy.stops]}))};
 const places=basePlaces.map(p=>{const t=copy.places[p.id as keyof typeof copy.places];return {...p,name:{...p.name,en:t.name},reservation:{...p.reservation,value:t.reservation},access:{...p.access,value:t.access},photography:t.photography}});
 const cards=baseCards.map(c=>{const t=copy.cards[c.id as keyof typeof copy.cards];return {...c,title:{...c.title,en:t.title},caution:t.caution}});
 const checklist=baseChecklist.map(c=>({...c,...copy.checklist[c.id as keyof typeof copy.checklist]}));
 const budget=baseBudget.map(b=>({...b,...copy.budget[b.id as keyof typeof copy.budget]}));
 const planB=basePlanB.map(p=>({...p,...copy.planB[p.title as keyof typeof copy.planB]}));
 return {day,places,cards,checklist,budget,planB};
}
export function localizedPreflight(options:JourneyOptions,locale:Locale):PreflightIssue[]{return basePreflight(options).map(i=>locale==='en'?i:{...i,text:(locale==='ko'?ko:zh).issues[i.id as keyof typeof ko.issues]})}
export function localizedEntranceName(locale:Locale,cardId:string){return locale==='ko'?ko.cards[cardId as keyof typeof ko.cards]?.entranceName:locale==='zh'?zh.cards[cardId as keyof typeof zh.cards]?.entranceName:undefined}
