/** Controlled failures and photo identity; no claim of live visual accuracy. */
import assert from 'node:assert/strict';
import { photoSelection } from '../src/lib/travel/photo-screening';
import { photosForGooglePlaces, findGooglePlace, googlePlaceMatches, normalizeGooglePlace } from '../src/lib/travel/google-maps';
import { POST } from '../src/app/api/trip-place-photos/route';
import { configurePhotoFixture, photoScreeningFixture } from './fixtures/photo-screening';
const originalFetch=globalThis.fetch,originalKey=process.env.GOOGLE_MAPS_SERVER_API_KEY;
const restore=configurePhotoFixture();
const garden={id:'TEST_GARDEN',displayName:{text:'豫园'},formattedAddress:'上海市黄浦区安仁街218号',types:['botanical_garden','tourist_attraction'],location:{longitude:121.492094,latitude:31.2272355},addressComponents:[{shortText:'CN',types:['country']},{longText:'上海市',types:['locality']},{longText:'黄浦区',types:['sublocality_level_1']}]};
const district={...garden,id:'TEST_DISTRICT',types:['sublocality_level_2','political'],location:{longitude:121.48776,latitude:31.22535}};
async function main(){
 process.env.GOOGLE_MAPS_SERVER_API_KEY='controlled-google-key';
 const good={verdict:'match',selectedIndex:1,confidence:.99,visibleEvidence:'Recognizable garden pavilions and rockery'};
 for(const bad of [{...good,verdict:'uncertain'},{...good,confidence:.94},{...good,confidence:NaN},{...good,confidence:Infinity},{...good,confidence:'0.99'},{...good,selectedIndex:3},{...good,selectedIndex:-1},{...good,selectedIndex:null},{...good,visibleEvidence:''},null])assert.equal(photoSelection(bad,3),undefined,'Uncertain/malformed choices cannot reveal an image');
 assert.equal(photoSelection(good,3)?.index,1);
 const meixin=normalizeGooglePlace({...garden,id:'TEST_MEIXIN',displayName:{text:'Mexin Wine Town'},types:['park'],location:{longitude:107.184641,latitude:29.6621833},addressComponents:[{shortText:'CN',types:['country']},{longText:'Chong Qing Shi',types:['administrative_area_level_1']}]})!;
 assert(googlePlaceMatches(meixin,'Meixin Wine Town','Chongqing','visit',true));
 assert(!googlePlaceMatches({...meixin,name:'美心红酒小镇售票处',category:'tourist_attraction'},'Meixin Wine Town','Chongqing'),'Ticket offices cannot substitute for the town');
 assert(!googlePlaceMatches({...meixin,name:'美心红酒小镇',point:{lng:106.57,lat:29.56}},'Meixin Wine Town','Chongqing'),'A city-center result cannot substitute for Fuling');
 const valley=normalizeGooglePlace({...garden,id:'TEST_VALLEY',displayName:{text:'Jiuzhai Valley National Park'},types:['national_park'],location:{longitude:103.9185994,latitude:33.2600421},addressComponents:[{shortText:'CN',types:['country']},{longText:'Ngawa Tibetan and Qiang Autonomous Prefecture',types:['locality']},{longText:'Jiuzhaigou County',types:['administrative_area_level_3']}]})!;
 assert.equal(valley.region?.city,'九寨沟');assert(googlePlaceMatches(valley,'Jiuzhaigou Valley','Jiuzhaigou','visit',true));
 assert(!googlePlaceMatches({...valley,name:'Jiuzhaigou County',category:'political'},'Jiuzhaigou Valley','Jiuzhaigou'),'The whole county is not the valley');
 let vision:unknown=good,providerFailure=false,wrongOwner=false,wrongReturnedId=false;
 let visionCalls=0,mediaCalls=0,fallbackSearch=false;
 globalThis.fetch=async(input,init)=>{
  const url=new URL(String(input));
  if(url.pathname.endsWith('/chat/completions')){
   visionCalls++;if(providerFailure)throw new Error('Controlled model outage');
   const body=JSON.parse(String(init?.body));assert.equal(body.model,'qwen3.8-flash');assert(!JSON.stringify(body).includes('controlled-google-key'));
   assert.equal(body.messages[1].content.filter((p:{type:string})=>p.type==='image_url').length,3);
   return Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify(vision)}}]});
  }
  const screened=photoScreeningFixture(url,init);if(screened)return screened;
  const id=url.pathname.split('/')[3],mask=(init?.headers as Record<string,string>)['X-Goog-FieldMask'];
  if(url.pathname.endsWith(':searchText')){
   const body=JSON.parse(String(init?.body));fallbackSearch=!!body.strictTypeFiltering;
   return Response.json({places:fallbackSearch?[garden]:[district]});
  }
  if(mask==='photos')return Response.json({photos:[0,1,2].map(index=>({name:`places/${wrongOwner?'WRONG_PLACE':id}/photos/PHOTO_${index}`,authorAttributions:[{displayName:`Author ${index}`}]}))});
  if(url.pathname.endsWith('/media')){mediaCalls++;return Response.json({photoUri:`https://lh3.googleusercontent.com/${url.pathname.split('/')[5]}`});}
  if(id==='TEST_GENERIC')return Response.json({...garden,id,displayName:{text:url.searchParams.get('languageCode')==='en'?'Example Botanical Garden':'示例植物园'}});
  return Response.json(id===district.id?district:{...garden,...(wrongReturnedId?{id:'WRONG_RETURNED_PLACE'}:{})});
 };
 assert.equal((await findGooglePlace('Yu Garden','Shanghai'))?.id,garden.id,'Same-name administrative district must not stand in for the actual garden');assert(fallbackSearch);
 const context={[garden.id]:{query:'Yu Garden',city:'Shanghai'}};
 const result=(await photosForGooglePlaces([garden.id],context))[garden.id];
 assert(result?.url.endsWith('/PHOTO_1'),'A matching second candidate replaces an unrelated first photo');
 assert.equal(result.authors?.[0].name,'Author 1','Attribution must be for the selected image, not the first candidate');assert.equal(result.placeId,garden.id);assert.equal(result.screening,'visual-match');
 assert((await photosForGooglePlaces(['TEST_GENERIC'],{TEST_GENERIC:{query:'Example Botanical Garden',city:'Shanghai'}})).TEST_GENERIC,'A supplier English name can pass the same exact identity gate without inventing an alias');
 const before=visionCalls;
 assert.equal((await photosForGooglePlaces([garden.id],{[garden.id]:{query:'Different Garden',city:'Shanghai'}}))[garden.id],undefined);
 assert.equal((await photosForGooglePlaces([district.id]))[district.id],undefined,'An administrative Yu Garden has no garden photo');assert.equal(visionCalls,before);
 wrongReturnedId=true;assert.equal((await photosForGooglePlaces([garden.id],context))[garden.id],undefined,'A details response for a different ID cannot supply this place photo');assert.equal(visionCalls,before);wrongReturnedId=false;
 vision={...good,verdict:'uncertain',selectedIndex:null};assert.equal((await photosForGooglePlaces([garden.id],context))[garden.id],undefined,'No visual match cannot fall back to first photo');
 providerFailure=true;assert.equal((await photosForGooglePlaces([garden.id],context))[garden.id],undefined,'Model outage cannot display unreviewed photos');providerFailure=false;
 wrongOwner=true;const beforeMedia=mediaCalls;assert.equal((await photosForGooglePlaces([garden.id],context))[garden.id],undefined);assert.equal(mediaCalls,beforeMedia,'Cross-place photo resources must never be loaded');
 const invalid=await POST(new Request('http://controlled/api/trip-place-photos',{method:'POST',body:JSON.stringify({places:[{id:garden.id,query:'',city:'Shanghai'}]})}));assert.equal(invalid.status,400);
 console.log('PASS: garden vs district, expected place identity, second-photo selection, matching author, uncertain/malformed/model-failure rejection and cross-place resource protection. Controlled evidence only.');
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{restore();globalThis.fetch=originalFetch;if(originalKey===undefined)delete process.env.GOOGLE_MAPS_SERVER_API_KEY;else process.env.GOOGLE_MAPS_SERVER_API_KEY=originalKey;});
