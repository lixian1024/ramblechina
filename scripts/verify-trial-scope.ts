import assert from 'node:assert/strict';
import {assertGuestScope, guestTrialScope, assertGuestResultScope} from '../src/lib/growth/trial-scope';
import cities from '../src/lib/travel/cities.json';
import type {TripMessage, VerifiedTrip} from '../src/lib/travel/concierge-types';

const messages = (text: string): TripMessage[] => [{role: 'user', text}];
const previous = {days: [{city: 'Shanghai'}, {city: 'Shanghai'}, {city: 'Shanghai'}]};
const rejects = (text: string, old: unknown = null) => assert.throws(() => assertGuestScope(messages(text), old), (error: unknown) => error instanceof Error && 'status' in error && error.status === 400, text);

// Every shared city identity must be denied before model/provider work, rather
// than silently omitted from a Shanghai-only result.
for (const city of cities.filter(city => city.slug !== 'shanghai')) {
  rejects(`Plan three days in Shanghai and ${city.name}`);
  rejects(`上海和${city.chinese}三天`);
}
for (const text of ['Plan three days in Shanghai and Atlantis', 'three days in shanghai and atlantis', 'Atlantis and Shanghai for three days', '上海和火星玩三天', '上海三天，然后去一个未知城市', 'Shanghai for three days, add a day trip to neverland', 'three days in Shanghai and another city', 'two days Shanghai; fly to Tokyo', 'three days in Shanghai then travel elsewhere', 'three days in Shanghai / kyoto', 'three days in Shanghai, add Narnia', '3 days in Shanghai plus an unknown destination']) rejects(text);
for (const directive of ['Spend day 2 in Paris.', 'Stay in Paris.', 'Stay near Atlantis.', 'Continue on to Paris.', 'Continue on Atlantis.', 'Replace day 2 with Paris.', 'Change the second day to Atlantis.', 'Day 2: Paris.', 'Paris on day 2.', 'Keep day one in Shanghai; spend the second day in Atlantis.', 'Add local food in Paris.', 'Visit a museum near Atlantis.']) rejects(`3 days in Shanghai. ${directive}`);
for (const directive of ['第二天在巴黎。', '住在巴黎。', '住巴黎。', '继续前往火星。', '把第二天换成巴黎。', '第二天改为火星。', '第二天：巴黎。', '第一天外滩，第二天巴黎。', '去巴黎吃当地美食。', '在巴黎的博物馆。']) rejects(`上海三天。${directive}`);
for (const text of ['Plan eleven days in Shanghai', 'Shanghai 11 days', '上海十一天', 'Shanghai 0 days', 'Shanghai 4 days', 'Plan Shanghai', 'Plan three days in Beijing']) rejects(text);
for (const text of ['Plan three days in Shanghai with easy walking and local food.', '上海三天，喜欢美食，不喜欢博物馆', 'Plan two days in Shanghai, I like food and architecture.', 'Shanghai one day with a child', 'Shanghai three days, vegetarian food, no museums', 'Plan 3 days in Shanghai starting 2026-11-01', 'Shanghai three days. Spend day 2 in Pudong.', 'Shanghai three days. Stay in Shanghai.', '上海三天。第二天在浦东，第三天休息。']) assert.doesNotThrow(() => assertGuestScope(messages(text), null), text);
for (const text of ['Plan three days in Shanghai with my parents. We stay near the Bund, have Yu Garden tickets for Day 1 at 10:00, and want easy walking and a river view.', '我住在上海外滩附近，带父母玩三天，第一天10点预约了豫园。希望少走路，留点时间看江景。', 'Shanghai three days starting 2026-11-01. Yu Garden is booked at 9am.', 'Shanghai three days. Start at 09:30; rest in the afternoon.', '上海三天，第一天10:30预约了豫园。', '上海三天。第一天上午在外滩，第二天下午参观博物馆。']) assert.doesNotThrow(() => assertGuestScope(messages(text), null), text);
for (const text of ['Remove museums from day two', 'Replace the museum with a park', '第二天不要博物馆', 'Keep everything else; more rest breaks', 'Make Day 1 easier but keep every booked ticket fixed']) assert.doesNotThrow(() => assertGuestScope(messages(text), previous), text);
for (const text of ['Shanghai three days. At 10:00 in Paris.', 'Shanghai three days. Spend day 2 in Pudong and Atlantis.', '上海三天。第一天10点在巴黎。', '上海三天。第二天下午去火星。', '上海三天。第二天在浦东和巴黎。']) rejects(text);
for (const text of ['Shanghai three days. Visit the Bund and Yu Garden.', 'Shanghai three days with food and architecture and a river view.', '上海三天。第二天在外滩和豫园。']) assert.doesNotThrow(() => assertGuestScope(messages(text), null), text);
for (const text of ['3 days in Shanghai. I like walking around historic streets.', 'Shanghai three days. Walk around old streets and riverside parks.', 'Shanghai three days. Spend day 2 in quiet neighborhoods.', 'Shanghai three days. Stay near art galleries and restaurants.', '上海三天。第二天去老街散步，第三天看江景。', '上海三天。第一天在历史街区散步。']) assert.doesNotThrow(() => assertGuestScope(messages(text), null), text);
rejects('Add Wuhan on day two', previous);
rejects('Add a day trip to Atlantis', previous);
assert.doesNotThrow(() => assertGuestScope([{role:'user',text:'Shanghai three days'}, {role:'assistant',text:'Beijing is outside the trial.'}, {role:'user',text:'Keep it relaxed'}], previous), 'Assistant prose cannot introduce or override destinations');
const scope = guestTrialScope(messages('Shanghai three days'), null);
assert.deepEqual(scope, {city: 'shanghai', days: 3});
assert.deepEqual(guestTrialScope(messages('Remove museums from day two'), previous), {city:'shanghai', days:3});
const plan: VerifiedTrip = {title:'Shanghai', summary:'A local trip', checks:[], createdAt:'2026-10-23T00:00:00Z', provider:'Google + Amap', days:[1,2,3].map(number => ({id:`day-${number}`,city:'上海',cityEnglish:'Shanghai',title:'Local visit',kind:'visit',weather:{status:'date-needed'},checks:[],legs:[],stops:[{id:`stop-${number}`,name:'The Bund',search:'外滩',durationMinutes:60,placeStatus:'matched',place:{id:`place-${number}`,name:'外滩',address:'Shanghai',point:{lat:31.24,lng:121.49},adcode:'310101',citycode:'021',region:{city:'上海',district:'黄浦区'},checkedAt:'2026-10-23T00:00:00Z'}}]}))};
assert.doesNotThrow(() => assertGuestResultScope(plan, scope));
for (const mutate of [
  (trip: VerifiedTrip) => {trip.days[1].city='巴黎上海';},
  (trip: VerifiedTrip) => {trip.days[1].cityEnglish='Paris';},
  (trip: VerifiedTrip) => {trip.days.pop();},
  (trip: VerifiedTrip) => {trip.days[0].stops[0].place=undefined;trip.days[0].stops[0].placeStatus='unresolved';},
  (trip: VerifiedTrip) => {trip.days[0].stops[0].place!.region!.city='Paris';},
  (trip: VerifiedTrip) => {trip.days[0].stops[0].place!.adcode='110101';},
  (trip: VerifiedTrip) => {trip.days[0].stops[0].place!.point={lat:48.85,lng:2.35};},
  (trip: VerifiedTrip) => {trip.days[0].intercityMode='rail';},
  (trip: VerifiedTrip) => {trip.days[0].hotelPlace={...trip.days[0].stops[0].place!,region:{city:'Paris'}};},
]) {
  const changed=structuredClone(plan);mutate(changed);
  assert.throws(() => assertGuestResultScope(changed, scope), 'Unproven/outside location or wrong day count cannot be presented as a Shanghai trial result');
}
console.log('PASS: supported/unknown destination rejection, bilingual location directives and bounds400, fixed server scope, map-proven Shanghai result guard and safe local edits.');
