import type {SharedSnapshot} from '@/lib/sharing/snapshot';
import type {Locale} from '@/i18n/locales';
/** Plain text only: no provider images, map requests, editing or private links. */
export function SharedItinerary({snapshot,locale}:{snapshot:SharedSnapshot;locale:Locale}){
 const zh=locale==='zh';
 return <div>{snapshot.uncertainty.map((text,i)=><p key={i}>{text}</p>)}{snapshot.days.map((day,index)=><section key={index} style={{paddingBlock:'1rem',borderTop:'1px solid #d8dfd8'}}><h2>{zh?'第':'Day '}{index+1}{zh?'天':''} · {day.city}{day.date?` · ${day.date}`:''}</h2>{day.uncertainty.map((text,i)=><p key={i}>{text}</p>)}{day.stops.length?<ol>{day.stops.map((stop,i)=><li key={i} style={{marginBlock:16}}><strong>{stop.name}</strong> · {stop.durationMinutes} {zh?'分钟':'minutes'}{stop.uncertainty.map((text,j)=><small key={j} style={{display:'block'}}>{text}</small>)}</li>)}</ol>:<p>{zh?'此日没有公开停留安排。交通与休息详情未公开。':'No public stops for this day. Transport and rest details are not included.'}</p>}</section>)}</div>;
}
