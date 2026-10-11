'use client';
import { importLibrary, setOptions } from '@googlemaps/js-api-loader';
export const browserMapKey=process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim()||'';
let configured=false;
export function loadGoogleMaps(){
 if(!browserMapKey)return Promise.reject(new Error('Google Maps browser key is not configured'));
 if(!configured){setOptions({key:browserMapKey,v:'quarterly',language:'en',region:'CN'});configured=true;}
 return importLibrary('maps');
}
