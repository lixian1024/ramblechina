import type { MapPoint } from './concierge-types';

function offset(point: MapPoint): MapPoint {
  const x = point.lng - 105, y = point.lat - 35;
  let lat = -100 + 2*x + 3*y + .2*y*y + .1*x*y + .2*Math.sqrt(Math.abs(x));
  lat += (20*Math.sin(6*x*Math.PI)+20*Math.sin(2*x*Math.PI))*2/3;
  lat += (20*Math.sin(y*Math.PI)+40*Math.sin(y/3*Math.PI))*2/3;
  lat += (160*Math.sin(y/12*Math.PI)+320*Math.sin(y*Math.PI/30))*2/3;
  let lng = 300+x+2*y+.1*x*x+.1*x*y+.1*Math.sqrt(Math.abs(x));
  lng += (20*Math.sin(6*x*Math.PI)+20*Math.sin(2*x*Math.PI))*2/3;
  lng += (20*Math.sin(x*Math.PI)+40*Math.sin(x/3*Math.PI))*2/3;
  lng += (150*Math.sin(x/12*Math.PI)+300*Math.sin(x/30*Math.PI))*2/3;
  const rad=point.lat/180*Math.PI, magic=1-.00669342162296594323*Math.sin(rad)**2;
  return {lat:lat*180/(6335552.717000426/(magic*Math.sqrt(magic))*Math.PI),lng:lng*180/(6378245/Math.sqrt(magic)*Math.cos(rad)*Math.PI)};
}
const inChina=(p:MapPoint)=>p.lng>=73&&p.lng<=135&&p.lat>=18&&p.lat<=54;
export function toWgs84(point: MapPoint): MapPoint {
  if(point.system!=='GCJ-02'||!inChina(point)) return {...point,system:'WGS84'};
  let guess={...point};
  for(let i=0;i<4;i++){const d=offset(guess);guess={lng:point.lng-d.lng,lat:point.lat-d.lat};}
  return {...guess,system:'WGS84'};
}
export function toGcj02(point: MapPoint): MapPoint {
  if(point.system==='GCJ-02'||!inChina(point))return {...point,system:'GCJ-02'};
  const d=offset(point);return {lng:point.lng+d.lng,lat:point.lat+d.lat,system:'GCJ-02'};
}
