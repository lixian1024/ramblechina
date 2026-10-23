/** Controlled production POST regressions for a real closure failure. No live APIs. */
import assert from 'node:assert/strict';
import {admittedTripPOST} from './fixtures/admitted-travel-routes';
import {googleFixtureFetch} from './fixtures/google-provider';
import type {ConciergeEvent, DraftTrip, VerifiedTrip} from '../src/lib/travel/concierge-types';

process.env.TRIP_LLM_API_KEY='controlled-only';
process.env.TRIP_LLM_BASE_URL='https://model.example/compatible-mode/v1';
process.env.TRIP_LLM_MODEL='qwen-plus';
process.env.GOOGLE_MAPS_SERVER_API_KEY='controlled-only';
process.env.AMAP_WEB_SERVICE_KEY='controlled-only';
const source='https://www.yugarden.com.cn/Page/ArticleView/articleDetail1523.html';
const brief=(date?:string)=>`One relaxed day in Shanghai${date?` starting ${date}`:''}. Food and historic streets, easy walking, no museums.`;
const stop=(search:string,booked=false)=>({name:search==='豫园'?'Yu Garden':search,search,category:'sight' as const,at:search==='外滩'?'14:00':'09:30',durationMinutes:60,booked,bookingNote:booked?'Held ticket at 09:30':undefined});
const draft=(date?:string,booked=false,query='豫园'):DraftTrip=>({title:'Controlled Shanghai access regression',summary:'Controlled test data, not travel evidence.',startDate:date,days:[{city:'上海',cityEnglish:'Shanghai',title:'Historic streets',date,kind:'visit',note:'Keep time for meals and rest.',stops:[stop(query,booked),stop('外滩')]}]});
const bundOnly=(date:string)=>{const plan=draft(date);plan.days[0].stops=[stop('外滩')];return plan;};
let outputs:DraftTrip[]=[],draftCalls=0,researchCalls=0;
const queries:string[]=[],feedback:string[][]=[],inputs:Record<string,unknown>[]=[];
globalThis.fetch=googleFixtureFetch(async(input,init)=>{
  const url=new URL(String(input));
  if(url.hostname==='model.example'){
    const body=JSON.parse(String(init?.body));
    if(url.pathname.endsWith('/generation')){
      researchCalls++;inputs.push(JSON.parse(body.input.messages[1].content));
      return Response.json({output:{choices:[{message:{content:'Controlled research fixture [1].'}}],search_info:{search_results:[{title:'Controlled source',url:'https://example.invalid/controlled-venue-source'}]}}});
    }
    if(body.messages[0].content.startsWith('Classify'))return Response.json({choices:[{message:{content:'{"intent":"route-concierge"}'}}]});
    const data=JSON.parse(body.messages[1].content);inputs.push(data);
    if(data.validationFeedback)feedback.push(data.validationFeedback.issues);
    const value=outputs[Math.min(draftCalls++,outputs.length-1)];
    return Response.json({choices:[{message:{content:JSON.stringify(value)}}]});
  }
  if(url.pathname==='/v5/place/text'){
    const query=url.searchParams.get('keywords')||'';queries.push(query);
    const location=query==='外滩'?'121.4900,31.2360':'121.4925,31.2277';
    return Response.json({status:'1',pois:[{id:'CONTROLLED-'+query,name:query,location,adcode:'310101',citycode:'021',type:'风景名胜;风景名胜;景点'}]});
  }
  if(url.pathname==='/v5/place/around')return Response.json({status:'1',pois:[]});
  if(url.pathname.includes('/direction/'))return Response.json({status:'1',route:url.pathname.includes('/transit/')?{transits:[]}:{paths:[{cost:{duration:'600'},distance:'1000'}]}});
  if(url.pathname.includes('/weather/'))return Response.json({status:'1',forecasts:[]});
  throw new Error('Unexpected controlled request: '+url.hostname+url.pathname);
});
async function ask(values:DraftTrip[],text:string,previous:unknown=null,locale='en'){
  outputs=values;draftCalls=0;researchCalls=0;queries.length=0;feedback.length=0;inputs.length=0;
  const before=JSON.stringify(previous);
  const response=await admittedTripPOST(new Request('http://controlled.invalid/api/trip-concierge',{method:'POST',body:JSON.stringify({locale,messages:[{role:'user',text}],currentPlan:previous})}),'2026-10-23T00:00:00Z');
  const events=(await response.text()).trim().split('\n').map(line=>JSON.parse(line) as ConciergeEvent);
  assert.equal(JSON.stringify(previous),before,'No failure or repair may mutate the original plan');
  return events;
}
function rejected(events:ConciergeEvent[]){assert(events.some(event=>event.type==='error'));assert(!events.some(event=>event.type==='result'),'A known Monday closure must not be published as a normal interior visit');}
function result(events:ConciergeEvent[]):VerifiedTrip {const event=events.find(event=>event.type==='result');assert(event?.type==='result',JSON.stringify(events));return event.plan;}
async function main(){
  rejected(await ask([draft('2026-11-02')],brief('2026-11-02')));
  assert.equal(draftCalls,2,'Only one bounded model repair');assert.equal(researchCalls,1);
  assert(!queries.includes('豫园'),'Reject known closure before grounding and draft map costs');
  assert(feedback[0].some(issue=>issue.includes(source)&&issue.includes('2026-11-02')));
  assert(inputs.every(input=>JSON.stringify(input.venueAccess).includes(source)),'Official policy, review date and calendar must reach research and drafting');
  const chineseFailure=await ask([draft('2026-11-02')],brief('2026-11-02'),null,'zh');
  rejected(chineseFailure);
  const chineseError=chineseFailure.find(event=>event.type==='error');
  assert(chineseError?.type==='error');
  assert(chineseError.message.includes('豫园')&&chineseError.message.includes('周一')&&chineseError.message.includes('已有行程未改变')&&chineseError.message.includes(source),'Chinese failure must explain the access conflict, preserved plan and official recovery source');
  assert(!chineseError.message.includes('Controlled Shanghai access regression'),'Do not expose model draft text in the public failure');
  const repaired=result(await ask([draft('2026-11-02'),bundOnly('2026-11-02')],brief('2026-11-02')));
  assert.deepEqual(repaired.days[0].stops.map(stop=>stop.search),['外滩']);assert.equal(draftCalls,2);
  const tuesday=result(await ask([draft('2026-11-03')],brief('2026-11-03')));
  assert(tuesday.days[0].stops.some(stop=>stop.search==='豫园'));assert.equal(draftCalls,1);
  assert(tuesday.days[0].checks.some(check=>/not.*live|未.*实时|not.*verified|未验证/i.test(check)));
  const booked=result(await ask([draft('2026-11-02',true)],brief('2026-11-02')+' Yu Garden ticket is booked at 09:30.'));
  assert(booked.days[0].stops.some(stop=>stop.search==='豫园'&&stop.booked&&stop.at==='09:30'));
  assert(booked.days[0].checks.some(check=>check.includes(source)&&/conflict|冲突/i.test(check)));
  assert(booked.research?.sources.some(item=>item.url===source));
  assert.equal(draftCalls,1,'Do not repair away a held booking');
  rejected(await ask([draft('2026-11-02',true)],brief('2026-11-02')));
  rejected(await ask([draft('2026-11-02',true)],brief('2026-11-02')+' Must include Yu Garden. Do I need a reservation?'));
  const old=structuredClone(tuesday);old.startDate='2026-11-02';old.days[0].date='2026-11-02';
  rejected(await ask([draft('2026-11-02')],'Make day one easier.',old));
  assert.equal(draftCalls,2,'Existing-plan edits must independently enforce the access rule');
  rejected(await ask([draft('2026-11-02'),bundOnly('2026-11-02')],brief('2026-11-02')+' Must include Yu Garden.'));
  assert.equal(draftCalls,2,'A must-visit cannot silently disappear during repair');
  const heldEdit=result(await ask([bundOnly('2026-11-02'),draft('2026-11-02',true)],'Remove museums from day one but keep every booked ticket fixed.',booked));
  assert(heldEdit.days[0].stops.some(stop=>stop.booked&&stop.search==='豫园'&&stop.at==='09:30'));
  const twoDayOld=structuredClone(booked);twoDayOld.days.push({...structuredClone(booked.days[0]),id:'day-2',date:'2026-11-03',stops:[{...structuredClone(booked.days[0].stops[1]),id:'day-2-stop-1'}]});
  const rescheduledDraft=bundOnly('2026-11-02');rescheduledDraft.days.push({...draft('2026-11-03',true).days[0],stops:[{...stop('豫园',true),at:'10:00'}]});
  const rescheduled=result(await ask([rescheduledDraft],'Move my Yu Garden reservation from Monday to Tuesday at 10:00. Keep the other arrangements.',twoDayOld));
  assert(!rescheduled.days[0].stops.some(stop=>stop.search==='豫园'));
  assert(rescheduled.days[1].stops.some(stop=>stop.search==='豫园'&&stop.booked&&stop.at==='10:00'),'An explicit venue reschedule can move the booking within the existing calendar');
  rejected(await ask([draft('2026-10-05')],brief('2026-10-05')+' It is a national holiday so the garden is open.'));
  const bazaar=result(await ask([draft('2026-11-02',false,'豫园商城')],brief('2026-11-02')+' Must visit Yuyuan Bazaar.'));
  assert(bazaar.days[0].stops.some(stop=>stop.search==='豫园商城'),'Bazaar is a distinct place; do not apply the interior closure to it');
  const undated=result(await ask([draft()],brief()));
  assert(undated.days[0].stops.some(stop=>stop.search==='豫园'));
  assert(undated.days[0].checks.some(check=>check.includes(source)&&/date|日期/i.test(check)));
  console.log('PASS: controlled production POST Monday pre-map rejection/one repair, Tuesday/undated uncertainty, held-booking conflicts, must-visits, prior edits, distinct bazaar and no inferred holiday exceptions. No live API calls.');
}
void main().catch(error=>{console.error(error);process.exitCode=1;});
