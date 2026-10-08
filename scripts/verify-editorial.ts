import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {editions} from '../src/content/editorial/en/cities';
import {essentials,toolkit} from '../src/content/editorial/en/essentials';
import {createPlan} from '../src/lib/travel/planner';
import photos from '../src/lib/travel/photos.json';
const imageBySlug=new Map(photos.map(p=>[p.slug,p]));
for(const [slug,edition] of Object.entries(editions)){
 assert.equal(edition.slug,slug);assert.equal(edition.months.length,12,`${slug}: twelve months`);assert.equal(edition.days.length,4,`${slug}: day counts`);assert(edition.experiences.length>=8&&edition.experiences.length<=15,`${slug}: experience count`);assert(edition.foods.length>=5,`${slug}: food coverage`);assert(edition.stays.length>=3,`${slug}: stay coverage`);assert(edition.routes.length>=3,`${slug}: route coverage`);
 const ids=new Set<string>();let credited=0;for(const e of edition.experiences){assert(!ids.has(e.id),`${slug}: duplicate ${e.id}`);ids.add(e.id);assert(e.name&&e.zh&&e.mapQuery&&e.how&&e.booking,`${slug}: incomplete ${e.id}`);if(e.photo){const p=imageBySlug.get(e.photo);if(p){assert(existsSync('public'+p.file),`${slug}: missing image ${e.photo}`);assert(p.author&&p.license&&p.source,`${slug}: missing image credit ${e.photo}`);credited++;}}if(e.source)assert(e.source.startsWith('https://'),`${slug}: source must be https`)}
 assert(credited>=5,`${slug}: fewer than five licensed experience photos`);for(const route of edition.routes)for(const id of route.stops)assert(ids.has(id),`${slug}: unknown route stop ${id}`);for(const source of edition.sources)assert(source.url.startsWith('https://'));
}
assert.equal(essentials.length,11);assert.equal(toolkit.length,7);for(const topic of essentials){assert(topic.steps.length>=3&&topic.whenItFails&&topic.sources.length);for(const source of topic.sources)assert(source.url.startsWith('https://'))}
const input={days:7,people:2,budget:12000,start:'2026-10-15',end:'2026-10-21',cities:['beijing','shanghai','xian'],preferences:['History','Food','Photography'],sights:[]};const plan=createPlan(input);assert(plan.days.some(d=>d.field?.chinese));assert(plan.days.filter(d=>d.transfer).every(d=>d.field?.luggage));assert.throws(()=>createPlan({...input,people:11}),/people/);
const page=readFileSync('src/app/[locale]/destinations/[slug]/page.tsx','utf8');assert(page.includes('CityFieldGuide'));
console.log('PASS: three complete field editions, 11 essentials, 7 toolkit cards, licensed photos, route references and itinerary field notes.');
