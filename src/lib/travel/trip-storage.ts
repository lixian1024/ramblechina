import type { TripMessage, VerifiedTrip } from './concierge-types';
/** Retain user choices and permitted place IDs; fetch provider content again on restore. */
export function storedTrip(plan:VerifiedTrip|null):VerifiedTrip|null {
 if(!plan)return null;
 return {...plan,provider:'Google + Amap',checks:[],days:plan.days.map(day=>({
  ...day,hotelGooglePlaceId:day.hotelPlace?.provider==='Google'?day.hotelPlace.id:day.hotelGooglePlaceId,
  hotelPlace:undefined,dining:undefined,weather:{status:day.date?'unavailable':'date-needed'},checks:[],transfer:undefined,
  stops:day.stops.map(stop=>({...stop,googlePlaceId:stop.place?.provider==='Google'?stop.place.id:stop.googlePlaceId,place:undefined,placeStatus:'unresolved',scheduledAt:undefined})),
  legs:day.legs.map(leg=>({from:leg.from,to:leg.to,mode:'unverified'})),
 }))};
}

export function storedMessages(messages:TripMessage[]):TripMessage[] {
 return messages.map(message => message.role==='assistant' && message.sources?.some(source=>/google\.com\/maps/.test(source.url))
  ? {...message,text:'Earlier map listings need a fresh lookup.',sources:undefined} : message);
}
