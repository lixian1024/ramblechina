'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, LocateFixed, Minus, Plus, RotateCw, X } from 'lucide-react';
import Link from '@/i18n/context';
import { loadAmap, type AmapSDK, type MapInstance, type MarkerInstance } from '@/lib/amap/browser';
import type { DestinationMapProps } from './DestinationMap';
import styles from './DestinationMap.module.css';

type Runtime = { sdk: AmapSDK; map: MapInstance };
type Pin = { marker: MarkerInstance; button: HTMLButtonElement };

export default function DestinationMapSurface(props: DestinationMapProps) {
  const { cities, selectedSlug, apiKey, englishEnabled } = props;
  const host = useRef<HTMLDivElement>(null);
  const pins = useRef(new Map<string, Pin>());
  const latest = useRef(props);
  const [runtime, setRuntime] = useState<Runtime | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  const selected = cities.find(city => city.slug === selectedSlug);

  useEffect(() => { latest.current = props; }, [props]);

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let disposed = false;
    let instance: MapInstance | undefined;
    let observer: ResizeObserver | undefined;
    let timer: number | undefined;
    let wasVisible = false;
    const currentPins = pins.current;
    const complete = () => {
      window.clearTimeout(timer);
      if (!disposed) setStatus('ready');
    };

    const initialize = async () => {
      if (!apiKey) throw new Error('Map unavailable');
      const sdk = await loadAmap(apiKey);
      if (disposed) return;
      const show = () => {
        if (disposed) return;
        const visible = element.clientWidth > 0 && element.clientHeight > 0;
        if (!visible) { wasVisible = false; return; }
        if (!instance) {
          try {
            instance = new sdk.Map(element, {
              viewMode: '2D', center: [106, 34], zoom: 4,
              zooms: [3, 12], zoomEnable: true, dragEnable: true,
              resizeEnable: true, scrollWheel: false,
              ...(englishEnabled ? { languageCode: 'en', logoLanguage: 'en' } : {}),
            });
            instance.on('complete', complete);
            timer = window.setTimeout(() => { if (!disposed) setStatus('error'); }, 20_000);
            setRuntime({ sdk, map: instance });
          } catch { if (!disposed) setStatus('error'); }
        } else {
          instance.resize();
          if (!wasVisible) {
            const city = latest.current.cities.find(city => city.slug === latest.current.selectedSlug);
            if (city) instance.setZoomAndCenter(7, [city.lng, city.lat]);
            else if (currentPins.size) instance.setFitView([...currentPins.values()].map(pin => pin.marker), true, [45, 45, 45, 45], 8);
          }
        }
        wasVisible = true;
      };
      observer = new ResizeObserver(show);
      observer.observe(element);
      show();
    };

    void initialize().catch(() => { if (!disposed) setStatus('error'); });
    return () => {
      disposed = true;
      window.clearTimeout(timer);
      observer?.disconnect();
      instance?.off('complete', complete);
      instance?.destroy();
      currentPins.clear();
      element.replaceChildren();
    };
  }, [apiKey, englishEnabled, attempt]);

  useEffect(() => {
    if (!runtime) return;
    const { sdk, map } = runtime;
    const currentPins = pins.current;
    if (currentPins.size) map.remove([...currentPins.values()].map(pin => pin.marker));
    currentPins.clear();

    cities.forEach(city => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = styles.pin;
      button.setAttribute('aria-label', `Show ${city.name} on map`);
      button.setAttribute('aria-pressed', String(city.slug === latest.current.selectedSlug));
      button.title = city.name;
      const dot = document.createElement('span');
      dot.className = styles.dot;
      dot.setAttribute('aria-hidden', 'true');
      const label = document.createElement('span');
      label.className = styles.pinLabel;
      label.textContent = city.name;
      label.setAttribute('aria-hidden', 'true');
      button.append(dot, label);
      button.addEventListener('click', event => {
        event.stopPropagation();
        latest.current.onSelect(city.slug);
      });
      const marker = new sdk.Marker({
        position: [city.lng, city.lat], content: button,
        anchor: 'center', bubble: false, zIndex: 100,
      });
      map.add(marker);
      currentPins.set(city.slug, { marker, button });
    });
    if (currentPins.size) map.setFitView([...currentPins.values()].map(pin => pin.marker), true, [45, 45, 45, 45], 8);
    else map.setZoomAndCenter(4, [106, 34]);
  }, [runtime, cities]);

  useEffect(() => {
    if (!runtime) return;
    pins.current.forEach((pin, slug) => {
      const active = slug === selectedSlug;
      pin.button.setAttribute('aria-pressed', String(active));
      pin.marker.setzIndex(active ? 500 : 100);
    });
    const city = cities.find(city => city.slug === selectedSlug);
    if (city) runtime.map.setZoomAndCenter(Math.max(6, Math.min(runtime.map.getZoom(), 8)), [city.lng, city.lat]);
  }, [runtime, cities, selectedSlug]);

  const fit = () => {
    latest.current.onSelect(null);
    const markers = [...pins.current.values()].map(pin => pin.marker);
    if (markers.length) runtime?.map.setFitView(markers, true, [45, 45, 45, 45], 8);
    else runtime?.map.setZoomAndCenter(4, [106, 34]);
  };

  return (
    <div className={styles.surface}>
      <div ref={host} className={styles.map} aria-label="Interactive AMap destination map" />
      {status === 'loading' && <div className={styles.message} role="status"><span className={styles.spinner} />Loading AMap…</div>}
      {status === 'error' && <div className={styles.message} role="status">
        <strong>The map couldn’t load.</strong>
        <p>You can still explore every city in the list.</p>
        <button type="button" onClick={() => { setRuntime(null); setStatus('loading'); setAttempt(value => value + 1); }}><RotateCw size={15} />Try again</button>
      </div>}
      {status === 'ready' && <>
        <button type="button" className={styles.fit} aria-label="Fit all matching cities on the map" title="Show all matching cities" onClick={fit}><LocateFixed size={18} /></button>
        <div className={styles.zoom} role="group" aria-label="Map zoom">
          <button type="button" aria-label="Zoom in" onClick={() => runtime?.map.zoomIn()}><Plus size={18} /></button>
          <button type="button" aria-label="Zoom out" onClick={() => runtime?.map.zoomOut()}><Minus size={18} /></button>
        </div>
        {!cities.length && <div className={styles.empty} role="status">No cities match. Try another search or region.</div>}
        {selected && <div className={styles.preview} aria-live="polite">
          <button className={styles.close} type="button" aria-label="Close city preview" onClick={() => props.onSelect(null)}><X size={17} /></button>
          <span className={styles.eyebrow}>{selected.province} · {selected.region}</span>
          <h3>{selected.name} <span lang="zh-CN">{selected.chinese}</span></h3>
          <p>{selected.tagline}</p>
          <Link href={`/destinations/${selected.slug}`} className={styles.cityLink}>Explore {selected.name}<ArrowUpRight size={15} /></Link>
        </div>}
      </>}
    </div>
  );
}
