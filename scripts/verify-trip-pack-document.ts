import assert from 'node:assert/strict';
import {preparePack, packDocumentSchema} from '../src/lib/trip-pack/model';

// Catches lost saved choices, permissive identity matching and provider-content leakage.
const now='2026-10-23T08:00:00.000Z';
function snapshot(names=['Yuyuan Bazaar','The Bund']) {
 return {plan:{title:'PRIVATE TITLE',summary:'PRIVATE SUMMARY',startDate:'2026-11-03',createdAt:now,days:[{id:'d1',city:'上海',date:'2026-11-03',title:'PRIVATE DAY',hotel:'PRIVATE INFERRED HOTEL',stops:names.map((name,i)=>({id:`s${i}`,name,search:name,durationMinutes:60,at:i?'16:00':'10:00',scheduledAt:'23:00',booked:i===0,bookingNote:i===0?'Ticket held by traveller':undefined,why:'PRIVATE WHY',description:'PROVIDER DESCRIPTION',place:{name,address:'PROVIDER ADDRESS',point:{lat:1,lng:1},photo:{url:'PROVIDER PHOTO'}}})),legs:[{geometry:'PROVIDER GEOMETRY'}]}]},messages:[{role:'user',text:'PRIVATE CHAT'}]};
}
const input=snapshot();
const valid=preparePack(input,'en',undefined,now);
assert(valid.document,'Supported saved itinerary must produce a document');
assert.deepEqual(valid.issues,[]);
const doc=valid.document;
assert.deepEqual(doc.days[0].stops.map(s=>s.nameEnglish),['Yuyuan Bazaar','The Bund']);
assert.equal(doc.days[0].stops[0].time,'10:00');
assert.equal(doc.days[0].stops[0].durationMinutes,60);
assert.equal(doc.days[0].stops[0].booked,true);
assert.equal(doc.days[0].stops[0].bookingNote,'Ticket held by traveller');
assert.equal(doc.generatedAt,now);
assert.equal(doc.hotel,undefined);
for(const banned of ['PRIVATE','PROVIDER','23:00','geometry','place','summary','why']) assert(!JSON.stringify(doc).includes(banned),banned);
assert.deepEqual(input,snapshot(),'Export must not mutate the saved snapshot');
assert(packDocumentSchema.safeParse(doc).success);
assert(!packDocumentSchema.safeParse({...doc,messages:[]}).success,'Stored documents reject undeclared fields');
assert(!packDocumentSchema.safeParse({...doc,days:[{...doc.days[0],stops:[{...doc.days[0].stops[0],sourceUrl:'https://evil.example'}]}]}).success,'Stored facts cannot replace curated sources');
const hotel=preparePack(input,'zh',{name:'自填酒店 My Hotel',address:'上海市自填地址 123'},now).document!;
assert.equal(hotel.hotel?.name,'自填酒店 My Hotel');
assert.equal(hotel.locale,'zh');
const three=snapshot(['The Bund']);
three.plan.days=[three.plan.days[0],{...structuredClone(three.plan.days[0]),id:'d2',date:'2026-11-04'},{...structuredClone(three.plan.days[0]),id:'d3',date:'2026-11-05'}];
assert.deepEqual(preparePack(three,'en',undefined,now).document?.days.map(d=>d.date),['2026-11-03','2026-11-04','2026-11-05']);
function blocks(value:unknown,needle:string) { const result=preparePack(value,'en',undefined,now); assert.equal(result.document,null,needle); assert(result.issues.some(issue=>issue.toLowerCase().includes(needle)),JSON.stringify(result.issues)); }
blocks(null,'saved');
blocks({plan:null},'saved');
const wrongCity=snapshot(); wrongCity.plan.days[0].city='北京'; blocks(wrongCity,'shanghai');
const four=structuredClone(three);four.plan.days.push({...structuredClone(four.plan.days[0]),date:'2026-11-06'});blocks(four,'1-3');
const missing=snapshot();missing.plan.days[0].date='';blocks(missing,'date');
const invalid=snapshot();invalid.plan.startDate='2026-02-30';invalid.plan.days[0].date='2026-02-30';blocks(invalid,'date');
const gap=structuredClone(three);gap.plan.days[1].date='2026-11-05';blocks(gap,'consecutive');
const movedStart=snapshot();movedStart.plan.startDate='2026-11-04';blocks(movedStart,'start');
const requestStart=snapshot();requestStart.messages=[{role:'user',text:'One day in Shanghai starting 2026-11-02'}];blocks(requestStart,'requested');
for(const alias of ['Yu Garden Restaurant','豫园地铁站','The Bund Hotel','Return to The Bund','Unknown attraction'])blocks(snapshot([alias]),'unsupported');
const retained=preparePack(snapshot(['The Bund','Unknown attraction']),'en',undefined,now);assert(retained.issues.some(s=>s.includes('Unknown attraction')));assert.equal(retained.document,null,'Unknown stop cannot be silently dropped');
const monday=snapshot(['Yu Garden']);monday.plan.startDate='2026-11-02';monday.plan.days[0].date='2026-11-02';blocks(monday,'monday');
monday.plan.days[0].stops[0].booked=true;blocks(monday,'monday');
const bazaar=snapshot(['豫园商城']);bazaar.plan.startDate='2026-11-02';bazaar.plan.days[0].date='2026-11-02';assert(preparePack(bazaar,'en',undefined,now).document,'Bazaar is distinct from garden interior');
const conflicting=snapshot(['The Bund']);conflicting.plan.days[0].stops[0].search='Yu Garden';blocks(conflicting,'identity');
const overlap=snapshot();overlap.plan.days[0].stops[1].at='10:30';blocks(overlap,'overlap');
const impossibleDay=snapshot();impossibleDay.plan.days[0].stops.forEach(stop=>{stop.durationMinutes=900;delete (stop as {at?:string}).at;});blocks(impossibleDay,'duration');
// Catches floating stops incorrectly consuming zero time between saved anchors.
const timelineCases=[
 {name:'floating middle stop conflicts with next anchor',times:['10:00',undefined,'11:00'],durations:[60,60,60],valid:false},
 {name:'floating tail cannot cross midnight',times:['23:00',undefined,undefined],durations:[60,30,30],valid:false},
 {name:'floating prefix cannot fit before early anchor',times:[undefined,'00:30'],durations:[60,60],valid:false},
 {name:'floating prefix fits exactly before anchor',times:[undefined,'01:00'],durations:[60,60],valid:true},
 {name:'anchor leaves enough room for floating middle stop',times:['10:00',undefined,'12:00'],durations:[60,60,60],valid:true},
 {name:'floating tail may finish exactly at midnight',times:['23:00',undefined],durations:[30,30],valid:true},
] as const;
for(const example of timelineCases){
 const value=snapshot(['The Bund','Wukang Road','Xintiandi'].slice(0,example.times.length));
 value.plan.days[0].stops.forEach((stop,index)=>{stop.durationMinutes=example.durations[index];if(example.times[index])stop.at=example.times[index]!;else delete (stop as {at?:string}).at;});
 const result=preparePack(value,'en',undefined,now);
 assert.equal(Boolean(result.document),example.valid,example.name);
 if(!example.valid)assert(result.issues.some(issue=>/overlap|beyond the day/.test(issue)),example.name+' must explain the time conflict');
 if(result.document)assert.deepEqual(result.document.days[0].stops.map(stop=>stop.time),example.times,example.name+' must retain all missing/saved times');
}
const noTime=snapshot(['The Bund']);delete (noTime.plan.days[0].stops[0] as {at?:string}).at;assert.equal(preparePack(noTime,'en',undefined,now).document?.days[0].stops[0].time,undefined,'Never recover provider scheduledAt');
assert.equal(preparePack(input,'en',{name:'',address:'Only address'},now).document,null,'Partial hotel form must not silently vanish');
console.log('PASS trip-pack document: exact identity, private projection, booking/order, 1-3 consecutive dates, Monday and unsupported recovery.');
