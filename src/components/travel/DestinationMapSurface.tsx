'use client';
import {useWebsiteText} from '@/i18n/context';
import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, LocateFixed, Minus, Plus, RotateCw, X } from 'lucide-react';
import Link,{useLocale} from '@/i18n/context';
import {regionChinese} from '@/content/editorial/zh/resolve';
import { loadGoogleMaps } from '@/lib/travel/google-browser';
import type { DestinationMapProps } from './DestinationMap';
import styles from './DestinationMap.module.css';
type Pin={marker:google.maps.OverlayView;button:HTMLButtonElement};
export default function DestinationMapSurface(props:DestinationMapProps){
  const t=useWebsiteText(),locale=useLocale();
 const {cities,selectedSlug}=props;
 const host=useRef<HTMLDivElement>(null),pins=useRef(new Map<string,Pin>()),latest=useRef(props);
 const [runtime,setRuntime]=useState<google.maps.Map|null>(null),[status,setStatus]=useState<'loading'|'ready'|'error'>('loading'),[attempt,setAttempt]=useState(0);
 const selected=cities.find(c=>c.slug===selectedSlug);
 useEffect(()=>{latest.current=props;},[props]);
 useEffect(()=>{
  const element=host.current;if(!element)return;let disposed=false,instance:google.maps.Map|undefined,observer:ResizeObserver|undefined;
  const currentPins=pins.current;
  const timer=window.setTimeout(()=>{if(!disposed)setStatus('error');},20000);
  void loadGoogleMaps().then(({Map})=>{
   if(disposed)return;
   instance=new Map(element,{center:{lng:106,lat:34},zoom:4,minZoom:3,maxZoom:12,mapTypeControl:false,streetViewControl:false,fullscreenControl:false,zoomControl:false,gestureHandling:'cooperative'});
   setRuntime(instance);
   google.maps.event.addListenerOnce(instance,'tilesloaded',()=>{window.clearTimeout(timer);if(!disposed)setStatus('ready');});
   observer=new ResizeObserver(()=>{if(instance&&element.clientWidth&&element.clientHeight)google.maps.event.trigger(instance,'resize');});observer.observe(element);
  }).catch(()=>{if(!disposed)setStatus('error');});
  return()=>{disposed=true;window.clearTimeout(timer);observer?.disconnect();currentPins.forEach(p=>p.marker.setMap(null));currentPins.clear();if(instance)google.maps.event.clearInstanceListeners(instance);element.replaceChildren();};
 },[attempt]);
 useEffect(()=>{
  if(!runtime)return;const currentPins=pins.current;currentPins.forEach(p=>p.marker.setMap(null));currentPins.clear();
  for(const city of cities){
   const button=document.createElement('button');button.type='button';button.className=styles.pin;button.title=city.name;button.setAttribute('aria-label',locale==='zh'?`在地图显示${city.name}`:`Show ${city.name} on map`);
   const dot=document.createElement('span');dot.className=styles.dot;dot.setAttribute('aria-hidden','true');const label=document.createElement('span');label.className=styles.pinLabel;label.textContent=city.name;button.append(dot,label);
   button.onclick=()=>latest.current.onSelect(city.slug);
   class CityPin extends google.maps.OverlayView{
    onAdd(){google.maps.OverlayView.preventMapHitsAndGesturesFrom(button);this.getPanes()?.overlayMouseTarget.append(button);}
    draw(){const pixel=this.getProjection().fromLatLngToDivPixel(new google.maps.LatLng({lng:city.lng,lat:city.lat}));if(pixel){button.style.position='absolute';button.style.left=pixel.x+'px';button.style.top=pixel.y+'px';}}
    onRemove(){button.remove();}
   }
   const marker=new CityPin();marker.setMap(runtime);currentPins.set(city.slug,{marker,button});
  }
  if(cities.length){const bounds=new google.maps.LatLngBounds();cities.forEach(c=>bounds.extend({lng:c.lng,lat:c.lat}));runtime.fitBounds(bounds,45);}else{runtime.setCenter({lng:106,lat:34});runtime.setZoom(4);}
 },[runtime,cities,locale]);
 useEffect(()=>{
  if(!runtime)return;pins.current.forEach((pin,slug)=>{const active=slug===selectedSlug;pin.button.setAttribute('aria-pressed',String(active));pin.button.style.zIndex=active?'500':'100';});
  const city=cities.find(c=>c.slug===selectedSlug);if(city){runtime.setCenter({lng:city.lng,lat:city.lat});runtime.setZoom(7);}
 },[runtime,cities,selectedSlug]);
 const fit=()=>{latest.current.onSelect(null);if(runtime&&cities.length){const bounds=new google.maps.LatLngBounds();cities.forEach(c=>bounds.extend({lng:c.lng,lat:c.lat}));runtime.fitBounds(bounds,45);}};
 return <div className={styles.surface}>
  <div ref={host} className={styles.map} aria-label={t("Interactive Google destination map")}/>
  {status==='loading'&&<div className={styles.loading} role="status">{t("Loading Google Maps…")}</div>}
  {status==='error'&&<div className={styles.message} role="alert"><strong>{t("Google Maps could not load.")}</strong><button onClick={()=>{setStatus('loading');setRuntime(null);setAttempt(a=>a+1);}}><RotateCw size={15}/>{t("Retry map")}</button></div>}
  {status==='ready'&&<><button className={styles.fit} aria-label={t("Fit all matching cities on the map")} onClick={fit}><LocateFixed size={18}/></button><div className={styles.zoom} role="group" aria-label={t("Map zoom")}><button aria-label={t("Zoom in")} onClick={()=>runtime?.setZoom((runtime.getZoom()||4)+1)}><Plus size={18}/></button><button aria-label={t("Zoom out")} onClick={()=>runtime?.setZoom((runtime.getZoom()||4)-1)}><Minus size={18}/></button></div>
   {!cities.length&&<div className={styles.empty} role="status">{t("No cities match. Try another search or region.")}</div>}
   {selected&&<div className={styles.preview} aria-live="polite"><button className={styles.close} aria-label={t("Close city preview")} onClick={()=>props.onSelect(null)}><X size={17}/></button><span className={styles.eyebrow}>{selected.province} · {locale==='zh'?regionChinese[selected.region]:selected.region}</span><h3>{selected.name} {locale!=='zh'&&<span lang="zh-CN">{selected.chinese}</span>}</h3><p>{selected.tagline}</p><Link href={`/destinations/${selected.slug}`} className={styles.cityLink}>{t("Explore")} {selected.name}<ArrowUpRight size={15}/></Link></div>}
  </>}
 </div>;
}
