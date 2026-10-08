'use client';

import { useEffect, useRef, useState } from 'react';
import { importLibrary, setOptions } from '@googlemaps/js-api-loader';
import { LocateFixed, WifiOff } from 'lucide-react';
import { findCity } from '@/lib/travel/data';
import { dayColors, placeById, type Point } from '@/lib/travel/workbench';
import type { JourneyMapProps } from './JourneyMap';
import styles from './Planner.module.css';

type Props = JourneyMapProps & { apiKey: string; onUseBackup: () => void };
type Layer = { setMap: (map: google.maps.Map | null) => void };
let configured = false;
const latLng = ([lat, lng]: Point): google.maps.LatLngLiteral => ({ lat, lng });

function loadMapLibrary(apiKey: string) {
  if (!configured) {
    setOptions({ key: apiKey, v: 'quarterly', language: 'en' });
    configured = true;
  }
  return importLibrary('maps');
}

// DOM overlays keep the existing numbered, keyboard-accessible pins without
// requiring a separate Cloud Map ID or the deprecated google.maps.Marker API.
function addPin(map: google.maps.Map, point: Point, label: string, title: string,
  color: string, active: boolean, onClick?: () => void): Layer {
  class JourneyPin extends google.maps.OverlayView {
    element = document.createElement(onClick ? 'button' : 'div');
    onAdd() {
      this.element.className = styles.googlePin;
      this.element.textContent = label;
      this.element.title = title;
      this.element.setAttribute('aria-label', title);
      this.element.style.setProperty('--pin-color', color);
      this.element.dataset.selected = String(active);
      if (onClick) {
        (this.element as HTMLButtonElement).type = 'button';
        this.element.addEventListener('click', onClick);
      } else {
        this.element.setAttribute('role', 'img');
      }
      google.maps.OverlayView.preventMapHitsAndGesturesFrom(this.element);
      this.getPanes()?.overlayMouseTarget.append(this.element);
    }
    draw() {
      const pixel = this.getProjection().fromLatLngToDivPixel(new google.maps.LatLng(latLng(point)));
      if (!pixel) return;
      this.element.style.left = `${pixel.x}px`;
      this.element.style.top = `${pixel.y}px`;
    }
    onRemove() {
      if (onClick) this.element.removeEventListener('click', onClick);
      this.element.remove();
    }
  }
  const pin = new JourneyPin();
  pin.setMap(map);
  return pin;
}

export default function GoogleJourneyMap(props: Props) {
  const host = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);
  const latest = useRef(props);
  const layers = useRef<Layer[]>([]);
  const geometry = useRef('');
  const bounds = useRef<google.maps.LatLngBounds | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { latest.current = props; }, [props]);

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let disposed = false;
    let observer: ResizeObserver | undefined;
    let instance: google.maps.Map | undefined;
    const listeners: google.maps.MapsEventListener[] = [];
    const authWindow = window as Window & { gm_authFailure?: () => void };
    const previousAuthFailure = authWindow.gm_authFailure;
    const authFailure = () => {
      if (!disposed) setError('Google Maps could not authorize this map. You can keep planning with the backup map.');
    };
    authWindow.gm_authFailure = authFailure;
    let timeout = window.setTimeout(() => {
      if (!disposed) setError('Google Maps is taking too long to load. You can keep planning with the backup map.');
    }, 20000);

    void loadMapLibrary(props.apiKey).then(({ Map }) => {
      if (disposed) return;
      window.clearTimeout(timeout);
      const current = latest.current;
      const city = findCity(current.journey.days[current.dayIndex].city)!;
      instance = new Map(element, {
        center: { lat: city.lat, lng: city.lng }, zoom: 12, maxZoom: 19,
        mapTypeId: 'roadmap', mapTypeControl: false, streetViewControl: false,
        fullscreenControl: false, zoomControl: true, scaleControl: true,
        clickableIcons: false, gestureHandling: 'cooperative',
        styles: [{ featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] }],
      });
      map.current = instance;
      listeners.push(instance.addListener('click', (event: google.maps.MapMouseEvent) => {
        if (latest.current.pinning && event.latLng) {
          latest.current.onPin([event.latLng.lat(), event.latLng.lng()]);
        }
      }));
      let tilesLoaded = false;
      listeners.push(instance.addListener('tilesloaded', () => {
        tilesLoaded = true;
        window.clearTimeout(timeout);
        if (!disposed) setError(current => current.includes('taking too long') ? '' : current);
      }));
      let wasVisible = false;
      observer = new ResizeObserver(() => {
        const visible = element.clientWidth > 0 && element.clientHeight > 0;
        if (visible && !wasVisible) {
          if (bounds.current) instance?.fitBounds(bounds.current, 65);
          if (!tilesLoaded) timeout = window.setTimeout(() => {
            if (!disposed) setError('Google Maps is taking too long to load. You can keep planning with the backup map.');
          }, 20000);
        }
        if (!visible) window.clearTimeout(timeout);
        wasVisible = visible;
      });
      observer.observe(element);
      setReady(true);
    }).catch(() => {
      window.clearTimeout(timeout);
      if (!disposed) setError('Google Maps could not load. Check your connection or use the backup map.');
    });

    return () => {
      disposed = true;
      window.clearTimeout(timeout);
      observer?.disconnect();
      listeners.forEach(listener => listener.remove());
      layers.current.forEach(layer => layer.setMap(null));
      layers.current = [];
      if (instance) google.maps.event.clearInstanceListeners(instance);
      map.current = null;
      geometry.current = '';
      if (authWindow.gm_authFailure === authFailure) authWindow.gm_authFailure = previousAuthFailure;
      element.replaceChildren();
    };
  }, [props.apiKey]);

  useEffect(() => {
    const instance = map.current;
    if (!ready || !instance) return;
    layers.current.forEach(layer => layer.setMap(null));
    layers.current = [];
    const points: Point[] = [];
    const shown = props.overview ? props.journey.days : [props.journey.days[props.dayIndex]];
    for (const day of shown) {
      const dayIndex = props.journey.days.findIndex(d => d.id === day.id);
      const color = dayColors[dayIndex % dayColors.length];
      const hotel = props.journey.hotels[day.city];
      const path: Point[] = [];
      if (hotel?.point) { path.push(hotel.point); points.push(hotel.point); }
      day.stops.forEach((stop, i) => {
        const place = placeById(stop.placeId);
        if (!place?.point) return;
        points.push(place.point); path.push(place.point);
        layers.current.push(addPin(instance, place.point,
          props.overview ? `${dayIndex + 1}.${i + 1}` : String(i + 1),
          `Day ${dayIndex + 1}, stop ${i + 1}: ${place.name}`, color,
          props.selected === stop.id, () => latest.current.onSelect(stop.id, dayIndex)));
      });
      if (path.length > 1) layers.current.push(new google.maps.Polyline({
        map: instance, path: path.map(latLng), strokeOpacity: 0, clickable: false,
        icons: [{ icon: { path: 'M 0,-1 0,1', strokeColor: color, strokeOpacity: .75, strokeWeight: 3, scale: 2 }, offset: '0', repeat: '15px' }],
      }));
    }
    for (const city of new Set(shown.map(d => d.city))) {
      const hotel = props.journey.hotels[city];
      if (hotel?.point) layers.current.push(addPin(instance, hotel.point, 'H', hotel.name || 'Your hotel', '#a77345', false));
    }
    const signature = JSON.stringify([props.overview, props.dayIndex, points]);
    if (signature !== geometry.current) {
      geometry.current = signature;
      if (points.length) {
        bounds.current = new google.maps.LatLngBounds();
        points.forEach(point => bounds.current!.extend(latLng(point)));
        instance.fitBounds(bounds.current, 65);
        google.maps.event.addListenerOnce(instance, 'idle', () => {
          if ((instance.getZoom() || 0) > 14) instance.setZoom(14);
        });
      } else {
        bounds.current = null;
        const city = findCity(props.journey.days[props.dayIndex].city)!;
        instance.setCenter({ lat: city.lat, lng: city.lng }); instance.setZoom(11);
      }
    }
    const selected = props.journey.days.flatMap(d => d.stops).find(s => s.id === props.selected);
    const point = selected && placeById(selected.placeId)?.point;
    if (point && instance.getBounds() && !instance.getBounds()!.contains(latLng(point))) instance.panTo(latLng(point));
  }, [ready, props.journey, props.dayIndex, props.overview, props.selected]);

  useEffect(() => {
    map.current?.setOptions({ draggableCursor: props.pinning ? 'crosshair' : undefined });
  }, [ready, props.pinning]);

  return <div className={`${styles.mapSurface} ${props.pinning ? styles.pinning : ''}`}>
    <div ref={host} className={styles.leafletMap} aria-label="Google Maps itinerary map. Numbered pins match your itinerary; dashed lines show visit order." />
    {!ready && !error && <div className={styles.googleMapState} role="status">Opening Google Maps…</div>}
    {error ? <div className={styles.googleMapState} role="alert"><WifiOff size={24}/><p>{error}</p><button className={styles.primaryButton} onClick={props.onUseBackup}>Use backup map</button></div> : <>
      <button className={styles.recenter} disabled={!ready} aria-label="Fit itinerary on map" onClick={() => {
        if (bounds.current) map.current?.fitBounds(bounds.current, 65);
      }}><LocateFixed size={18}/></button>
      {props.pinning && ready && <div className={styles.pinPrompt}>Click your hotel’s location on the map</div>}
    </>}
  </div>;
}
