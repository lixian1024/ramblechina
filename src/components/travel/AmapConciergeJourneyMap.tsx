'use client';

import { useEffect, useRef, useState } from 'react';
import { LocateFixed, Minus, Plus } from 'lucide-react';
import type { MapPoint, VerifiedDay, VerifiedLeg, VerifiedTrip } from '@/lib/travel/concierge-types';
import { hotelLabel, stopLabel, stopNumber } from '@/lib/travel/english-display';
import styles from './Planner.module.css';
import { loadAmap, type AmapSDK, type Coordinate, type MapInstance, type Overlay } from '@/lib/amap/browser';

type Props = {
  plan: VerifiedTrip | null;
  dayIndex: number;
  allDays: boolean;
  selectedStop: number;
  onSelect: (day: number, stop: number) => void;
  zh: boolean;
  apiKey: string;
  englishEnabled: boolean;
  onFailure: () => void;
};

const colors = ['#2f7658', '#c26b43', '#427e9a', '#a07a3c', '#806ba0', '#578b76', '#ad6776', '#647db0', '#99834d', '#4b8b95'];
const coordinate = (point: MapPoint): Coordinate => [point.lng, point.lat];
function placeAt(day: VerifiedDay, from: string): MapPoint | undefined {
  if (from === 'hotel') return day.hotelPlace?.point;
  return day.stops.find(stop => stop.id === from)?.place?.point;
}

function pin(sdk: AmapSDK, map: MapInstance, point: MapPoint, label: string, title: string, color: string, selected: boolean, onClick: () => void): Overlay {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = styles.conciergePin;
  button.textContent = label;
  button.title = title;
  button.setAttribute('aria-label', title);
  button.style.setProperty('--pin-color', color);
  button.dataset.selected = String(selected);
  button.addEventListener('click', onClick);
  const marker = new sdk.Marker({ position: coordinate(point), anchor: 'bottom-center', content: button, bubble: false });
  map.add(marker);
  return marker;
}

function drawLeg(sdk: AmapSDK, map: MapInstance, overlays: Overlay[], leg: VerifiedLeg | undefined, from: MapPoint, to: MapPoint, color: string) {
  const sections = leg?.geometry?.length ? leg.geometry : [{ kind: 'connection' as const, points: [from, to] }];
  for (const section of sections) {
    if (section.points.length < 2) continue;
    const connection = section.kind === 'connection';
    const line = new sdk.Polyline({
      path: section.points.map(coordinate), strokeColor: color,
      strokeWeight: connection ? 2 : 4, strokeOpacity: connection ? .8 : .85,
      strokeStyle: connection ? 'dashed' : 'solid', strokeDasharray: [8, 8],
      lineJoin: 'round', lineCap: 'round', bubble: false,
    });
    map.add(line);
    overlays.push(line);
  }
}

export default function AmapConciergeJourneyMap({ plan, dayIndex, allDays, selectedStop, onSelect, zh, apiKey, englishEnabled, onFailure }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const map = useRef<MapInstance | null>(null);
  const sdk = useRef<AmapSDK | null>(null);
  const overlays = useRef<Overlay[]>([]);
  const fitOverlays = useRef<Overlay[]>([]);
  const signature = useRef('');
  const latest = useRef(onSelect);
  const fail = useRef(onFailure);
  const [ready, setReady] = useState(false);
  useEffect(() => { latest.current = onSelect; fail.current = onFailure; }, [onSelect, onFailure]);

  useEffect(() => {
    const element = host.current;
    if (!element || !apiKey) { fail.current(); return; }
    let disposed = false;
    let observer: ResizeObserver | undefined;
    let wasVisible = false;
    let timer: number | undefined;
    const complete = () => {
      window.clearTimeout(timer);
      if (!disposed) setReady(true);
    };
    void loadAmap(apiKey).then(runtime => {
      if (disposed) return;
      sdk.current = runtime;
      const show = () => {
        if (disposed) return;
        const visible = element.clientWidth > 0 && element.clientHeight > 0;
        if (!visible) { wasVisible = false; return; }
        if (!map.current) {
          try {
            map.current = new runtime.Map(element, {
              viewMode: '2D', zoom: 11, center: [121.47, 31.225],
              ...(englishEnabled ? { languageCode: 'en', logoLanguage: 'en' } : {}),
              zoomEnable: true, dragEnable: true, resizeEnable: true,
            });
            map.current.on('complete', complete);
            timer = window.setTimeout(() => { if (!disposed) fail.current(); }, 20_000);
          } catch { if (!disposed) fail.current(); }
        } else {
          map.current.resize();
          if (!wasVisible && fitOverlays.current.length) map.current.setFitView(fitOverlays.current, true, [48, 48, 48, 48], 15);
        }
        wasVisible = true;
      };
      observer = new ResizeObserver(show);
      observer.observe(element);
      show();
    }).catch(() => { if (!disposed) fail.current(); });
    return () => {
      disposed = true;
      window.clearTimeout(timer);
      observer?.disconnect();
      map.current?.off('complete', complete);
      if (map.current) map.current.destroy();
      map.current = null; sdk.current = null; overlays.current = []; fitOverlays.current = []; signature.current = '';
      element.replaceChildren();
    };
  }, [apiKey, englishEnabled]);

  useEffect(() => {
    const instance = map.current, runtime = sdk.current;
    if (!ready || !instance || !runtime) return;
    if (overlays.current.length) instance.remove(overlays.current);
    overlays.current = []; fitOverlays.current = [];
    const points: MapPoint[] = [];
    const shown = plan ? (allDays ? plan.days : [plan.days[dayIndex]].filter(Boolean)) : [];
    for (const day of shown) {
      const index = plan!.days.indexOf(day);
      const color = colors[index % colors.length];
      if (day.hotelPlace) {
        points.push(day.hotelPlace.point);
        const marker = pin(runtime, instance, day.hotelPlace.point, zh ? '宿' : 'H', `${zh ? '第' : 'Day '}${index + 1}${zh ? '天酒店' : ' hotel'}: ${hotelLabel(day, zh)}`, color, false, () => latest.current(index, 0));
        overlays.current.push(marker); fitOverlays.current.push(marker);
      }
      day.stops.forEach((stop, stopIndex) => {
        if (!stop.place) return;
        points.push(stop.place.point);
        const marker = pin(runtime, instance, stop.place.point, stopNumber(index, stopIndex),
          zh ? `第 ${index + 1} 天，第 ${stopIndex + 1} 站：${stopLabel(stop, day, stopIndex, true)}` : `Day ${index + 1}, stop ${stopIndex + 1}: ${stopLabel(stop, day, stopIndex, false)}`, color, index === dayIndex && stopIndex === selectedStop,
          () => latest.current(index, stopIndex));
        overlays.current.push(marker); fitOverlays.current.push(marker);
      });
      for (const leg of day.legs) {
        const from = placeAt(day, leg.from);
        const to = day.stops.find(stop => stop.id === leg.to)?.place?.point;
        if (from && to) drawLeg(runtime, instance, overlays.current, leg, from, to, color);
      }
      for (let i = 1; i < day.stops.length; i++) {
        const from = day.stops[i - 1].place?.point, to = day.stops[i].place?.point;
        if (from && to && !day.legs.some(leg => leg.from === day.stops[i - 1].id && leg.to === day.stops[i].id)) drawLeg(runtime, instance, overlays.current, undefined, from, to, color);
      }
      if (allDays && index > 0) {
        const previous = plan!.days[index - 1];
        const from = previous.stops.at(-1)?.place?.point || previous.hotelPlace?.point;
        const to = day.hotelPlace?.point || day.stops[0]?.place?.point;
        if (from && to) drawLeg(runtime, instance, overlays.current, day.transfer?.leg, from, to, '#8b795e');
      }
    }
    const nextSignature = JSON.stringify([allDays, allDays ? null : dayIndex, points]);
    if (nextSignature !== signature.current) {
      signature.current = nextSignature;
      if (fitOverlays.current.length) instance.setFitView(fitOverlays.current, true, [48, 48, 48, 48], 15);
      else instance.setZoomAndCenter(11, [121.47, 31.225]);
    }
  }, [ready, plan, dayIndex, allDays, selectedStop, zh]);

  return <div className={styles.interactiveMap}>
    <div ref={host} className={styles.mapCanvas} aria-label={zh ? '可缩放、可拖动的高德行程地图' : 'Zoomable, draggable Amap itinerary map'} />
    {!ready && <div className={styles.mapLoading}>{zh ? '正在加载高德地图…' : 'Loading Amap map…'}</div>}
    {ready && <>
      <button type="button" className={styles.mapFit} onClick={() => map.current?.setFitView(fitOverlays.current, false, [48, 48, 48, 48], 15)} aria-label={zh ? '显示当前视图所有地点' : 'Fit all places in this view'} title={zh ? '显示所有地点' : 'Fit all places'}><LocateFixed size={18} /></button>
      <div className={styles.mapZoomControls} role="group" aria-label={zh ? '地图缩放' : 'Map zoom'}>
        <button type="button" onClick={() => map.current?.zoomIn()} aria-label={zh ? '放大地图' : 'Zoom in'}><Plus size={18} /></button>
        <button type="button" onClick={() => map.current?.zoomOut()} aria-label={zh ? '缩小地图' : 'Zoom out'}><Minus size={18} /></button>
      </div>
    </>}
  </div>;
}
