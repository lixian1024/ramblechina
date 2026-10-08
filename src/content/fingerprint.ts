import {createHash} from 'node:crypto';
import {places,entrances,day,budget,version} from '@/lib/content/beijing-day';
/** Hash the facts that require localized operational copy to be checked again. */
export function beijingFactFingerprint(){const facts={version,places:places.map(p=>({id:p.id,zh:p.name.zh,address:p.address,reservation:p.reservation,access:p.access,entranceIds:p.entranceIds})),entrances:entrances.map(e=>({id:e.id,zh:e.name.zh,role:e.role,mapQuery:e.mapQuery,approach:e.approach,vehicleDropoff:e.vehicleDropoff})),route:day.stops.map(s=>({id:s.id,placeId:s.placeId,entranceId:s.entranceId})),budget:budget.map(b=>({id:b.id,range:b.range,unit:b.unit}))};return createHash('sha256').update(JSON.stringify(facts)).digest('hex')}
