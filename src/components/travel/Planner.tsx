'use client';

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { ArrowRight, Check, ChevronDown, Clock3, CloudSun, Compass, CornerDownLeft, Footprints, Map as MapIcon, MapPin, MessageSquare, Plus, Send, Sparkles, Square } from 'lucide-react';
import { useLocale } from '@/i18n/context';
import type { ConciergeEvent, TripIntent, TripMessage, VerifiedLeg, VerifiedStop, VerifiedTrip } from '@/lib/travel/concierge-types';
import cityPhotoFallbacks from '@/lib/travel/plan-city-photos.json';
import { cityLabel, placeAddress, readableEnglish, stopLabel, stopNumber } from '@/lib/travel/english-display';
import { formatLeg, weatherLabel } from '@/lib/travel/itinerary-display';
import ItineraryOverview from './ItineraryOverview';
import styles from './Planner.module.css';

const STORAGE_KEY = 'china-unfold-route-concierge-v1';
const MAX_STORED_MESSAGES = 40;
const phases = ['understanding', 'research', 'drafting', 'places', 'routes', 'weather', 'review'] as const;
type Phase = typeof phases[number];
type MobileView = 'chat' | 'map';
const ConciergeJourneyMap = dynamic(() => import('./ConciergeJourneyMap'), { ssr: false });

function messageForPhase(phase: Phase, zh: boolean) {
  const en: Record<Phase, string> = { understanding: 'Understanding your trip', research: 'Searching current China travel sources', drafting: 'Building your itinerary', places: 'Matching real places', routes: 'Checking travel times', weather: 'Checking date-specific weather', review: 'Reviewing the day-by-day plan' };
  const cn: Record<Phase, string> = { understanding: '理解你的需求', research: '联网查询中国旅行资料', drafting: '编排行程', places: '匹配真实地点', routes: '核对交通时间', weather: '核对出行日期天气', review: '检查每日安排' };
  return (zh ? cn : en)[phase];
}

type CityPhoto = { file: string; author: string; license: string; source: string; city: string };
const cityPhotos = cityPhotoFallbacks as Record<string, CityPhoto>;

function StopPhoto({ stop, city, label, zh }: { stop: VerifiedStop; city: string; label: string; zh: boolean }) {
  const [amapFailed, setAmapFailed] = useState(false);
  const [fallbackFailed, setFallbackFailed] = useState(false);
  const fallback = cityPhotos[city] || cityPhotos[city.replace(/市$/, '')];
  const amapPhoto = amapFailed ? undefined : stop.place?.photo;
  const image = amapPhoto?.url || (!fallbackFailed ? fallback?.file : undefined);
  return <figure className={styles.stopPhoto}>
    {image ? <Image src={image} alt={amapPhoto ? (zh ? `${stop.name}的高德地点照片` : `Amap place photo of ${label}`) : (zh ? `${fallback?.city || city}城市配图，并非${stop.name}的照片` : `${fallback?.city || city} city view, not a photo of ${label}`)} width={360} height={250} sizes="(max-width: 780px) 100vw, 190px" unoptimized={Boolean(amapPhoto)} className={styles.stopPhotoImage} onError={() => amapPhoto ? setAmapFailed(true) : setFallbackFailed(true)} /> : <div className={styles.photoMissing}><MapPin size={24} /><span>{zh ? '暂无该地点照片' : 'No place photo available'}</span></div>}
    <figcaption>{amapPhoto ? <>{zh ? '照片：高德地点资料' : 'Photo: Amap place listing'}{amapPhoto.title && (zh || !/[\u3400-\u9fff]/u.test(amapPhoto.title)) ? ` · ${amapPhoto.title}` : ''}</> : fallback && !fallbackFailed ? <>{zh ? '城市配图，非该景点实景' : 'City view, not this stop'} · <a href={fallback.source} target="_blank" rel="noopener noreferrer">{zh ? fallback.author : readableEnglish(fallback.author, 'Wikimedia contributor')} · {fallback.license}</a></> : (zh ? '地点照片待补充' : 'Place photo to add')}</figcaption>
  </figure>;
}

export default function Planner({ amapJsKey, amapEnglishEnabled }: { amapJsKey: string; amapEnglishEnabled: boolean }) {
  const locale = useLocale();
  const zh = locale === 'zh';
  const storageKey = locale === 'en' ? STORAGE_KEY : `${STORAGE_KEY}-${locale}`;
  const [messages, setMessages] = useState<TripMessage[]>([]);
  const [plan, setPlan] = useState<VerifiedTrip | null>(null);
  const [phase, setPhase] = useState<Phase | null>(null);
  const [intent, setIntent] = useState<TripIntent | null>(null);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState('');
  const [editContext, setEditContext] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [error, setError] = useState('');
  const [dayIndex, setDayIndex] = useState(0);
  const [allDays, setAllDays] = useState(true);
  const [selectedStop, setSelectedStop] = useState(0);
  const [mobileView, setMobileView] = useState<MobileView>('chat');
  const [ready, setReady] = useState(false);
  const [previousPlan, setPreviousPlan] = useState<VerifiedTrip | null>(null);
  const abort = useRef<AbortController | null>(null);
  const feedRef = useRef<HTMLDivElement>(null);
  const mapDetailsRef = useRef<HTMLDivElement>(null);
  const revealPlan = useRef(false);
  const geometryChecked = useRef('');
  const photoChecked = useRef(new Set<string>());

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          const saved = JSON.parse(raw) as { messages?: TripMessage[]; plan?: VerifiedTrip };
          if (Array.isArray(saved.messages)) setMessages(saved.messages.slice(-MAX_STORED_MESSAGES));
          if (saved.plan && Array.isArray(saved.plan.days)) setPlan(saved.plan);
        }
      } catch { /* A fresh local draft is still usable. */ }
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [storageKey]);
  useEffect(() => { if (ready) { try { localStorage.setItem(storageKey, JSON.stringify({ messages: messages.slice(-MAX_STORED_MESSAGES), plan })); } catch { /* Storage may be disabled. */ } } }, [messages, plan, ready, storageKey]);
  useEffect(() => { mapDetailsRef.current?.scrollTo({ top: 0 }); }, [dayIndex, selectedStop]);
  useEffect(() => { const feed = feedRef.current; if (feed) feed.scrollTo({ top: feed.scrollHeight, behavior: 'smooth' }); }, [messages, phase]);
  useEffect(() => {
    if (!ready || !plan || busy || geometryChecked.current === plan.createdAt) return;
    geometryChecked.current = plan.createdAt;
    type Place = NonNullable<VerifiedStop['place']>;
    const jobs: { dayIndex: number; legIndex: number; transfer: boolean; from: Place; to: Place }[] = [];
    plan.days.forEach((item, index) => {
      item.legs.forEach((leg, legIndex) => {
        if (!leg.checkedAt || leg.geometry?.length) return;
        const from = leg.from === 'hotel' ? item.hotelPlace : item.stops.find(stop => stop.id === leg.from)?.place;
        const to = item.stops.find(stop => stop.id === leg.to)?.place;
        if (from && to) jobs.push({ dayIndex: index, legIndex, transfer: false, from, to });
      });
      const transfer = item.transfer?.leg;
      if (index && transfer?.checkedAt && !transfer.geometry?.length) {
        const prior = plan.days[index - 1];
        const from = prior.hotelPlace || prior.stops.at(-1)?.place;
        const to = item.hotelPlace || item.stops[0]?.place;
        if (from && to) jobs.push({ dayIndex: index, legIndex: -1, transfer: true, from, to });
      }
    });
    if (!jobs.length) return;
    void fetch('/api/trip-route-geometry', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ easier: /parent|senior|elder|easy|slow|少走|父母|老人|轻松|无障碍/i.test(plan.travelStyle || ''), legs: jobs.map(({ from, to }) => ({ from, to })) }),
    }).then(response => response.ok ? response.json() : null).then((data: { routes?: { index: number; geometry: VerifiedLeg['geometry'] }[] } | null) => {
      if (!data?.routes?.length) return;
      setPlan(current => {
        if (!current || current.createdAt !== plan.createdAt) return current;
        const days = current.days.map(item => ({ ...item, legs: item.legs.map(leg => ({ ...leg })), transfer: item.transfer ? { ...item.transfer, leg: { ...item.transfer.leg } } : undefined }));
        for (const result of data.routes || []) {
          const job = jobs[result.index];
          if (!job || !result.geometry?.length) continue;
          const target = days[job.dayIndex];
          if (!target) continue;
          if (job.transfer && target.transfer) target.transfer.leg.geometry = result.geometry;
          else if (target.legs[job.legIndex]) target.legs[job.legIndex].geometry = result.geometry;
        }
        return { ...current, days };
      });
    }).catch(() => { /* Existing schematic connections remain visible. */ });
  }, [plan, ready, busy]);
  const day = plan?.days[Math.min(dayIndex, Math.max(0, plan.days.length - 1))];
  useEffect(() => {
    if (!ready || !day) return;
    const ids = [...new Set(day.stops.map(stop => stop.place && !stop.place.photo ? stop.place.id : '').filter(Boolean))]
      .filter(id => !photoChecked.current.has(id)).slice(0, 10);
    if (!ids.length) return;
    ids.forEach(id => photoChecked.current.add(id));
    void fetch('/api/trip-place-photos', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }),
    }).then(response => response.ok ? response.json() : null).then((data: { photos?: Record<string, { url: string; title?: string }> } | null) => {
      const photos = data?.photos;
      if (!photos || !Object.keys(photos).length) return;
      setPlan(current => {
        if (!current) return current;
        let changed = false;
        const days = current.days.map(item => ({ ...item, stops: item.stops.map(stop => {
          const photo = stop.place && photos[stop.place.id];
          if (!photo || !stop.place || stop.place.photo) return stop;
          changed = true;
          return { ...stop, place: { ...stop.place, photo } };
        }) }));
        return changed ? { ...current, days } : current;
      });
    }).catch(() => { /* A licensed city view remains available. */ });
  }, [day, ready]);

  useEffect(() => {
    if (busy || !plan || !revealPlan.current) return;
    revealPlan.current = false;
    feedRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    if (window.innerWidth > 780) feedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [busy, plan]);

  async function send(value = input, reuse = false) {
    const requestText = value.trim();
    if (!requestText || busy) return;
    const nextMessages: TripMessage[] = reuse ? messages : [...messages, { role: 'user', text: requestText }];
    if (!reuse) setMessages(nextMessages);
    setInput(''); setEditContext(''); setError(''); setBusy(true); setPhase(null); setIntent(null);
    const controller = new AbortController(); abort.current = controller;
    try {
      const response = await fetch('/api/trip-concierge', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages.slice(-10), currentPlan: plan, locale }), signal: controller.signal,
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error || (zh ? '行程请求失败。' : 'The trip request failed.'));
      }
      if (!response.body) throw new Error(zh ? '无法读取规划结果。' : 'Could not read the planning result.');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let routedIntent: TripIntent | null = null;
      const consume = (line: string) => {
        if (!line.trim()) return;
        const event = JSON.parse(line) as ConciergeEvent;
        if (event.type === 'intent') {
          routedIntent = event.intent;
          setIntent(event.intent);
          setMessages(current => current.map((message, index) => index === current.length - 1 && message.role === 'user' ? { ...message, intent: event.intent } : message));
        }
        if (event.type === 'phase') setPhase(event.phase);
        if (event.type === 'error') throw new Error(event.message);
        if (event.type === 'result') {
          revealPlan.current = true;
          setPreviousPlan(plan);
          setPlan(event.plan); setDayIndex(0); setSelectedStop(0); setAllDays(true);
          setMessages(current => [...current, { role: 'assistant', agent: 'route-concierge', text: event.reply }]);
          setPhase(null);
        }
        if (event.type === 'answer') {
          setMessages(current => [...current, { role: 'assistant', agent: 'travel-assistant', intent: routedIntent || undefined, text: event.reply, sources: event.sources }]);
          setPhase(null);
        }
      };
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        buffer += decoder.decode(chunk.value, { stream: true });
        const lines = buffer.split('\n'); buffer = lines.pop() || '';
        lines.forEach(consume);
      }
      if (buffer.trim()) consume(buffer);
    } catch (cause) {
      if (!controller.signal.aborted) setError(zh && cause instanceof TypeError ? '网络连接中断，请检查网络后重试。' : cause instanceof Error ? cause.message : (zh ? '行程规划失败。' : 'Trip planning failed.'));
    } finally { setBusy(false); setPhase(null); setIntent(null); abort.current = null; }
  }

  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); void send(); }
  function inputKey(event: KeyboardEvent<HTMLTextAreaElement>) { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void send(); } }
  function startNew() {
    if ((messages.length || plan) && !window.confirm(zh ? '开始新行程会清除当前浏览器中保存的对话和路线。继续吗？' : 'Start a new trip? This clears the conversation and route saved in this browser.')) return;
    abort.current?.abort();
    photoChecked.current.clear();
    setMessages([]); setPlan(null); setPreviousPlan(null); setError(''); setInput(''); setEditContext(''); setPhase(null); setIntent(null); setBusy(false); setDayIndex(0); setSelectedStop(0); setAllDays(true); setMobileView('chat');
  }
  function chooseDay(index: number, focusMap = false) { setDayIndex(index); setSelectedStop(0); if (focusMap) setAllDays(false); }
  function prepareEdit(request: string, context: string) {
    if (busy) return;
    setInput(request); setEditContext(context); setMobileView('chat');
    window.requestAnimationFrame(() => {
      inputRef.current?.focus({ preventScroll: true });
      inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }
  function selectStop(index: number, stop: number) {
    setDayIndex(index); setSelectedStop(stop); setAllDays(false); setMobileView('map');
  }
  const checkedLegs = day?.legs.filter(leg => leg.minutes !== undefined).length || 0;
  const totalLegs = day?.legs.length || 0;

  return <div className={styles.studio}>
    <header className={styles.intro}>
      <div><span className={styles.eyebrow}>{zh ? 'RAMBLE CHINA / 行程规划' : 'RAMBLE CHINA / PLAN A TRIP'}</span><h1>{zh ? <>先聊想去哪里，<em>再规划怎么走。</em></> : <>Explore first. <em>Plan when you’re ready.</em></>}</h1><p>{zh ? '问旅行助手景点与实用信息；想制定或修改行程时，路线管家会核对地点、交通与天气，并同步更新地图。' : 'Ask the Travel Assistant about places and practical details. When you want a route, the Route Concierge builds it and updates the map.'}</p></div>
  <div className={styles.introSide}><span><Sparkles size={15} /> {zh ? '旅行助手 + 路线管家' : 'Travel Assistant + Route Concierge'}</span><small>{zh ? '问题先分流 · 规划时查询高德地点、交通与天气' : 'Travel answers first · Amap checks when planning'}</small></div>
    </header>

    <div className={styles.mobileTabs} role="group" aria-label={zh ? '切换视图' : 'Switch view'}><button type="button" aria-pressed={mobileView === 'chat'} onClick={() => setMobileView('chat')}>{zh ? '对话与行程' : 'Conversation'}</button><button type="button" aria-pressed={mobileView === 'map'} onClick={() => setMobileView('map')}>{zh ? '路线地图' : 'Route & map'}</button></div>
    <div className={styles.workspace}>
      <section className={`${styles.chatPanel} ${plan ? styles.hasItinerary : ''} ${mobileView === 'map' ? styles.hideChatMobile : ''}`} aria-label={zh ? '旅行助手对话' : 'Travel Assistant conversation'}>
        <div className={styles.chatHead}><div className={styles.conciergeAvatar}>R</div><div><strong>Ramble China</strong><span>{zh ? '旅行助手 · 路线管家' : 'Travel Assistant · Route Concierge'}</span></div><span className={styles.liveBadge}><span /> {zh ? '按问题选择助手' : 'THE RIGHT HELP FOR EACH QUESTION'}</span><button type="button" className={styles.newTrip} onClick={startNew}><Plus size={13} /> {zh ? '新行程' : 'New trip'}</button></div>
        <div className={styles.feed} ref={feedRef}>
          {plan && <ItineraryOverview plan={plan} zh={zh} dayIndex={dayIndex} selectedStop={selectedStop} allDays={allDays} busy={busy} onSelect={selectStop} onDay={index => { chooseDay(index, true); setMobileView('map'); }} onEdit={prepareEdit} onUndo={previousPlan ? () => { setPlan(previousPlan); setPreviousPlan(null); setDayIndex(0); setSelectedStop(0); setAllDays(true); } : undefined} />}
          <details className={styles.conversationHistory} open={!plan || busy}>
            <summary>{zh ? `与助手对话 · ${messages.length} 条消息` : `Conversation · ${messages.length} messages`}<ChevronDown size={14} /></summary>
            <div className={styles.conversationMessages}>
          {!messages.length && <div className={styles.welcome}><span className={styles.welcomeMark}><Sparkles size={18} /></span><h2>{zh ? '先问问，再决定。' : 'Curious? Start there.'}</h2><p>{zh ? '可以先了解值得去的地方。选好后，再告诉路线管家日期、酒店和已预约的票，让它编排地图上的行程。' : 'Explore places and travel tips first. When you know what you like, share your dates and bookings to turn them into a route.'}</p><div className={styles.suggestions}><button type="button" onClick={() => void send(zh ? '上海有哪些值得去的著名景点？先推荐一些，我会挑选。' : 'Give me famous places to visit in Shanghai. I will choose from your suggestions.')}>{zh ? '先看看上海景点' : 'Explore Shanghai places'} <ArrowRight size={14} /></button><button type="button" onClick={() => void send(zh ? '我住在上海外滩附近，带父母玩三天，第一天10点预约了豫园。希望少走路，留点时间看江景。' : 'Plan three days in Shanghai with my parents. We stay near the Bund, have Yu Garden tickets for Day 1 at 10:00, and want easy walking and a river view.')}>{zh ? '规划带父母的三天行程' : 'Plan three days with my parents'} <ArrowRight size={14} /></button></div></div>}
          {messages.map((message, index) => <div key={`${index}-${message.role}`} className={`${styles.message} ${message.role === 'user' ? styles.userMessage : styles.assistantMessage}`}>
            {message.role === 'assistant' && <span className={`${styles.messageAvatar} ${message.agent === 'travel-assistant' ? styles.travelAvatar : ''}`}>{zh ? (message.agent === 'travel-assistant' ? '旅' : '行') : (message.agent === 'travel-assistant' ? 'T' : 'C')}</span>}
            <div className={message.role === 'assistant' ? styles.assistantBubble : undefined}>
              {message.role === 'assistant' && <span className={styles.agentName}>{message.agent === 'travel-assistant' ? (zh ? '旅行助手' : 'Travel Assistant') : (zh ? '路线管家' : 'Route Concierge')}</span>}
              <p>{message.text}</p>
              {message.sources?.length ? <details className={styles.answerSources}><summary>{zh ? `查看来源 · ${message.sources.length}` : `View sources · ${message.sources.length}`}</summary><ol>{message.sources.map((source, sourceIndex) => <li key={`${source.url}-${sourceIndex}`}><a href={source.url} target="_blank" rel="noopener noreferrer">[{source.index || sourceIndex + 1}] {zh ? source.title : readableEnglish(source.title, `Source ${sourceIndex + 1}`)}</a></li>)}</ol></details> : null}
              {plan && message.intent === 'travel-assistant' && <small className={styles.routeUnchanged}>{zh ? '这条回答未修改现有行程。' : 'Your existing route was not changed.'}</small>}
            </div>
          </div>)}
            </div>
          </details>
          {plan && !busy && messages.at(-1)?.role === 'assistant' && <div className={styles.latestReply}><span><MessageSquare size={14} />{zh ? '助手回复' : 'Assistant reply'}</span><p>{messages.at(-1)?.text}</p></div>}
          {plan?.research && !busy && messages.at(-1)?.agent !== 'travel-assistant' && <details className={styles.researchCard}>
            <summary><Compass size={15} /> {zh ? `本次联网资料 · ${plan.research.sources.length} 个来源` : `Web research · ${plan.research.sources.length} sources`} <ChevronDown size={14} /></summary>
            <p>{zh ? plan.research.summary : readableEnglish(plan.research.summary, 'This saved research brief is in Chinese. Ask the concierge to refresh it in English.')}</p>
            <ol>{plan.research.sources.map((source, index) => <li key={`${source.url}-${index}`}><a href={source.url} target="_blank" rel="noopener noreferrer">[{source.index || index + 1}] {zh ? source.title : readableEnglish(source.title, `Source ${index + 1}`)}</a>{source.site && <small> · {zh ? source.site : readableEnglish(source.site, 'Website')}</small>}</li>)}</ol>
            <small>{zh ? '搜索结果是规划参考；预约、票价和开放规则请以对应官方页面为准。' : 'Search results inform the plan; confirm bookings, prices and opening rules on the relevant official site.'}</small>
          </details>}
          {busy && <div className={styles.progressCard} role="status" aria-live="polite"><div className={styles.progressTitle}><span className={styles.spinner} /><strong>{intent === 'route-concierge' ? (zh ? '路线管家正在核对行程' : 'Route Concierge is checking your route') : intent === 'travel-assistant' ? (zh ? '旅行助手正在查找资料' : 'Travel Assistant is checking current sources') : (zh ? '正在理解你的问题' : 'Finding the right help for your question')}</strong></div>{intent === 'route-concierge' ? <ol>{phases.map((step, index) => { const current = phases.indexOf(phase || 'understanding'); return <li key={step} className={index < current ? styles.doneStep : index === current ? styles.currentStep : ''}><span>{index < current ? <Check size={12} /> : index + 1}</span>{messageForPhase(step, zh)}</li>; })}</ol> : <small>{intent === 'travel-assistant' ? (zh ? '会直接回答，不改动地图上的行程。' : 'Answering directly without changing your route.') : (zh ? '根据问题选择合适的助手。' : 'Choosing the right assistant for this question.')}</small>}</div>}
          {error && <div className={styles.error} role="alert">{error}<button type="button" onClick={() => void send(messages.at(-1)?.text || '', true)}>{zh ? '重试' : 'Retry'}</button></div>}
          {plan && !busy && <div className={styles.refine}><strong>{zh ? '继续调整这趟旅行' : 'Keep refining this trip'}</strong><button type="button" onClick={() => void send(zh ? '把第一天安排得更轻松，但保留所有已预约的票。' : 'Make Day 1 easier, but keep every booked ticket fixed.')}>{zh ? '少走一些路' : 'Less walking'}</button><button type="button" onClick={() => void send(zh ? '如果下雨，给我一套室内备选，并说明哪些地方需要重新确认。' : 'If it rains, suggest nearby indoor alternatives and tell me what needs checking.')}>{zh ? '准备雨天方案' : 'Rainy-day backup'}</button></div>}
        </div>
        <form className={styles.composer} onSubmit={submit}><label htmlFor="trip-request" className={styles.srOnly}>{zh ? '描述行程或提出修改' : 'Describe your trip or request a change'}</label>{editContext && <div className={styles.editContext} role="status"><span><Sparkles size={13} />{editContext}</span><button type="button" onClick={() => { setInput(''); setEditContext(''); }} aria-label={zh ? '取消修改需求' : 'Cancel edit request'}>×</button><small>{zh ? '修改需求已填入，发送后由路线管家更新行程。' : 'Request ready. Send it to update your itinerary.'}</small></div>}<textarea ref={inputRef} id="trip-request" value={input} onChange={event => setInput(event.target.value)} onKeyDown={inputKey} rows={2} maxLength={2500} placeholder={zh ? '告诉我你住哪里、和谁同行、预约了什么，或想改哪一天…' : 'Where are you staying? Who is coming? Any tickets booked? Or tell me what to change…'} /><button type={busy ? 'button' : 'submit'} onClick={busy ? () => abort.current?.abort() : undefined} aria-label={busy ? (zh ? '停止规划' : 'Stop planning') : (zh ? '发送需求' : 'Send request')} disabled={!busy && !input.trim()}>{busy ? <Square size={17} fill="currentColor" /> : <Send size={17} />}</button><div className={styles.composeHint}><span>{zh ? '通过对话修改 · 保留已预约时间' : 'Edit by conversation · keep bookings fixed'}</span><span><CornerDownLeft size={12} /> {zh ? '回车发送' : 'Enter to send'}</span></div></form>
      </section>

      <section className={`${styles.mapPanel} ${mobileView === 'chat' ? styles.hideMapMobile : ''}`} aria-label={zh ? '高德行程地图' : 'Amap itinerary map'}>
        <div className={styles.panelHead}><div><span className={styles.panelKicker}><MapIcon size={13} /> {zh ? '路线地图' : 'YOUR ROUTE ON THE MAP'}</span><h2>{plan && allDays ? (zh ? '完整旅行路线' : 'Your whole trip') : day ? `${zh ? '第' : 'Day '}${dayIndex + 1}${zh ? '天' : ''} · ${cityLabel(day, zh)}` : (zh ? '从一个目的地开始' : 'Start with a place')}</h2></div><span className={styles.provider}>{amapEnglishEnabled ? (zh ? '高德英文地图' : 'Amap English map') : (zh ? '高德中文地图' : 'Amap Chinese map')}</span></div>
        {plan && <div className={styles.dayRail} role="tablist" aria-label={zh ? '行程日期' : 'Trip days'}><button type="button" role="tab" aria-selected={allDays} onClick={() => setAllDays(true)}>{zh ? '全部行程' : 'Whole trip'}<small>{plan.days.length} {zh ? '天' : 'days'}</small></button>{plan.days.map((item, index) => <button type="button" role="tab" aria-selected={!allDays && dayIndex === index} key={item.id} onClick={() => chooseDay(index, true)}>{zh ? `第 ${index + 1} 天` : `Day ${index + 1}`}<small>{cityLabel(item, zh)}</small></button>)}</div>}
        <div className={styles.mapFrame}>
          <ConciergeJourneyMap plan={plan} dayIndex={dayIndex} allDays={allDays} selectedStop={selectedStop} onSelect={(index, stop) => { setDayIndex(index); setSelectedStop(stop); }} zh={zh} amapJsKey={amapJsKey} amapEnglishEnabled={amapEnglishEnabled} />
          <div className={styles.mapLegend}>{zh ? '实线：高德返回的路径 · 虚线：未返回路径的衔接段 · 滚轮缩放，拖动地图' : 'Solid: Amap route geometry · dashed: schematic connection · scroll to zoom, drag to pan'}</div>
        </div>
        {day ? <div className={styles.mapDetails} ref={mapDetailsRef}>
          <div className={styles.mapStats}><div><Footprints size={17} /><span>{zh ? '地点' : 'Stops'}<b>{day.stops.length}</b></span></div><div><Clock3 size={17} /><span>{zh ? '已核对路段' : 'Checked legs'}<b>{checkedLegs}/{totalLegs}</b></span></div><div><CloudSun size={17} /><span>{zh ? '当日天气' : 'Weather'}<b>{weatherLabel(day, zh)}</b></span></div></div>
          <div className={styles.stopSectionHead}><div><small>{zh ? `第 ${dayIndex + 1} 天 · 实地看点` : `DAY ${dayIndex + 1} · ON THE GROUND`}</small><h3>{zh ? '地图中的这一站' : 'Selected place'}</h3></div><span>{zh ? '点击行程中的景点查看地图' : 'Select a stop in the itinerary'}</span></div>
          <div className={styles.stopCards}>{day.stops.map((stop, index) => {
            if (index !== selectedStop) return null;
            const incoming = day.legs.find(leg => leg.to === stop.id);
            return <article key={stop.id} className={`${styles.placeCard} ${selectedStop === index ? styles.placeCardActive : ''}`}>
              <StopPhoto key={`${stop.id}-${stop.place?.photo?.url || ''}`} stop={stop} city={day.city} label={stopLabel(stop, day, index, zh)} zh={zh} />
              <div className={styles.placeCardBody}>
                <div className={styles.placeCardTop}><span className={styles.selectedBadge}>{stopNumber(dayIndex, index)}</span><span>{stop.scheduledAt || stop.at || (zh ? '时间待确认' : 'Time to confirm')} · {stop.durationMinutes} {zh ? '分钟' : 'min'}</span>{stop.booked && <em>{zh ? '已预约' : 'Booked'}</em>}</div>
                <button type="button" className={styles.placeTitle} onClick={() => { setSelectedStop(index); setAllDays(false); }} aria-pressed={selectedStop === index}>{stopLabel(stop, day, index, zh)}</button>
                {stop.description ? <p className={styles.placeDescription}>{zh ? stop.description : readableEnglish(stop.description, 'This is a stop on your saved itinerary. Ask the concierge to refresh its description in English.')}</p> : <p className={styles.placeDescription}>{zh ? (stop.why || '路线管家尚未补充景点背景，可在对话中要求介绍。') : readableEnglish(stop.why, 'Ask the concierge for more background on this place.')}</p>}
                {stop.description && stop.why && <p className={styles.placeWhy}><strong>{zh ? '适合这趟旅行' : 'Why it fits your trip'}</strong>{zh ? stop.why : readableEnglish(stop.why, 'Ask the concierge to refresh this note in English.')}</p>}
                {stop.visitTip && <p className={styles.placeTip}><strong>{zh ? '现场提醒' : 'On-site note'}</strong>{zh ? stop.visitTip : readableEnglish(stop.visitTip, 'Confirm the visit details with the venue.')}</p>}
                <div className={styles.placeFacts}><span><MapPin size={13} /> {placeAddress(stop, day, zh)}</span>{incoming && <span><Footprints size={13} /> {formatLeg(incoming, zh)}</span>}{stop.place?.openingHours && (zh || !/[\u3400-\u9fff]/u.test(stop.place.openingHours)) && <span><Clock3 size={13} /> {zh ? '高德所列' : 'Amap lists'} {stop.place.openingHours} · {zh ? '以场馆公告为准' : 'confirm with venue'}</span>}</div>
              </div>
            </article>;
          })}</div>
          <p className={styles.mapNote}>{amapEnglishEnabled ? (zh ? '底图使用高德 JS API 英文图面；地点、路线与天气来自高德 Web 服务。交通时间是查询时估算；跨城车次与机票需另行核实。' : 'English basemap by Amap JS API; places, routes and weather by Amap Web Service. Times are lookup estimates. Confirm intercity tickets separately.') : (zh ? '底图、地点、路线与天气均来自高德。中文底图与查询结果使用一致的坐标。交通时间是查询时估算；跨城车次与机票需另行核实。' : 'Basemap, places, routes and weather by Amap. Chinese map labels are used while multilingual-map access is pending. Times are lookup estimates. Confirm intercity tickets separately.')}</p>
        </div> : <div className={styles.mapEmpty}><Compass size={24} /><p>{zh ? '描述你的旅行后，这里会显示每天的高德地图与地点顺序。' : 'Describe your trip and this Amap view will show each day’s real places in order.'}</p></div>}
      </section>
    </div>
  </div>;
}
