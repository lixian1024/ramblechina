/** Reuse historical synthetic POIs while exercising Google request/response contracts.
 * No network is allowed. Legacy fixture URLs exist only inside the fixture callback.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
export const testPlaceId=(id:string)=>/^[A-Za-z0-9_-]{5,255}$/.test(id)?id:id?`TEST-${createHash('sha256').update(id).digest('hex').slice(0,24)}`:'';
const districts:Record<string,string>={'310115':'浦东新区','310101':'黄浦区','310104':'徐汇区','310106':'静安区'};
export function googlePoi(p:Record<string,unknown>){
 const [longitude,latitude]=String(p.location||'').split(',').map(Number),code=String(p.adcode||'310101');
 const city=code.startsWith('33')?'杭州市':code.startsWith('11')?'北京市':'上海市';
 const type=String(p.type||'');
 const types=type.startsWith('交通')?['transit_station']:type.startsWith('住宿')?['lodging']:type.startsWith('购物')?['store']:
  /餐饮服务;(中餐厅|外国餐厅|快餐厅);/.test(type)?['restaurant',/中餐厅/.test(type)?'chinese_restaurant':/日本/.test(type)?'japanese_restaurant':/快餐/.test(type)?'fast_food_restaurant':'restaurant']:
   /甜品|糕饼|蛋糕/.test(type)?['dessert_shop']:/咖啡|茶艺/.test(type)?['cafe']:type.startsWith('餐饮')?['point_of_interest']:['tourist_attraction'];
 return {id:testPlaceId(String(p.id||'')),displayName:{text:p.name},formattedAddress:p.address||'Controlled address',location:{longitude,latitude},types,
 addressComponents:[{longText:'中国',shortText:'CN',types:['country']},{longText:city,types:['locality']},{longText:districts[code]||'',types:['sublocality_level_1']}],
 ...(typeof (p.business as Record<string,unknown>)?.opentime_today==='string'?{regularOpeningHours:{weekdayDescriptions:[(p.business as Record<string,unknown>).opentime_today]}}:{})};
}
export function googleFixtureFetch(legacy:typeof fetch):typeof fetch {
 return async(input,init)=>{
  const url=new URL(String(input));
  if(url.hostname==='restapi.amap.com'){
   assert(['/v3/weather/weatherInfo','/v5/direction/transit/integrated'].includes(url.pathname),'Only retained Amap services may be called');return legacy(input,init);
  }
  if(!['places.googleapis.com','routes.googleapis.com'].includes(url.hostname))return legacy(input,init);
  assert.equal(init?.cache,'no-store');assert((init?.headers as Record<string,string>)['X-Goog-Api-Key']);
  const mask=(init?.headers as Record<string,string>)['X-Goog-FieldMask'];assert(mask&&!mask.includes('*'));
  const body=init?.body?JSON.parse(String(init.body)):undefined;
  const fixture=new URL('https://fixture.invalid');let route=false;
  if(url.pathname==='/v1/places:searchText'){
   assert.equal(init?.method,'POST');assert.equal(body.regionCode,'CN');assert(body.pageSize<=20);
   fixture.pathname='/v5/place/text';const query=body.textQuery.replace(/ 中国$/,'');
   const match=query.match(/^(.*) (上海市?|Shanghai|北京|杭州|中国)$/i);
   fixture.searchParams.set('keywords',match?match[1]:query.trim());fixture.searchParams.set('city_limit','true');
  }else if(url.pathname==='/v1/places:searchNearby'){
   assert.equal(init?.method,'POST');assert.deepEqual(body.includedTypes,['restaurant']);assert(body.maxResultCount<=20);
   const p=body.locationRestriction.circle.center;
   fixture.pathname='/v5/place/around';fixture.searchParams.set('location',`${p.longitude},${p.latitude}`);fixture.searchParams.set('types','050000');
  }else if(url.pathname==='/directions/v2:computeRoutes'){
   assert.equal(init?.method,'POST');assert(['WALK','DRIVE'].includes(body.travelMode));assert(body.origin.location.latLng);assert(body.destination.location.latLng);
   fixture.pathname=body.travelMode==='WALK'?'/v5/direction/walking':'/v5/direction/driving';route=true;
  }else{throw new Error('Unexpected Google fixture endpoint '+url.pathname);}
  const response=await legacy(fixture,init),data=await response.json();
  if(!route)return Response.json({places:(data.pois||[]).map(googlePoi)});
  const p=data.route?.paths?.[0];if(!p)return Response.json({routes:[]});
  return Response.json({routes:[{duration:`${p.cost?.duration??p.duration}s`,distanceMeters:Number(p.distance),legs:[{steps:(p.steps||[]).map((s:Record<string,unknown>)=>({navigationInstruction:{instructions:s.instruction||''}}))}]}]});
 };
}
