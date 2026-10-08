import assert from 'node:assert/strict';
import { createPlan, validateInput, type PlanInput } from '../src/lib/travel/planner';
import { cities,photoFor } from '../src/lib/travel/data';
import { readFile } from 'node:fs/promises';
const base:PlanInput={days:7,people:2,budget:12000,start:'2026-10-15',end:'2026-10-21',cities:['beijing','shanghai'],preferences:['Culture','Food'],sights:['Mutianyu Great Wall']};
async function main(){
 const plan=createPlan(base);assert.equal(plan.days.length,7);assert.equal(plan.days.filter(d=>d.transfer).length,1);assert.equal(plan.days.at(-1)?.date,'2026-10-21');assert.ok(plan.days.some(d=>d.title==='Mutianyu Great Wall'));assert.ok(!plan.days.some(d=>d.afternoon.includes('Mutianyu Great Wall')));assert.ok(!plan.warnings.some(w=>w.includes('Early October')));
 assert.throws(()=>validateInput({...base,end:'2026-10-18'}),/date range/);assert.throws(()=>validateInput({...base,start:'2026-02-30'}),/valid travel dates/);assert.throws(()=>validateInput({...base,days:1}),/travel day/);assert.throws(()=>validateInput({...base,cities:['unknown']}),/supported cities/);assert.throws(()=>validateInput({...base,people:0}),/people/);assert.throws(()=>validateInput({...base,sights:['imaginary']}),/sights/);
 const slow=createPlan({...base,preferences:['Slow travel'],sights:[]});assert.ok(slow.days.filter(d=>!d.transfer).every(d=>!d.afternoon.includes(':')));
 const culture=createPlan({...base,cities:['hangzhou'],preferences:['Culture'],sights:[]});const nature=createPlan({...base,cities:['hangzhou'],preferences:['Nature'],sights:[]});assert.notEqual(culture.days[0].title,nature.days[0].title);
 for(const c of cities){assert.ok(photoFor(c.slug));assert.ok((await readFile('public'+c.image)).length>1000);assert.ok(c.highlights.length>=8,c.slug);assert.equal(new Set(c.highlights.map(h=>h.name)).size,c.highlights.length);assert.ok(c.guide.foods.length>=3);assert.ok(c.guide.areas.length>=2);assert.equal(c.guide.transport.length,3);assert.ok(c.guide.routes.length>=2);assert.ok(c.guide.sources.length>0);assert.ok(c.description.length>180);}
 const excursion=createPlan({...base,days:3,end:'2026-10-17',cities:['chengdu'],sights:['Sanxingdui Museum'],preferences:[]});const excursionDay=excursion.days.find(d=>d.title==='Sanxingdui Museum');assert.ok(excursionDay);assert.ok(excursionDay.afternoon.includes('journey back'));
 const origin=process.env.TEST_ORIGIN||'http://localhost:3001';
 const invalid=await fetch(origin+'/api/itinerary',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...base,days:0})});assert.equal(invalid.status,400);
 const valid=await fetch(origin+'/api/itinerary',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(base)});assert.equal(valid.status,200);assert.equal((await valid.json()).days.length,7);
 const unpaid=await fetch(origin+'/api/download?session_id=cs_fake');assert.equal(unpaid.status,403);
 const bypass=await fetch(origin+'/api/pdf',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind:'guide',preview:false})});assert.equal(bypass.status,403);
 const sample=await fetch(origin+'/api/pdf',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind:'itinerary-preview',input:base})});assert.equal(sample.status,200);assert.match(sample.headers.get('Content-Type')||'',/application\/pdf/);const bytes=Buffer.from(await sample.arrayBuffer());assert.equal(bytes.subarray(0,4).toString(),'%PDF');
 console.log('Passed: planner constraints, preference ordering, 42 expanded guides and image records, dedicated excursion scheduling, API validation, payment gates, PDF output.');
}main().catch(e=>{console.error(e);process.exit(1)});
