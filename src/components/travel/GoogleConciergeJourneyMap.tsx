'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { loadGoogleMaps, browserMapKey as key } from '@/lib/travel/google-browser';
import { toWgs84 } from '@/lib/travel/map-coordinates';
import { LocateFixed, WifiOff } from 'lucide-react';
import type { MapPoint, VerifiedDay, VerifiedLeg, VerifiedTrip } from '@/lib/travel/concierge-types';
import { hotelLabel, stopLabel, stopNumber } from '@/lib/travel/english-display';
import styles from './Planner.module.css';

type Props = {
  plan: VerifiedTrip | null;
  dayIndex: number;
  allDays: boolean;
  selectedStop: number;
  onSelect: (day: number, stop: number) => void;
  popup: { dayIndex: number; stopIndex: number } | null;
  placeCard: ReactNode;
  onClose: () => void;
  zh: boolean;
  onFailure: () => void;
};
type Layer = { setMap: (map: google.maps.Map | null) => void };
const colors = ['#2f7658', '#c26b43', '#427e9a', '#a07a3c', '#806ba0', '#578b76', '#ad6776', '#647db0', '#99834d', '#4b8b95'];
function placeAt(day: VerifiedDay, from: string): MapPoint | undefined {
  if (from === 'hotel') return day.hotelPlace?.point;
  return day.stops.find(stop => stop.id === from)?.place?.point;
}

function addPin(map: google.maps.Map, point: MapPoint, label: string, title: string, color: string, selected: boolean, onClick: () => void): Layer {
  class Pin extends google.maps.OverlayView {
    element = document.createElement('button');
    onAdd() {
      this.element.type = 'button';
      this.element.className = styles.conciergePin;
      this.element.textContent = label;
      this.element.title = title;
      this.element.setAttribute('aria-label', title);
      this.element.style.setProperty('--pin-color', color);
      this.element.dataset.selected = String(selected);
      this.element.addEventListener('click', onClick);
      google.maps.OverlayView.preventMapHitsAndGesturesFrom(this.element);
      this.getPanes()?.overlayMouseTarget.append(this.element);
    }
    draw() {
      const pixel = this.getProjection().fromLatLngToDivPixel(new google.maps.LatLng(toWgs84(point)));
      if (pixel) { this.element.style.left = `${pixel.x}px`; this.element.style.top = `${pixel.y}px`; }
    }
    onRemove() { this.element.removeEventListener('click', onClick); this.element.remove(); }
  }
  const pin = new Pin(); pin.setMap(map); return pin;
}

function drawLeg(map: google.maps.Map, layers: Layer[], leg: VerifiedLeg | undefined, from: MapPoint, to: MapPoint, color: string) {
  const sections = leg?.geometry?.length ? leg.geometry : [{ kind: 'connection' as const, points: [from, to] }];
  for (const section of sections) {
    if (section.points.length < 2) continue;
    const connection = section.kind === 'connection';
    layers.push(new google.maps.Polyline({
      map, path: section.points.map(toWgs84), strokeColor: color,
      strokeWeight: connection ? 2 : 4, strokeOpacity: connection ? 0 : .82,
      clickable: false,
      ...(connection ? { icons: [{ icon: { path: 'M 0,-1 0,1', strokeColor: color, strokeOpacity: .8, strokeWeight: 2, scale: 2 }, offset: '0', repeat: '12px' }] } : {}),
    }));
  }
}

export default function ConciergeJourneyMap({ plan, dayIndex, allDays, selectedStop, onSelect, popup, placeCard, onClose, zh, onFailure }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);
  const layers = useRef<Layer[]>([]);
  const bounds = useRef<google.maps.LatLngBounds | null>(null);
  const signature = useRef('');
  const latest = useRef(onSelect);
  const latestClose = useRef(onClose);
  const infoWindow = useRef<google.maps.InfoWindow | null>(null);
  const [popupHost, setPopupHost] = useState<HTMLDivElement | null>(null);
  const [ready, setReady] = useState<google.maps.Map | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { latest.current = onSelect; }, [onSelect]);
  useEffect(() => { latestClose.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!host.current || !key) return;
    const element = host.current;
    let disposed = false;
    let observer: ResizeObserver | undefined;
    const timer = window.setTimeout(() => { if (!disposed) onFailure(); }, 20_000);
    void loadGoogleMaps().then(({ Map }) => {
      if (disposed) return;
      const instance = new Map(element, {
        center: { lat: 31.225, lng: 121.47 }, zoom: 11, maxZoom: 19,
        mapTypeId: 'roadmap', mapTypeControl: false, streetViewControl: false,
        fullscreenControl: false, zoomControl: true, scaleControl: true,
        gestureHandling: 'greedy', clickableIcons: false,
      });
      map.current = instance;
      const content = document.createElement('div');
      google.maps.OverlayView.preventMapHitsAndGesturesFrom(content);
      infoWindow.current = new google.maps.InfoWindow({ content, headerDisabled: true, maxWidth: 320, ariaLabel: zh ? '景点游览详情' : 'Place visit details' });
      infoWindow.current.addListener('closeclick', () => latestClose.current());
      setPopupHost(content);
      observer = new ResizeObserver(() => {
        if (element.clientWidth && element.clientHeight && bounds.current) instance.fitBounds(bounds.current, 48);
      });
      observer.observe(element);
      google.maps.event.addListenerOnce(instance, 'tilesloaded', () => { window.clearTimeout(timer); if (!disposed) setReady(instance); });
    }).catch(() => { if (!disposed) { setError(zh ? 'Google 地图无法加载。' : 'Google Maps could not load.'); onFailure(); } });
    return () => {
      disposed = true; window.clearTimeout(timer); observer?.disconnect();
      layers.current.forEach(layer => layer.setMap(null)); layers.current = [];
      if (map.current) google.maps.event.clearInstanceListeners(map.current);
      infoWindow.current?.close();
      if (infoWindow.current) google.maps.event.clearInstanceListeners(infoWindow.current);
      infoWindow.current = null;
      map.current = null; signature.current = ''; element.replaceChildren();
    };
  }, [zh, onFailure]);

  useEffect(() => {
    const instance = map.current;
    if (!ready || !instance) return;
    layers.current.forEach(layer => layer.setMap(null)); layers.current = [];
    const points: MapPoint[] = [];
    const shown = plan ? (allDays ? plan.days : [plan.days[dayIndex]].filter(Boolean)) : [];
    for (const day of shown) {
      const index = plan!.days.indexOf(day);
      const color = colors[index % colors.length];
      if (day.hotelPlace) {
        points.push(day.hotelPlace.point);
        layers.current.push(addPin(instance, day.hotelPlace.point, 'H', `${zh ? '第' : 'Day '}${index + 1}${zh ? '天酒店' : ' hotel'}: ${hotelLabel(day, zh)}`, color, false, () => instance.panTo(toWgs84(day.hotelPlace!.point))));
      }
      day.stops.forEach((stop, stopIndex) => {
        if (!stop.place) return;
        points.push(stop.place.point);
        layers.current.push(addPin(instance, stop.place.point, stopNumber(index, stopIndex),
          `Day ${index + 1}, stop ${stopIndex + 1}: ${stopLabel(stop, day, stopIndex, zh)}`, color, index === dayIndex && stopIndex === selectedStop,
          () => latest.current(index, stopIndex)));
      });
      for (const leg of day.legs) {
        const from = placeAt(day, leg.from);
        const to = day.stops.find(stop => stop.id === leg.to)?.place?.point;
        if (from && to) drawLeg(instance, layers.current, leg, from, to, color);
      }
      // Older saved plans may have no verified legs or route geometry.
      for (let i = 1; i < day.stops.length; i++) {
        const from = day.stops[i - 1].place?.point, to = day.stops[i].place?.point;
        if (from && to && !day.legs.some(leg => leg.from === day.stops[i - 1].id && leg.to === day.stops[i].id)) drawLeg(instance, layers.current, undefined, from, to, color);
      }
      if (allDays && index > 0) {
        const previous = plan!.days[index - 1];
        const from = previous.stops.at(-1)?.place?.point || previous.hotelPlace?.point;
        const to = day.hotelPlace?.point || day.stops[0]?.place?.point;
        if (from && to) drawLeg(instance, layers.current, day.transfer?.leg, from, to, '#8b795e');
      }
    }
    const nextSignature = JSON.stringify([allDays, allDays ? null : dayIndex, points]);
    if (nextSignature !== signature.current) {
      signature.current = nextSignature;
      if (points.length) {
        bounds.current = new google.maps.LatLngBounds();
        points.forEach(point => bounds.current!.extend(toWgs84(point)));
        instance.fitBounds(bounds.current, 48);
        google.maps.event.addListenerOnce(instance, 'idle', () => { if ((instance.getZoom() || 0) > 15) instance.setZoom(15); });
      } else { bounds.current = null; instance.setCenter({ lat: 31.225, lng: 121.47 }); instance.setZoom(11); }
    }
  }, [ready, plan, dayIndex, allDays, selectedStop, zh]);

  const popupStop = popup ? plan?.days[popup.dayIndex]?.stops[popup.stopIndex] : undefined;
  useEffect(() => {
    const window = infoWindow.current;
    if (!window || !ready || !map.current) return;
    if (!popupStop?.place) { window.close(); return; }
    const instance = map.current;
    const position = toWgs84(popupStop.place.point);
    const reopen = () => {
      window.close();
      window.setPosition(position);
      window.open({ map: instance, shouldFocus: false });
    };
    window.setPosition(position);
    window.open({ map: instance, shouldFocus: true });
    // The portal initially contains a loading state. Refit after the real photo
    // and attribution change its height, otherwise the photo can be clipped.
    let previousSize = '';
    let frame = 0;
    const observer = new ResizeObserver(entries => {
      const rect = entries[0]?.contentRect;
      if (!rect || !rect.width || !rect.height) return;
      const nextSize = `${rect.width}:${rect.height}`;
      if (nextSize === previousSize) return;
      previousSize = nextSize;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(reopen);
    });
    if (popupHost) observer.observe(popupHost);
    const idle = google.maps.event.addListenerOnce(instance, 'idle', reopen);
    return () => { observer.disconnect(); cancelAnimationFrame(frame); google.maps.event.removeListener(idle); };
  }, [ready, popup, popupStop, popupHost]);

  return <div className={styles.interactiveMap}>
    <div ref={host} className={styles.mapCanvas} aria-label={zh ? '可缩放、可拖动的英文行程地图' : 'Zoomable, draggable English itinerary map'} />
    {!key && <div className={styles.mapFallback}><WifiOff size={24} /><strong>{zh ? '英文地图 Key 尚未配置' : 'English map key is not configured'}</strong></div>}
    {error && <div className={styles.mapFallback} role="alert"><WifiOff size={24} /><strong>{error}</strong></div>}
    {!ready && key && !error && <div className={styles.mapLoading}> {zh ? '正在加载英文地图…' : 'Loading English map…'}</div>}
    {ready && <button type="button" className={styles.mapFit} onClick={() => { if (bounds.current) map.current?.fitBounds(bounds.current, 48); }} aria-label={zh ? '显示当前视图所有地点' : 'Fit all places in this view'} title={zh ? '显示所有地点' : 'Fit all places'}><LocateFixed size={18} /></button>}
    {popup && popupStop?.place && ready && popupHost ? createPortal(placeCard, popupHost) : popup && <div className={styles.mapPlaceFallback}>{placeCard}</div>}
  </div>;
}
