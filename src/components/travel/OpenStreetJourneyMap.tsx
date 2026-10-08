'use client';
import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LocateFixed, WifiOff } from 'lucide-react';
import { findCity } from '@/lib/travel/data';
import { dayColors, placeById, type Journey, type Point } from '@/lib/travel/workbench';
import styles from './Planner.module.css';

type Props={journey:Journey;dayIndex:number;overview:boolean;selected:string|null;onSelect:(id:string,day:number)=>void;pinning:boolean;onPin:(point:Point)=>void};
export default function JourneyMap(props:Props){
 const host=useRef<HTMLDivElement>(null),map=useRef<L.Map|null>(null),layers=useRef<L.LayerGroup|null>(null),latest=useRef(props),geometry=useRef(''),bounds=useRef<L.LatLngBounds|null>(null);
 const [unavailable,setUnavailable]=useState(false);
 useEffect(()=>{latest.current=props;},[props]);
 useEffect(()=>{
  if(!host.current)return;
  const instance=L.map(host.current,{zoomControl:false,scrollWheelZoom:false,attributionControl:true}).setView([31.23,121.48],13);
  map.current=instance;
  const tiles=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,keepBuffer:1,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>'}).addTo(instance);
  tiles.on('tileerror',()=>setUnavailable(true));tiles.on('tileload',()=>setUnavailable(false));
  L.control.zoom({position:'bottomright'}).addTo(instance);L.control.scale({position:'bottomleft',imperial:false}).addTo(instance);
  layers.current=L.layerGroup().addTo(instance);
  instance.on('click',(e:L.LeafletMouseEvent)=>{if(latest.current.pinning)latest.current.onPin([e.latlng.lat,e.latlng.lng]);});
  const observer=new ResizeObserver(()=>instance.invalidateSize());observer.observe(host.current);
  return()=>{observer.disconnect();instance.remove();map.current=null;layers.current=null;};
 },[]);
 useEffect(()=>{
  const instance=map.current,group=layers.current;if(!instance||!group)return;group.clearLayers();
  const points:Point[]=[];
  const shown=props.overview?props.journey.days:props.journey.days.filter((_,i)=>i===props.dayIndex);
  for(const day of shown){
   const dayIndex=props.journey.days.findIndex(d=>d.id===day.id),color=dayColors[dayIndex%dayColors.length];
   const hotel=props.journey.hotels[day.city];const path:Point[]=[];if(hotel?.point){path.push(hotel.point);points.push(hotel.point);}
   day.stops.forEach((stop,i)=>{
    const place=placeById(stop.placeId);if(!place?.point)return;points.push(place.point);path.push(place.point);
    const active=props.selected===stop.id;
    const marker=L.marker(place.point,{title:place.name,keyboard:true,riseOnHover:true,zIndexOffset:active?1000:100,icon:L.divIcon({className:'journey-pin-shell',iconSize:[36,42],iconAnchor:[18,39],html:`<span class="journey-pin ${active?'is-selected':''}" style="--pin-color:${color}">${props.overview?`${dayIndex+1}.${i+1}`:i+1}</span>`})});
    const tip=document.createElement('span');tip.textContent=place.name;marker.bindTooltip(tip,{direction:'top',offset:[0,-34],className:'journey-tooltip'});
    marker.on('click',()=>latest.current.onSelect(stop.id,dayIndex));marker.addTo(group);marker.getElement()?.setAttribute('aria-label',`Day ${dayIndex+1}, stop ${i+1}: ${place.name}`);
   });
   if(path.length>1)L.polyline(path,{color,weight:3,opacity:.72,dashArray:'6 9',interactive:false}).addTo(group);
  }
  const hotelCities=[...new Set(shown.map(d=>d.city))];
  for(const city of hotelCities){const hotel=props.journey.hotels[city];if(!hotel?.point)continue;const marker=L.marker(hotel.point,{title:hotel.name||'Your hotel',icon:L.divIcon({className:'journey-pin-shell',iconSize:[36,36],iconAnchor:[18,18],html:'<span class="journey-hotel-pin">H</span>'})});const tip=document.createElement('span');tip.textContent=hotel.name||'Your hotel';marker.bindTooltip(tip,{direction:'top'}).addTo(group);}
  const signature=JSON.stringify([props.overview,props.dayIndex,points]);
  if(signature!==geometry.current){geometry.current=signature;if(points.length){bounds.current=L.latLngBounds(points);instance.fitBounds(bounds.current,{paddingTopLeft:[55,65],paddingBottomRight:[55,65],maxZoom:14,animate:true});}else{const city=findCity(props.journey.days[props.dayIndex].city)!;instance.setView([city.lat,city.lng],11);bounds.current=null;}}
 },[props.journey,props.dayIndex,props.overview,props.selected]);
 useEffect(()=>{const instance=map.current;if(!instance||!props.selected)return;const stop=props.journey.days.flatMap(d=>d.stops).find(s=>s.id===props.selected);const point=stop&&placeById(stop.placeId)?.point;if(point&&!instance.getBounds().contains(point))instance.panTo(point);},[props.selected,props.journey]);
 return <div className={`${styles.mapSurface} ${props.pinning?styles.pinning:''}`}>
  <div ref={host} className={styles.leafletMap} aria-label="Interactive itinerary map. Numbered pins match the itinerary; dashed lines show visit order."/>
  <button className={styles.recenter} aria-label="Fit itinerary on map" onClick={()=>{if(bounds.current)map.current?.fitBounds(bounds.current,{padding:[65,65],maxZoom:14});}}><LocateFixed size={18}/></button>
  {props.pinning&&<div className={styles.pinPrompt}>Click your hotel’s location on the map</div>}
  {unavailable&&<div className={styles.mapOffline}><WifiOff size={15}/> Street tiles could not load. Your place pins are still available.</div>}
 </div>;
}
