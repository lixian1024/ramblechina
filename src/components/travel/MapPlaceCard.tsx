'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Clock3, MapPin, ShieldCheck, Ticket, X } from 'lucide-react';
import type { PlacePhoto, VerifiedDay, VerifiedStop } from '@/lib/travel/concierge-types';
import { placeAddress, readableEnglish, stopLabel, stopNumber } from '@/lib/travel/english-display';
import { categoryLabel, formatLeg, visitDuration } from '@/lib/travel/itinerary-display';
import styles from './Planner.module.css';

type Props = { day: VerifiedDay; dayIndex: number; stop: VerifiedStop; stopIndex: number; zh: boolean; onClose: () => void };

export default function MapPlaceCard(props:Props){
  return <PlaceCardContent key={`${props.stop.place?.id||'unmatched'}:${props.stop.search||props.stop.nameChinese||props.stop.name}:${props.day.city}`} {...props}/>;
}

function PlaceCardContent({ day, dayIndex, stop, stopIndex, zh, onClose }: Props) {
  const label = stopLabel(stop, day, stopIndex, zh);
  const placeId = stop.place?.id;
  const [photo, setPhoto] = useState<PlacePhoto | undefined>();
  const [loading, setLoading] = useState(Boolean(placeId));
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!placeId) return;
    const controller = new AbortController();
    void fetch('/api/trip-place-photos', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ places: [{id:placeId,query:stop.search||stop.nameChinese||stop.name,city:day.city}] }), signal: controller.signal,
    }).then(async response => {
      if (!response.ok) throw new Error('Photo lookup failed');
      const data = await response.json() as { photos?: Record<string, PlacePhoto> };
      const candidate=data.photos?.[placeId];
      if (!controller.signal.aborted) { setPhoto(candidate?.placeId===placeId&&candidate.screening==='visual-match'?candidate:undefined); setFailed(false); }
    }).catch(() => { if (!controller.signal.aborted) setFailed(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [placeId, stop.search, stop.nameChinese, stop.name, day.city, attempt]);
  const retry = () => { setPhoto(undefined); setFailed(false); setLoading(true); setAttempt(value => value + 1); };
  const incoming = day.legs.find(leg => leg.to === stop.id);
  const text = (value: string | undefined, fallback: string) => zh ? value || fallback : readableEnglish(value, fallback);
  return <article className={styles.mapPlaceCard} aria-label={`${zh ? '游览详情' : 'Visit details'}: ${stopNumber(dayIndex, stopIndex)} ${label}`} onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); onClose(); } }}>
    <button type="button" className={styles.mapPlaceClose} onClick={event => { event.stopPropagation(); onClose(); }} aria-label={zh ? '关闭景点详情' : 'Close place details'}><X size={18} /></button>
    <figure className={styles.mapPlacePhoto}>
      {photo ? <>
        <Image src={photo.url} alt={zh ? `${photo.subject?.name || label}的 Google 用户照片` : `Google contributor photo: ${photo.subject?.nameEnglish || label}`} width={600} height={360} unoptimized className={styles.mapPlaceImage} onError={() => { setPhoto(undefined); setFailed(true); }} />
        <figcaption className={styles.photoAttribution}>{photo.subject && <div>{zh ? photo.subject.name : photo.subject.nameEnglish}</div>}<span className={styles.googleAttribution} translate="no">Google Maps</span>{photo.authors?.map((author, index) => <span key={index}> · {author.uri ? <a href={author.uri} target="_blank" rel="noopener noreferrer">{author.name}</a> : author.name}</span>)}</figcaption>
      </> : <div className={styles.mapPlacePhotoMissing} role="status"><MapPin size={24} /><span>{loading ? (zh ? '正在检查景点照片…' : 'Checking place photos…') : !placeId ? (zh ? '地点尚未匹配，暂无景点照片' : 'Place not matched; no place photo available') : failed ? (zh ? '景点照片暂时无法加载' : 'Place photos could not load') : (zh ? '暂无可确认主体的景点照片，不展示未经筛选的图片' : 'No suitable place photo confirmed. Unscreened photos are not shown.')}</span>{placeId && !loading && <button type="button" onClick={retry}>{zh ? '重试照片' : 'Retry photo'}</button>}</div>}
    </figure>
    <div className={styles.mapPlaceBody}>
      <div className={styles.mapPlaceTitle}><span className={styles.richStopNumber}>{stopNumber(dayIndex, stopIndex)}</span><h3>{label}</h3></div>
      <div className={styles.mapPlaceMeta}><span>{categoryLabel(stop, zh)}</span><span><Clock3 size={13} /> {stop.scheduledAt || stop.at || (zh ? '时间待确认' : 'Time to confirm')} · {visitDuration(stop.durationMinutes, zh)}</span>{stop.booked && <span><ShieldCheck size={13} />{zh ? '已预约 · 固定' : 'Booking · fixed'}</span>}</div>
      <div className={styles.mapVisitDetails}>
        <h4>{zh ? '游览详情' : 'Visit details'}</h4>
        {stop.description && <p>{text(stop.description, 'Ask the assistant for background on this place.')}</p>}
        {stop.why && <p><strong>{zh ? '为什么适合你' : 'Why it fits'}</strong>{text(stop.why, 'Ask the assistant for a personalized recommendation.')}</p>}
        {stop.visitTip && <p><strong>{zh ? '现场提醒' : 'On-site tip'}</strong>{text(stop.visitTip, 'Check visit details with the venue.')}</p>}
        {stop.bookingNote && <p><strong>{zh ? '你的预约' : 'Your booking'}</strong>{text(stop.bookingNote, 'Keep your recorded booking fixed.')}</p>}
        <p><MapPin size={13} /> {placeAddress(stop, day, zh)}</p>
        <p><Clock3 size={13} /> {stop.place?.openingHours ? (zh ? `Google 所列：${stop.place.openingHours}，以场馆公告为准。` : readableEnglish(stop.place.openingHours, '') ? `Google lists: ${stop.place.openingHours} · Confirm with venue.` : 'Opening hours listed in Chinese · Confirm hours and reservations with the venue.') : (zh ? '开放时间未验证 · 出发前请向场馆确认开放与预约要求' : 'Opening hours unverified · Confirm hours and reservations with the venue before visiting.')}</p>
        <p><Ticket size={13} /> {stop.admission ? <a href={stop.admission.sourceUrl} target="_blank" rel="noopener noreferrer">{zh ? '票价参考：' : 'Admission ref: '}{stop.admission.text}</a> : (zh ? '票价待核实' : 'Admission to check')}</p>
        {incoming && <p>{incoming.provider || 'Map'} {zh ? '估算：' : 'estimate: '}{formatLeg(incoming, zh)}</p>}
      </div>
      <div className={styles.mapPlaceSource}>{stop.place ? <><span>{zh ? '地点已在 Google 匹配' : 'Place matched on Google'}</span>{stop.place.sourceUrl && <a className={styles.googleAttribution} translate="no" href={stop.place.sourceUrl} target="_blank" rel="noopener noreferrer">Google Maps ↗</a>}</> : <span>{zh ? '地点尚未匹配' : 'Place not matched yet'}</span>}</div>
    </div>
  </article>;
}
