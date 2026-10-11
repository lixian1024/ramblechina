// Legacy module path retained for the Beijing pilot; requests exclusively use Google.
import { GoogleMapsError, googleConfigured, searchGooglePlaces, googlePlaceDetails, googleRoute } from '../travel/google-maps';
import type { VerifiedStop } from '../travel/concierge-types';
import type { AmapPoi,AmapWalk } from './types';
export { GoogleMapsError as AmapError };
export const configured=googleConfigured;
function poi(p:NonNullable<VerifiedStop['place']>):AmapPoi {
 return {id:p.id,name:p.name,address:p.address,district:p.region?.district||'',type:p.category||'',coordinates:{longitude:p.point.lng,latitude:p.point.lat,system:'WGS84'},telephone:'',openingHours:p.openingHours||'',provider:'Google',fetchedAt:p.checkedAt};
}
export async function searchPlaces(query:string){return (await searchGooglePlaces(query,'北京')).filter(p=>p.adcode==='110000'&&p.point.lng>=115&&p.point.lng<=118&&p.point.lat>=39&&p.point.lat<=42).map(poi);}
export async function walkBetweenGates(originId:string,destinationId:string):Promise<AmapWalk>{
 const [a,b]=await Promise.all([googlePlaceDetails(originId),googlePlaceDetails(destinationId)]);
 if(!a||!b)throw new GoogleMapsError('NO_PLACE','The selected place is no longer available.',404);
 if(a.adcode!=='110000'||b.adcode!=='110000'||!/神武门|shenwumen/i.test(a.name)||!/景山|jingshan/i.test(b.name)||!/南门|south gate/i.test(b.name)||Math.abs(a.point.lng-b.point.lng)>.03||Math.abs(a.point.lat-b.point.lat)>.03)throw new GoogleMapsError('WRONG_GATE','Choose Shenwumen exit and Jingshan south gate.',400);
 const route=await googleRoute('walking',a,b);
 if(!route||route.metres===undefined)throw new GoogleMapsError('NO_ROUTE','Google did not return a usable walking route.');
 return {distanceMetres:route.metres,durationSeconds:route.durationSeconds,steps:route.steps,coordinates:(route.geometry||[]).filter(s=>s.kind==='route').flatMap(s=>s.points.map(p=>({longitude:p.lng,latitude:p.lat,system:'WGS84' as const}))),provider:'Google',fetchedAt:route.checkedAt,origin:poi(a),destination:poi(b)};
}
