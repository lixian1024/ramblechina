'use client';

import { Fragment, type CSSProperties } from 'react';
import { ArrowDown, ArrowUp, ArrowRightLeft, ChevronDown, CarFront, Clock3, CloudSun, MapPin, MessageSquare, Plane, Plus, RotateCcw, ShieldCheck, Sparkles, Ticket, TrainFront, Trash2 } from 'lucide-react';
import type { VerifiedDay, VerifiedStop, VerifiedTrip } from '@/lib/travel/concierge-types';
import { cityLabel, hotelLabel, readableEnglish, stopLabel, stopNumber } from '@/lib/travel/english-display';
import { categoryLabel, formatLeg, visitDuration, weatherLabel } from '@/lib/travel/itinerary-display';
import styles from './Planner.module.css';

const dayColors = ['#2f7658', '#c26b43', '#427e9a', '#a07a3c', '#806ba0', '#578b76', '#ad6776', '#647db0', '#99834d', '#4b8b95'];
type Props = {
  plan: VerifiedTrip; zh: boolean; dayIndex: number; selectedStop: number; allDays: boolean; busy: boolean;
  onSelect: (day: number, stop: number) => void; onDay: (day: number) => void;
  onEdit: (request: string, context: string) => void; onUndo?: () => void;
};

function stopRequest(day: VerifiedDay, stop: VerifiedStop, dayIndex: number, index: number, action: 'earlier' | 'later' | 'replace' | 'remove', zh: boolean) {
  const reference = zh ? `第 ${dayIndex + 1} 天（${cityLabel(day, true)}）第 ${index + 1} 站「${stopLabel(stop, day, index, true)}」（编号 ${stopNumber(dayIndex, index)}）` : `Day ${dayIndex + 1} (${cityLabel(day, false)}), stop ${index + 1} "${stopLabel(stop, day, index, false)}" (${stopNumber(dayIndex, index)})`;
  const instruction = zh ? { earlier: `请把${reference}提前一站游览`, later: `请把${reference}延后一站游览`, replace: `请把${reference}替换为同区域适合这趟旅行的其他景点`, remove: `请从行程中移除${reference}${stop.booked ? '，我明确取消这一站的固定预约安排（实际退票由我处理）' : ''}` } : { earlier: `Move ${reference} one stop earlier`, later: `Move ${reference} one stop later`, replace: `Replace ${reference} with another suitable place in the same area`, remove: `Remove ${reference}${stop.booked ? '; I explicitly cancel its fixed booking in the itinerary (I will handle the actual ticket cancellation)' : ''}` };
  return `${instruction[action]}${zh ? '。保留其他已预约时间，重新核对交通和游玩时间，并说明改动。' : '. Keep other bookings fixed, recheck travel and visit times, and explain the change.'}`;
}

export default function ItineraryOverview({ plan, zh, dayIndex, selectedStop, allDays, busy, onSelect, onDay, onEdit, onUndo }: Props) {
  return <div className={styles.itineraryOverview} aria-label={zh ? '完整每日行程' : 'Complete daily itinerary'} aria-busy={busy}>
    <div className={styles.itineraryHeading}><div><span>{zh ? '你的每日行程' : 'YOUR DAILY ITINERARY'}</span><p>{plan.days.length} {zh ? '天' : 'days'} · {plan.days.reduce((sum, day) => sum + day.stops.length, 0)} {zh ? '个地点 · 点击景点定位地图' : 'places · select a place to locate it'}</p></div>{onUndo && <button type="button" disabled={busy} onClick={onUndo}><RotateCcw size={14} />{zh ? '撤销上次改动' : 'Undo last change'}</button>}</div>
    <div className={styles.conversationGuide}><MessageSquare size={17} /><span>{zh ? '想换景点或调整顺序？从卡片发起需求，再通过对话修改。' : 'Change a place or its order? Start from a card and refine it in conversation.'}</span></div>
    {plan.days.map((day, dayNumber) => {
      const visitMinutes = day.stops.reduce((sum, stop) => sum + stop.durationMinutes, 0);
      const travelMinutes = day.legs.reduce((sum, leg) => sum + (leg.minutes || 0), 0);
      const prior = plan.days[dayNumber - 1];
      const changingCity = prior && prior.city !== day.city;
      const cityName = cityLabel(day, zh);
      const dayContext = zh ? `第 ${dayNumber + 1} 天 · ${cityName}` : `Day ${dayNumber + 1} · ${cityName}`;
      const hasMissingInfo = day.stops.some(stop => !stop.nameEnglish || !stop.pinyin || !stop.category || !stop.bestTime);
      return <Fragment key={day.id}>
        {changingCity && <article className={styles.intercityCard} aria-label={zh ? `跨城交通 ${cityLabel(prior, true)}到${cityName}` : `Intercity travel ${cityLabel(prior, false)} to ${cityName}`}>
          <span className={styles.intercityIcon}>{day.intercityMode === 'flight' ? <Plane size={22} /> : day.intercityMode === 'rail' ? <TrainFront size={22} /> : day.intercityMode === 'road' ? <CarFront size={22} /> : <ArrowRightLeft size={22} />}</span>
          <div><strong>{cityLabel(prior, zh)} → {cityName}</strong><span>{day.intercityMode ? (zh ? { rail: '建议高铁 / 火车', flight: '建议飞机', road: '建议公路出行', transit: '建议跨城公共交通' } : { rail: 'Suggested rail connection', flight: 'Suggested flight', road: 'Suggested road connection', transit: 'Suggested intercity transit' })[day.intercityMode] : (zh ? '跨城交通方式待确认' : 'Intercity transport to confirm')}</span>
            {day.transfer && <small>{zh ? `${day.transfer.leg.provider || '地图'} 估算：${formatLeg(day.transfer.leg, true)}` : `${day.transfer.leg.provider || 'Map'} estimate: ${formatLeg(day.transfer.leg, false)}`}</small>}
            <p>{zh ? (day.intercityNote || '车站 / 机场、车次与票价待核实。') : readableEnglish(day.intercityNote, 'Stations, services and fares still need checking.')}{day.transfer && (zh ? ' 行程暂按 08:00 出发，另留 45 分钟缓冲；地图估时不代表已确认车次。' : ' Planning assumes an 08:00 departure plus 45 minutes of buffer; the estimate is not a confirmed service.')}</p>
          </div><button type="button" disabled={busy} onClick={() => onEdit(zh ? `请调整从${cityLabel(prior, true)}到${cityName}的跨城交通方案，比较高铁和飞机，重新安排第 ${dayNumber + 1} 天并保留已预约时间，说明哪些信息仍待核实。` : `Compare rail and flight options from ${cityLabel(prior, false)} to ${cityName}, revise Day ${dayNumber + 1}, keep booked times fixed and explain what still needs checking.`, zh ? `跨城交通 · ${cityLabel(prior, true)} → ${cityName}` : `Intercity · ${cityLabel(prior, false)} → ${cityName}`)}>{zh ? '调整交通' : 'Change transport'}</button>
        </article>}
        <article data-itinerary-day={dayNumber} className={`${styles.itineraryDay} ${!allDays && dayIndex === dayNumber ? styles.itineraryDaySelected : ''}`} style={{ '--day-color': dayColors[dayNumber % dayColors.length] } as CSSProperties}>
          <header className={styles.itineraryDayHead}>
            <button type="button" className={styles.dayNumber} onClick={() => onDay(dayNumber)} aria-label={zh ? `查看第 ${dayNumber + 1} 天地图` : `View Day ${dayNumber + 1} map`}><small>{zh ? '第' : 'DAY'}</small><b>{dayNumber + 1}</b>{zh && <small>天</small>}</button>
            <div className={styles.dayTitleBlock}><span>{day.date || (zh ? '日期待确认' : 'Dates to confirm')} · {cityName}</span><h3>{zh ? day.title : readableEnglish(day.title, dayContext)}</h3><div className={styles.daySummaryFacts}><span><CloudSun size={13} />{weatherLabel(day, zh)}</span><span><Clock3 size={13} />{!day.stops.length && day.kind === 'transfer' ? (zh ? '交通日 · 时间待确认' : 'Transfer day · timing to confirm') : !day.stops.length && day.kind === 'rest' ? (zh ? '休息日' : 'Rest day') : <>{zh ? '约' : 'About'} {visitDuration(visitMinutes + travelMinutes, zh)}{zh ? '安排' : 'planned'}</>}</span></div></div>
            <button type="button" className={styles.dayEdit} disabled={busy} onClick={() => onEdit(zh ? `请把第 ${dayNumber + 1} 天（${cityName}）安排得更轻松，保留已预约时间，优化景点顺序与交通，并说明调整。` : `Make Day ${dayNumber + 1} in ${cityName} easier, keep booked times fixed, optimize stop order and transport, and explain the changes.`, dayContext)}><Sparkles size={14} />{zh ? '调整这天' : 'Refine day'}</button>
          </header>
          {day.note && <p className={styles.dayNote}>{day.note}</p>}
          {day.dining && <div className={styles.dayNote} aria-label={zh ? '路线附近的餐饮候选' : 'Dining options near the route'}>
            {day.dining.map(meal => {
              const window = day.meals?.find(item => item.kind === meal.kind);
              const anchor = day.stops.find(stop => stop.id === meal.nearStopId);
              return <div key={meal.kind}>
                <strong>{zh ? (meal.kind === 'lunch' ? '午餐' : '晚餐') : (meal.kind === 'lunch' ? 'Lunch' : 'Dinner')} {window && `${window.start}–${window.end}`}{anchor && ` · ${stopLabel(anchor, day, day.stops.indexOf(anchor), zh)}`}</strong>
                {meal.status === 'unavailable' ? <p>{zh ? '餐饮候选未验证，请确认附近营业中的餐厅。' : 'Dining options unverified. Confirm a nearby open restaurant.'}</p> : <>
                  <ul>{meal.options.map(option => <li key={option.id}><a href={option.sourceUrl} target="_blank" rel="noopener noreferrer">{option.name}</a> · {zh ? option.type : option.cuisine} · {option.address} · {option.metres} m {zh ? 'Google标注距离' : 'Google listed distance'}</li>)}</ul>
                  <p><span className={styles.googleAttribution} translate="no">Google Maps</span> · {zh ? '地点与类型来自Google列表；距离是地图距离，不是步行路线或估时。建议预留往返与等候时间；出发前确认营业、菜单、预约及饮食适配。' : 'Names, categories and locations are Google listings; map distances are not walking routes or times. Allow for the return walk and queues. Confirm hours, menus, reservations and dietary suitability before going.'}</p>
                </>}
              </div>;
            })}
          </div>}
          <div className={styles.richTimeline}>
            {day.hotel && <div className={styles.hotelLine}><MapPin size={14} /><span>{hotelLabel(day, zh)}</span><small>{day.hotelPlace ? (zh ? 'Google已匹配' : 'Matched on Google') : (zh ? '地址待确认' : 'Address to confirm')}</small></div>}
            {day.stops.map((stop, index) => {
              const incoming = day.legs.find(leg => leg.to === stop.id && (index === 0 || leg.from === day.stops[index - 1]?.id));
              const label = stopLabel(stop, day, index, zh);
              const englishLabel = stopLabel(stop, day, index, false);
              const englishName = /^Stop \d+ in /.test(englishLabel) ? '英文名待补充' : englishLabel;
              const chineseName = stop.nameChinese || stop.place?.name || stop.search;
              const context = `${dayContext} · ${stopNumber(dayNumber, index)} ${label}`;
              const editStop = (action: 'earlier' | 'later' | 'replace' | 'remove') => {
                onSelect(dayNumber, index);
                onEdit(stopRequest(day, stop, dayNumber, index, action, zh), context);
              };
              const active = dayIndex === dayNumber && selectedStop === index;
              return <Fragment key={stop.id}>
                {incoming && <div className={styles.richConnection}><span /><ArrowRightLeft size={12} /><p>{formatLeg(incoming, zh)}</p><small>{incoming.checkedAt ? `${incoming.provider || 'Map'} ${zh ? '估时' : 'estimate'}` : (zh ? '待核实' : 'Unverified')}</small></div>}
                <article className={`${styles.richStop} ${active ? styles.richStopActive : ''}`}>
                  <div className={styles.richStopTop}>
                    <button type="button" className={styles.richStopTitle} aria-pressed={active} onClick={() => onSelect(dayNumber, index)} aria-label={zh ? `在地图上查看 ${stopNumber(dayNumber, index)} ${label}` : `Locate ${stopNumber(dayNumber, index)} ${label}`}><span className={styles.richStopNumber}>{stopNumber(dayNumber, index)}</span><span><strong>{label}</strong><small>{zh ? englishName : chineseName}</small><em>{stop.pinyin || (zh ? '拼音待补充' : 'Pinyin to add')}</em></span></button>
                    <span className={styles.arrivalTime}>{stop.scheduledAt || stop.at || '—'}</span>
                  </div>
                  <div className={styles.richStopFacts}><span className={styles.categoryChip} data-category={stop.category}>{categoryLabel(stop, zh)}</span><span><Clock3 size={13} />{visitDuration(stop.durationMinutes, zh)}</span><span><Ticket size={13} />{stop.admission ? <a href={stop.admission.sourceUrl} target="_blank" rel="noopener noreferrer">{zh ? '票价参考：' : 'Admission ref: '}{stop.admission.text}</a> : (zh ? '票价待核实' : 'Admission to check')}</span>{stop.booked && <span className={styles.fixedBooking}><ShieldCheck size={12} />{zh ? '已预约 · 固定' : 'Booking · fixed'}</span>}</div>
                  <p className={styles.bestTime}><CloudSun size={13} /><span>{zh ? '推荐时段：' : 'Suggested time: '}{zh ? stop.bestTime || '可询问助手' : readableEnglish(stop.bestTime, 'Ask the assistant')}</span></p>
                  {(stop.description || stop.why) && <p className={styles.richStopDescription}>{zh ? stop.description || stop.why : readableEnglish(stop.description || stop.why, 'Ask the assistant for background on this place.')}</p>}
                  {!stop.place?.openingHours && <p className={styles.placeTip}>{zh ? '开放时间未验证 · 出发前请向场馆确认开放与预约要求' : 'Opening hours unverified · Confirm hours and reservations with the venue before visiting.'}</p>}{stop.place?.sourceUrl && <a className={styles.googleAttribution} translate="no" href={stop.place.sourceUrl} target="_blank" rel="noopener noreferrer">Google Maps ↗</a>}
                  <div className={styles.stopEditActions} aria-label={zh ? `修改景点 ${stopNumber(dayNumber, index)}` : `Edit stop ${stopNumber(dayNumber, index)}`}>
                    <button type="button" disabled={busy || index === 0 || stop.booked} onClick={() => editStop('earlier')} title={stop.booked ? (zh ? '此站有固定预约，请在对话中说明如何改动' : 'This booking is fixed; explain changes in conversation') : undefined}><ArrowUp size={12} />{zh ? '提前' : 'Earlier'}</button>
                    <button type="button" disabled={busy || index === day.stops.length - 1 || stop.booked} onClick={() => editStop('later')}><ArrowDown size={12} />{zh ? '延后' : 'Later'}</button>
                    <button type="button" disabled={busy || stop.booked} title={stop.booked ? (zh ? '此站有固定预约，请在对话中说明如何替换' : 'Explain how to change this fixed booking in conversation') : undefined} onClick={() => editStop('replace')}><ArrowRightLeft size={12} />{zh ? '替换' : 'Replace'}</button>
                    <button type="button" disabled={busy} className={styles.removeStop} onClick={() => editStop('remove')}><Trash2 size={12} />{zh ? '移除' : 'Remove'}</button>
                  </div>
                </article>
              </Fragment>;
            })}
            <button type="button" className={styles.addStop} disabled={busy || day.stops.length >= 4} title={day.stops.length >= 4 ? (zh ? '每天最多 4 站，可先通过对话替换景点' : 'Up to 4 stops per day; replace a stop in conversation') : undefined} onClick={() => onEdit(zh ? `请在第 ${dayNumber + 1} 天（${cityName}）加入一个适合这趟旅行、路线顺路的景点，保留已有预约并重新核对时间；如果太赶，请先说明取舍。` : `Add a suitable nearby stop to Day ${dayNumber + 1} in ${cityName}, keep bookings fixed and recheck timings; explain tradeoffs if the day becomes too busy.`, dayContext)}><Plus size={14} />{zh ? '通过对话添加一站' : 'Add a stop in conversation'}</button>
          </div>
          {day.checks.length > 0 && <details className={styles.checks}><summary><ShieldCheck size={14} />{zh ? `出行前确认 · ${day.checks.length} 项` : `Before you go · ${day.checks.length} checks`}<ChevronDown size={14} /></summary><ul>{day.checks.map((check, index) => <li key={index}>{zh ? check : readableEnglish(check, 'Confirm this place or route before departure.')}</li>)}</ul></details>}
          {hasMissingInfo && <button type="button" className={styles.enrichDay} disabled={busy} onClick={() => onEdit(zh ? `请补全第 ${dayNumber + 1} 天所有景点的中英文名称、汉语拼音、类型、推荐时段与有来源的票价参考；保留原有景点、顺序和预约，不确定的信息标为待核实。` : `Enrich Day ${dayNumber + 1} with Chinese and English names, Mandarin pinyin, categories, recommended visit windows and sourced admission references. Keep the same places, order and bookings; mark uncertain details as unverified.`, dayContext)}><Sparkles size={12} />{zh ? '让助手补全这天的景点资料' : 'Ask the assistant to enrich this day'}</button>}
        </article>
      </Fragment>;
    })}
    {plan.checks.length > 0 && <div className={styles.overallChecks}><strong>{zh ? '仍需你补充' : 'Still needed from you'}</strong>{plan.checks.map((check, index) => <p key={index}>{zh ? check : readableEnglish(check, 'Ask the assistant to clarify this question.')}</p>)}</div>}
  </div>;
}
