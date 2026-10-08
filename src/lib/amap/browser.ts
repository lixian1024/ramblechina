'use client';

export type Coordinate = [number, number];
export type Overlay = object;
export type MarkerInstance = { setzIndex: (value: number) => void };
export type MapInstance = {
  add: (overlay: Overlay) => void;
  remove: (overlays: Overlay[]) => void;
  setFitView: (overlays?: Overlay[] | null, immediately?: boolean, avoid?: number[], maxZoom?: number) => void;
  setZoomAndCenter: (zoom: number, center: Coordinate) => void;
  getZoom: () => number;
  on: (event: string, callback: () => void) => void;
  off: (event: string, callback: () => void) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resize: () => void;
  destroy: () => void;
};
export type AmapSDK = {
  Map: new (element: HTMLElement, options: Record<string, unknown>) => MapInstance;
  Marker: new (options: Record<string, unknown>) => MarkerInstance;
  Polyline: new (options: Record<string, unknown>) => Overlay;
};

declare global {
  interface Window {
    AMap?: AmapSDK;
    _AMapSecurityConfig?: { serviceHost: string };
  }
}

let sdkPromise: Promise<AmapSDK> | null = null;

export function loadAmap(apiKey: string): Promise<AmapSDK> {
  if (window.AMap) return Promise.resolve(window.AMap);
  if (sdkPromise) return sdkPromise;
  // The JS API key is browser-visible by design. Its security code stays in the
  // server-side proxy and is never serialized into this component.
  window._AMapSecurityConfig = { serviceHost: `${window.location.origin}/_AMapService` };
  sdkPromise = new Promise<AmapSDK>((resolve, reject) => {
    const script = document.createElement('script');
    const timeout = window.setTimeout(() => { script.remove(); sdkPromise = null; reject(new Error('Amap timed out')); }, 18_000);
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${encodeURIComponent(apiKey)}`;
    script.async = true;
    script.onload = () => {
      window.clearTimeout(timeout);
      if (window.AMap) resolve(window.AMap);
      else { sdkPromise = null; reject(new Error('Amap did not initialize')); }
    };
    script.onerror = () => { window.clearTimeout(timeout); script.remove(); sdkPromise = null; reject(new Error('Amap could not load')); };
    document.head.append(script);
  });
  return sdkPromise;
}
