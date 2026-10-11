/** Controlled identity regressions; these fixtures are not live destination facts. */
import assert from 'node:assert/strict';
import { findGooglePlace, googlePlaceMatches, normalizeGooglePlace, photosForGooglePlaces } from '../src/lib/travel/google-maps';
import { refreshTrip } from '../src/lib/travel/concierge';
import { configurePhotoFixture, photoScreeningFixture } from './fixtures/photo-screening';
const originalFetch=globalThis.fetch,originalKey=process.env.GOOGLE_MAPS_SERVER_API_KEY;
const restorePhotoFixture=configurePhotoFixture();
const museum={id:'ChIJowMUgi2nZDYRxz_j6XQ-48M',displayName:{text:'秦始皇帝陵博物院'},formattedAddress:'陕西省西安市临潼区',location:{latitude:34.3841153,longitude:109.2784918},types:['museum','tourist_attraction'],addressComponents:[{shortText:'CN',types:['country']},{longText:'西安市',types:['locality']}]};
const street={id:'ChIJ1S7X6oY0kzYRIyiS3lG6Abg',displayName:{text:'解放碑步行街'},formattedAddress:'重庆市渝中区',location:{latitude:29.557651,longitude:106.577595},types:['tourist_attraction'],addressComponents:[{shortText:'CN',types:['country']},{longText:'重庆市',types:['administrative_area_level_1']}]};
const monument={...street,id:'ChIJF9m5kYY0kzYR2dJCCVtOmpA',displayName:{text:'抗战胜利纪功碑暨人民解放纪念碑'},location:{latitude:29.5572748,longitude:106.5770535},types:['historical_landmark','historical_place']};
async function main(){
 process.env.GOOGLE_MAPS_SERVER_API_KEY='controlled-key';
 let museumResult= museum,anchorAvailable=true,wrongPhotoOwner=false;
 const queriedPhotoIds:string[]=[];
 globalThis.fetch=async(input,init)=>{
  const url=new URL(String(input)),body=init?.body?JSON.parse(String(init.body)):undefined;
  const screened=photoScreeningFixture(url,init);if(screened)return screened;
  if(url.pathname.endsWith(':searchText'))return Response.json({places:/解放碑|Jiefangbei/i.test(body.textQuery)?[street]:[museumResult]});
  const id=url.pathname.split('/')[3],mask=(init?.headers as Record<string,string>)['X-Goog-FieldMask'];
  if(url.pathname.endsWith('/media'))return Response.json({photoUri:`https://lh3.googleusercontent.com/${id===monument.id?'monument':'department-store'}`});
  if(mask==='photos'){queriedPhotoIds.push(id);return Response.json({photos:[{name:`places/${wrongPhotoOwner?museum.id:id}/photos/controlled-photo`,authorAttributions:[{displayName:'Controlled author',uri:'https://maps.google.com/maps/contrib/test'}]}]});}
  if(id===monument.id)return anchorAvailable?Response.json(monument):new Response('',{status:503});
  if(id===street.id)return Response.json(street);
  return Response.json(museumResult);
 };
 assert.equal((await findGooglePlace('秦始皇兵马俑博物馆','西安'))?.id,museum.id,'Museum common name must resolve to the official museum, not be dropped');
 assert.equal((await findGooglePlace('Terracotta Warriors Museum',"Xi'an"))?.id,museum.id,'English common name resolves to the same museum');
 const englishStreet={...street,displayName:{text:'Jiefangbei Pedestrian Street'},addressComponents:[{shortText:'CN',types:['country']},{longText:'Chong Qing Shi',types:['administrative_area_level_1']}]};
 const normalizedStreet=normalizeGooglePlace(englishStreet)!;
 assert.equal(normalizedStreet.region?.city,'重庆','Google Latin administrative spelling must retain its city identity');
 assert(googlePlaceMatches(normalizedStreet,'Jiefangbei Pedestrian Street','Chongqing'));
 assert(!googlePlaceMatches({...normalizedStreet,name:'Unrelated Jiefangbei Pedestrian Street shop'},'Jiefangbei Pedestrian Street','Chongqing','visit',true),'Restored IDs cannot match adjacent businesses by a substring');
 assert.equal(await findGooglePlace('秦始皇兵马俑博物馆','上海'),undefined,'Alias cannot bypass city checks');
 museumResult={...museum,displayName:{text:'秦始皇兵马俑博物馆停车场'},types:['parking']};
 assert.equal(await findGooglePlace('秦始皇兵马俑博物馆','西安'),undefined,'Museum parking is not the museum');
 museumResult={...museum,location:{latitude:34.26,longitude:108.94}};
 assert.equal(await findGooglePlace('秦始皇兵马俑博物馆','西安'),undefined,'A same-name result in central Xian is not the Lintong museum');
 museumResult=museum;
 const plan=await refreshTrip({title:'Keep my trip',days:[{city:'西安',title:'Museum visit',stops:[{name:'Terracotta Warriors Museum',search:'秦始皇兵马俑博物馆',googlePlaceId:museum.id,at:'09:00',durationMinutes:180,booked:true,bookingNote:'My existing ticket'}]}]},'en');
 assert.equal(plan.days[0].stops[0].place?.id,museum.id,'Restored common-name stop retains its verified place ID');
 assert.equal(plan.days[0].stops[0].name,'Terracotta Warriors Museum');assert(plan.days[0].stops[0].booked);assert.equal(plan.days[0].stops[0].bookingNote,'My existing ticket');
 const photo=(await photosForGooglePlaces([street.id]))[street.id];
 assert.equal(photo?.url,'https://lh3.googleusercontent.com/monument','Street card must not use the adjacent department-store first photo');
 assert.equal(photo?.authors?.[0].name,'Controlled author');
 assert.equal(photo?.subject?.nameEnglish,'Jiefangbei Monument · pedestrian street center','Separate photo subject must be disclosed');
 assert(queriedPhotoIds.includes(monument.id));assert(!queriedPhotoIds.includes(street.id));
 anchorAvailable=false;
 assert.equal((await photosForGooglePlaces([street.id]))[street.id],undefined,'Missing verified landmark photo must not fall back to a misleading storefront');
 anchorAvailable=true;wrongPhotoOwner=true;
 assert.equal((await photosForGooglePlaces([street.id]))[street.id],undefined,'A photo resource owned by another place is not accepted');
 console.log('PASS: museum aliases, city/type/location rejection, restored user choices, district photo subject/attribution and missing-anchor protection. Controlled evidence only.');
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{restorePhotoFixture();globalThis.fetch=originalFetch;if(originalKey===undefined)delete process.env.GOOGLE_MAPS_SERVER_API_KEY;else process.env.GOOGLE_MAPS_SERVER_API_KEY=originalKey;});
