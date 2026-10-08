import { cities, findCity, photoFor, visualForDay } from './data';
import { getCityEdition } from '@/content/editorial/en/cities';

export type Point = [number, number]; // WGS84, latitude then longitude. Never mix with Amap GCJ-02.
export type Place = { id: string; city: string; name: string; zh: string; area: string; description: string; access: string; booking: string; mapQuery: string; photo: string; duration: number; indoor: boolean; dedicated: boolean; point?: Point; coordinateSource?: string };
export type Stop = { id: string; placeId: string; duration: number; booking?: { time: string; note: string } };
export type JourneyDay = { id: string; city: string; title: string; transfer: boolean; stops: Stop[] };
export type Journey = { version: 1; cities: string[]; start: string; people: number; companions: 'Adults' | 'With parents' | 'With children'; pace: 'Easy-going' | 'Balanced'; budget: number; days: JourneyDay[]; hotels: Record<string, { name: string; point?: Point }> };
export const STORAGE_KEY = 'china-unfold-journey-v1';
export const dayColors = ['#226550', '#b67844', '#6479a4', '#926582', '#6a874f', '#be6b55'];
// Published WGS84 landmark references, retrieved 2026-09-28. These are area/venue pins, not verified entrances.
const locations: Record<string, [number, number, string]> = {
 'sh-museum':[31.230278,121.470556,'Shanghai_Museum'], 'sh-museum-east':[31.222107,121.534338,'Shanghai_Museum_East'],
 'sh-bund':[31.23802778,121.48613889,'The_Bund'], 'sh-yuyuan':[31.22916667,121.4875,'Yu_Garden'],
 'sh-concession':[31.2076,121.4401,'Wukang_Road'], 'sh-tower':[31.2355,121.501,'Shanghai_Tower'],
 'sh-suzhou':[31.24472222,121.48694444,'Suzhou_Creek'], 'sh-temple':[31.24319167,121.44052778,'Jade_Buddha_Temple'],
 'sh-zhujiajiao':[31.11277778,121.05027778,'Zhujiajiao'],
 'bj-palace':[39.91583333,116.39083333,'Forbidden_City'], 'bj-jingshan':[39.92361111,116.39055556,'Jingshan_Park'],
 'bj-heaven':[39.8822,116.4066,'Temple_of_Heaven'], 'bj-wall':[40.43801667,116.5619,'Mutianyu'],
 'bj-summer':[39.9975,116.2689,'Summer_Palace'], 'bj-beihai':[39.92444444,116.38305556,'Beihai_Park'],
 'bj-hutong':[39.93802,116.38706,'Shichahai'], 'bj-798':[39.989057,116.48793,'798_Art_Zone'],
 'xa-army':[34.385,109.273056,'Terracotta_Army'], 'xa-wall':[34.2534295,108.9423371,'Fortifications_of_Xi%27an'],
 'xa-mosque':[34.26333333,108.93638889,'Great_Mosque_of_Xi%27an'], 'xa-history':[34.22527778,108.95138889,'Shaanxi_History_Museum'],
 'xa-pagoda':[34.219842,108.959354,'Giant_Wild_Goose_Pagoda'], 'xa-small':[34.24080556,108.93738889,'Small_Wild_Goose_Pagoda'],
 'xa-towers':[34.261,108.942,'Bell_Tower_of_Xi%27an'], 'xa-huaqing':[34.365,109.20722222,'Huaqing_Pool'],
};
const durations: Record<string, number> = {'sh-bund':60,'sh-yuyuan':120,'sh-museum':150,'sh-museum-east':180,'sh-concession':90,'sh-tower':120,'sh-suzhou':60,'sh-temple':90,'sh-zhujiajiao':360,'bj-palace':240,'bj-jingshan':90,'bj-heaven':180,'bj-wall':480,'bj-summer':240,'bj-beihai':90,'bj-hutong':90,'bj-798':150,'xa-army':360,'xa-wall':120,'xa-mosque':90,'xa-history':180,'xa-pagoda':120,'xa-small':120,'xa-towers':90,'xa-huaqing':240};
const indoors = new Set(['sh-museum','sh-museum-east','sh-tower','bj-798','xa-history','xa-army']);
export function placesFor(city: string): Place[] {
 const edition = getCityEdition(city); const legacy = findCity(city);
 if (!legacy) return [];
 if (edition) return edition.experiences.map(e => ({id:e.id,city,name:e.name,zh:e.zh,area:e.area,description:e.why,access:e.how,booking:e.booking,mapQuery:e.mapQuery,photo:photoFor(e.photo || '')?.file || legacy.image,duration:durations[e.id] || 120,indoor:indoors.has(e.id),dedicated:['bj-wall','sh-zhujiajiao','xa-army','xa-huaqing'].includes(e.id),point:locations[e.id] ? [locations[e.id][0],locations[e.id][1]] : undefined,coordinateSource:locations[e.id] ? 'https://en.wikipedia.org/wiki/'+locations[e.id][2] : undefined}));
 return legacy.highlights.map((h,i) => ({id:`${city}-${i}`,city,name:h.name,zh:legacy.chinese,area:h.scope,description:h.description,access:'Check the exact entrance and your starting point before travelling.',booking:'Check current opening times and reservation requirements with the operator.',mapQuery:h.name+' '+legacy.name,photo:visualForDay(legacy,h.name).image,duration:h.scope==='Dedicated outing'?360:120,indoor:/museum/i.test(h.name),dedicated:h.scope==='Dedicated outing'}));
}
export const allPlaces = cities.flatMap(c=>placesFor(c.slug));
export const placeById = (id:string) => allPlaces.find(p=>p.id===id);
const routes: Record<string,string[][]> = {
 shanghai:[['sh-yuyuan','sh-bund'],['sh-museum','sh-concession'],['sh-temple','sh-suzhou']],
 beijing:[['bj-palace','bj-jingshan'],['bj-heaven','bj-hutong'],['bj-wall'],['bj-summer','bj-beihai']],
 xian:[['xa-wall','xa-mosque'],['xa-army'],['xa-history','xa-pagoda']],
};
const titles: Record<string,string[]> = {shanghai:['Old gardens, open horizons','Art, lanes & a slower afternoon','A quieter side of Shanghai'],beijing:['Along the imperial axis','Parks & everyday Beijing','A day on the Great Wall','Lakeside breathing room'],xian:['Inside the ancient walls','An army beyond the city','Stories, stone & pagodas']};
export function buildJourney(slugs:string[],count:number,start='',people=3,companions:Journey['companions']='With parents',pace:Journey['pace']='Easy-going',budget=6000):Journey {
 const selected=[...new Set(slugs)].filter(s=>findCity(s));
 if(!selected.length||selected.length>8||!Number.isInteger(count)||count<selected.length*2-1||count>30)throw Error('Allow one sightseeing day per city and one day between cities (up to 30 days).');
 const allocations=selected.map(()=>1); const available=count-selected.length+1;
 for(let i=selected.length;i<available;i++){const best=allocations.map((n,j)=>({j,score:parseInt(findCity(selected[j])!.days)/n})).sort((a,b)=>b.score-a.score)[0];allocations[best.j]++;}
 const days:JourneyDay[]=[];
 for(const [index,city] of selected.entries()) {
  if(index) days.push({id:`day-${days.length+1}`,city,title:`${findCity(selected[index-1])!.name} → ${findCity(city)!.name}`,transfer:true,stops:[]});
  const catalogue=placesFor(city); const used=new Set<string>();
  for(let i=0;i<allocations[index];i++) {
   const template=routes[city]?.[i];
   const ids=template || catalogue.filter(p=>!used.has(p.id)).slice(0,pace==='Easy-going'?2:3).map(p=>p.id);
   const first=placeById(ids[0]); const picks=first?.dedicated?ids.slice(0,1):ids.filter(id=>!placeById(id)?.dedicated);
   picks.forEach(id=>used.add(id));
   const id=`day-${days.length+1}`;
   days.push({id,city,title:titles[city]?.[i] || (picks.length?'A little more '+findCity(city)!.name:'Room for your own discoveries'),transfer:false,stops:picks.map((placeId,j)=>({id:`${id}-${j}-${placeId}`,placeId,duration:placeById(placeId)!.duration}))});
  }
 }
 return {version:1,cities:selected,start,people,companions,pace,budget,days,hotels:{}};
}
export function dateFor(journey:Journey,index:number){if(!journey.start)return '';const date=new Date(journey.start+'T12:00:00Z');date.setUTCDate(date.getUTCDate()+index);return date.toISOString().slice(0,10);}
export function clock(minutes:number){return `${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}`;}
export function schedule(day:JourneyDay,pace:Journey['pace']) {
 let cursor=9*60+30;return day.stops.map((stop,index)=>{
  if(index) cursor+=(pace==='Easy-going'?45:30)+(index===1?60:0);
  const earliest=cursor; const fixed=stop.booking?.time;
  const start=fixed?Number(fixed.slice(0,2))*60+Number(fixed.slice(3)):cursor;
  cursor=start+stop.duration;
  return {stop,start,end:cursor,conflict:index>0&&!!fixed&&start<earliest,earliest};
 });
}
export function distanceKm(a:Point,b:Point){const r=Math.PI/180;const h=Math.sin((b[0]-a[0])*r/2)**2+Math.cos(a[0]*r)*Math.cos(b[0]*r)*Math.sin((b[1]-a[1])*r/2)**2;return 12742*Math.asin(Math.sqrt(Math.min(1,h)));}
export function dayDistance(day:JourneyDay,hotel?:{point?:Point}){const points=day.stops.map(s=>placeById(s.placeId)?.point).filter((p):p is Point=>!!p);if(hotel?.point)points.unshift(hotel.point);return points.reduce((sum,p,i)=>sum+(i?distanceKm(points[i-1],p):0),0);}
export function dayIssues(day:JourneyDay,journey:Journey):string[]{
 const issues:string[]=[];const rows=schedule(day,journey.pace);
 rows.filter(r=>r.conflict).forEach(r=>issues.push(`${placeById(r.stop.placeId)?.name}: your ${r.stop.booking!.time} booking overlaps the earlier plan and its buffer.`));
 if(day.stops.length>1&&day.stops.some(s=>placeById(s.placeId)?.dedicated))issues.push('A dedicated outing shares this day with another stop. Keep travel and the return journey in mind.');
 if(journey.companions!=='Adults'&&day.stops.reduce((sum,s)=>sum+s.duration,0)>300)issues.push('More than five hours of visits. Consider moving a stop for a gentler day.');
 if(rows.some(r=>r.end>18*60+30))issues.push('The suggested schedule runs into the evening. Check opening times or move a stop.');
 return issues;
}
export function moveStop(journey:Journey,from:string,stopId:string,to:string):Journey {
 const source=journey.days.find(d=>d.id===from), target=journey.days.find(d=>d.id===to);const stop=source?.stops.find(s=>s.id===stopId);
 if(!stop||stop.booking||!target||target.transfer||target.city!==source?.city||from===to)return journey;
 return {...journey,days:journey.days.map(d=>d.id===from?{...d,stops:d.stops.filter(s=>s.id!==stopId)}:d.id===to?{...d,stops:[...d.stops,stop]}:d)};
}
export function reorderStop(journey:Journey,dayId:string,stopId:string,direction:number):Journey {
 return {...journey,days:journey.days.map(d=>{
  if(d.id!==dayId)return d;const index=d.stops.findIndex(s=>s.id===stopId),target=index+direction;
  if(index<0||target<0||target>=d.stops.length||d.stops[index].booking||d.stops[target].booking)return d;
  const stops=[...d.stops];[stops[index],stops[target]]=[stops[target],stops[index]];return {...d,stops};
 })};
}
export function parseJourney(value:unknown):Journey|null {
 try {
  if(!value||typeof value!=='object')return null;const j=value as Journey;
  if(j.version!==1||!Array.isArray(j.cities)||!j.cities.length||j.cities.length>8||j.cities.some(s=>typeof s!=='string'||!findCity(s))||!Array.isArray(j.days)||!j.days.length||j.days.length>30)return null;
  if(!Number.isInteger(j.people)||j.people<1||j.people>10||!Number.isFinite(j.budget)||j.budget<100||j.budget>1000000||!['Adults','With parents','With children'].includes(j.companions)||!['Easy-going','Balanced'].includes(j.pace))return null;
  if(typeof j.start!=='string'||(j.start&&(!/^\d{4}-\d{2}-\d{2}$/.test(j.start)||new Date(j.start+'T12:00:00Z').toISOString().slice(0,10)!==j.start)))return null;
  const ids=new Set<string>();for(const d of j.days){if(typeof d.id!=='string'||ids.has(d.id)||!j.cities.includes(d.city)||typeof d.title!=='string'||d.title.length>200||typeof d.transfer!=='boolean'||!Array.isArray(d.stops)||d.stops.length>20)return null;ids.add(d.id);for(const s of d.stops){if(typeof s.id!=='string'||ids.has(s.id)||placeById(s.placeId)?.city!==d.city||!Number.isInteger(s.duration)||s.duration<15||s.duration>720)return null;ids.add(s.id);if(s.booking&&(!/^([01]\d|2[0-3]):[0-5]\d$/.test(s.booking.time)||typeof s.booking.note!=='string'||s.booking.note.length>300))return null;}}
  if(!j.hotels||typeof j.hotels!=='object'||Array.isArray(j.hotels))return null;
  for(const [city,h] of Object.entries(j.hotels)){if(!j.cities.includes(city)||!h||typeof h.name!=='string'||h.name.length>200)return null;if(h.point&&(!Array.isArray(h.point)||h.point.length!==2||h.point.some(n=>!Number.isFinite(n))||Math.abs(h.point[0])>85||Math.abs(h.point[1])>180))return null;}
  return j;
 }catch{return null;}
}
