'use client';
import {useWebsiteText} from '@/i18n/context';

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { ArrowRight, Check, ChevronDown, Compass, CornerDownLeft, Map as MapIcon, Plus, Send, Sparkles, Square } from 'lucide-react';
import { useLocale } from '@/i18n/context';
import type { ConciergeEvent, TripIntent, TripMessage, VerifiedLeg, VerifiedStop, VerifiedTrip } from '@/lib/travel/concierge-types';
import { cityLabel, readableEnglish } from '@/lib/travel/english-display';
import ItineraryOverview from './ItineraryOverview';
import MapPlaceCard from './MapPlaceCard';
import { storedTrip } from '@/lib/travel/trip-storage';
import { planSignInPathFor } from '@/components/account/PlanEntryLink';
import {useAuth} from '@/components/account/AuthProvider';
import {useTripPersistence} from '@/components/account/useTripPersistence';
import Link from 'next/link';
import styles from './Planner.module.css';

const phases = ['understanding', 'research', 'drafting', 'places', 'routes', 'weather', 'review'] as const;
type Phase = typeof phases[number];
type MobileView = 'chat' | 'itinerary' | 'map';
const ConciergeJourneyMap = dynamic(() => import('./ConciergeJourneyMap'), { ssr: false });

function messageForPhase(phase: Phase, zh: boolean) {
  const en: Record<Phase, string> = { understanding: 'Understanding your trip', research: 'Searching current China travel sources', drafting: 'Building your itinerary', places: 'Matching real places', routes: 'Checking travel times', weather: 'Checking date-specific weather', review: 'Reviewing the day-by-day plan' };
  const cn: Record<Phase, string> = { understanding: '理解你的需求', research: '联网查询中国旅行资料', drafting: '编排行程', places: '匹配真实地点', routes: '核对交通时间', weather: '核对出行日期天气', review: '检查每日安排' };
  return (zh ? cn : en)[phase];
}

export default function Planner({tripId}:{tripId?:string}) {
  const {user}=useAuth();
  return <PlannerWorkspace key={user?.id||'guest'} tripId={tripId}/>;
}
function PlannerWorkspace({tripId}:{tripId?:string}) {
  const t=useWebsiteText();
  const {user,loading:authLoading,error:authError}=useAuth();
  const router=useRouter();
  const locale = useLocale();
  const zh = locale === 'zh';
  const [phase, setPhase] = useState<Phase | null>(null);
  const [intent, setIntent] = useState<TripIntent | null>(null);
  const [busy, setBusy] = useState(false);
  const {messages,setMessages,plan,setPlan,ready,loadedPlan,loadError,saveState,saveError,retrySave,saveNow,reset,conflict,dirty}=useTripPersistence(tripId,busy,Boolean(user),locale);
  const [input, setInput] = useState('');
  const [editContext, setEditContext] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [error, setError] = useState('');
  const [dayIndex, setDayIndex] = useState(0);
  const [allDays, setAllDays] = useState(true);
  const [selectedStop, setSelectedStop] = useState(0);
  const [popup, setPopup] = useState<{ dayIndex: number; stopIndex: number } | null>(null);
  const [mobileView, setMobileView] = useState<MobileView>('chat');
  const [previousPlan, setPreviousPlan] = useState<VerifiedTrip | null>(null);
  const [restoreFailed, setRestoreFailed] = useState(false);
  const [resetConfirmation, setResetConfirmation] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const feedRef = useRef<HTMLDivElement>(null);
  const itineraryRef = useRef<HTMLDivElement>(null);
  const [dayToReveal, setDayToReveal] = useState<{ index: number } | null>(null);
  const revealedDay = useRef<typeof dayToReveal>(null);
  const revealPlan = useRef(false);
  const geometryChecked = useRef('');

  useEffect(() => () => abort.current?.abort(), []);

  useEffect(()=>{
    if(!dirty&&!busy)return;
    const protectLanguage=(event:Event)=>{event.preventDefault();if(!busy)void saveNow();setError(t(busy?"Wait for the current request to finish before leaving.":"Your changes are being saved. Open the page once the save is confirmed."));};
    document.addEventListener("ramble-language-change",protectLanguage);
    const protect=(event:MouseEvent)=>{
      const anchor=(event.target as Element)?.closest('a');
      if(!anchor||anchor.target==='_blank'||event.ctrlKey||event.metaKey||event.shiftKey||anchor.getAttribute('href')?.startsWith('#'))return;
      // Intercept internal navigation during unsaved work; source links in new tabs stay usable.
      if(new URL(anchor.href).origin!==window.location.origin)return;
      event.preventDefault();event.stopImmediatePropagation();
      if(!busy)void saveNow();
      setError(busy?t("Wait for the current request to finish before leaving."):t("Your changes are being saved. Open the page once the save is confirmed."));
    };
    document.addEventListener('click',protect,true);return()=>{document.removeEventListener('click',protect,true);document.removeEventListener("ramble-language-change",protectLanguage);};
  },[dirty,busy,saveNow,t]);

  useEffect(() => {
    if (!dayToReveal || revealedDay.current === dayToReveal) return;
    const feed = itineraryRef.current;
    const target = feed?.querySelector<HTMLElement>(`[data-itinerary-day="${dayToReveal.index}"]`);
    // A phone may show only the map. Reveal the day when its itinerary pane is visible.
    if (!feed?.getClientRects().length || !target?.getClientRects().length) return;
    feed.scrollTo({
      top: feed.scrollTop + target.getBoundingClientRect().top - feed.getBoundingClientRect().top - 10,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
    });
    revealedDay.current = dayToReveal;
  }, [dayToReveal, mobileView, plan]);

  useEffect(()=>{
    if(!loadedPlan)return;
    const controller=new AbortController();
    void fetch('/api/trip-refresh',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({plan:loadedPlan,locale}),signal:controller.signal})
      .then(async response=>{const data=await response.json();if(!response.ok)throw Error(data.error);return data.plan as VerifiedTrip;})
      .then(fresh=>setPlan(current=>current===loadedPlan?fresh:current))
      .catch(error=>{if(!controller.signal.aborted){setRestoreFailed(true);setError(error instanceof Error?error.message:t("Map data could not be refreshed."));}});
    return()=>controller.abort();
  },[loadedPlan,locale,setPlan,t]);
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
  }, [plan, ready, busy, setPlan]);
  const day = plan?.days[Math.min(dayIndex, Math.max(0, plan.days.length - 1))];


  useEffect(() => {
    if (busy || !plan || !revealPlan.current) return;
    revealPlan.current = false;
    itineraryRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    setMobileView('itinerary');
  }, [busy, plan]);

  async function refreshSaved() {
    if (!plan || busy) return;
    const identity = plan.createdAt;
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/trip-refresh', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan: storedTrip(plan), locale }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setPlan(current => current?.createdAt === identity ? data.plan : current); setPopup(null); setRestoreFailed(false);
    } catch (error) { setError(error instanceof Error ? error.message : 'Map data could not be refreshed.'); }
    finally { setBusy(false); }
  }

  async function send(value = input, reuse = false) {
    if(authLoading)return;
    if(!user){router.push(planSignInPathFor(locale));return;}
    const requestText = value.trim();
    setRestoreFailed(false);
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
          setPlan(event.plan); setPopup(null); setDayToReveal(null); setDayIndex(0); setSelectedStop(0); setAllDays(true);
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
    setResetConfirmation(false);
    abort.current?.abort();
    setPopup(null);
    setDayToReveal(null);
    reset(); setPreviousPlan(null); setError(''); setInput(''); setEditContext(''); setPhase(null); setIntent(null); setBusy(false); setDayIndex(0); setSelectedStop(0); setAllDays(true); setMobileView('chat');
  }
  function requestNew() {
    if(authLoading)return;
    if(!user){router.push(planSignInPathFor(locale));return;}
    if(busy){setError('Wait for the current request to finish before starting a new trip.');return;}
    if(saveState==='saving'||saveError){setError('Save your current changes before starting a new trip.');return;}
    if(dirty){void saveNow();setError('Saving your current changes. Start the new trip once they are saved.');return;}
    if (messages.length || plan) setResetConfirmation(true);
    else startNew();
  }
  function chooseDay(index: number, focusMap = false) { setPopup(null); setDayIndex(index); setSelectedStop(0); setDayToReveal({ index }); if (focusMap) setAllDays(false); }
  function prepareEdit(request: string, context: string) {
    if(authLoading)return;
    if(!user){router.push(planSignInPathFor(locale));return;}
    if (busy) return;
    setInput(request); setEditContext(context); setMobileView('chat');
    window.requestAnimationFrame(() => {
      inputRef.current?.focus({ preventScroll: true });
      inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }
  function selectStop(index: number, stop: number) {
    setDayIndex(index); setSelectedStop(stop); setAllDays(false); setPopup({ dayIndex: index, stopIndex: stop }); setMobileView('map');
  }
  const popupDay = popup ? plan?.days[popup.dayIndex] : undefined;
  const popupStop = popupDay && popup ? popupDay.stops[popup.stopIndex] : undefined;
  const placeCard = popup && popupDay && popupStop ? <MapPlaceCard key={`${plan?.createdAt}:${popupDay.id}:${popupStop.id}`} day={popupDay} dayIndex={popup.dayIndex} stop={popupStop} stopIndex={popup.stopIndex} zh={zh} onClose={() => setPopup(null)} /> : null;

  if(loadError)return <section className={styles.accountStatus} role="alert"><h2>{t("Your trip could not be opened.")}</h2><p>{t(loadError)}</p><button onClick={()=>window.location.reload()}>{t("Retry")}</button> <Link href={`/${locale}/account`}>{t("Back to my trips")}</Link></section>;
  if(!ready)return <section className={styles.accountStatus} role="status">{t("Loading your saved trip…")}</section>;
  return <div className={styles.studio}>
    <div className={styles.mobileTabs} role="group" aria-label={zh ? '切换视图' : t("Switch view")}>
      <button type="button" aria-pressed={mobileView === 'chat'} onClick={() => setMobileView('chat')}>{zh ? '对话' : t("Assistant")}</button>
      <button type="button" aria-pressed={mobileView === 'itinerary'} onClick={() => setMobileView('itinerary')}>{zh ? '行程' : t("Itinerary")}</button>
      <button type="button" aria-pressed={mobileView === 'map'} onClick={() => setMobileView('map')}>{zh ? '地图' : t("Map")}</button>
    </div>
    <div className={styles.workspace}>
      <section className={`${styles.chatPanel} ${mobileView !== 'chat' ? styles.hidePaneMobile : ''}`} aria-label={zh ? '旅行助手对话' : t("Travel Assistant conversation")}>
        <div className={styles.chatHead}><h2 className={styles.assistantLabel}>{zh ? '旅行助手 · 路线管家' : 'Travel Assistant · Route Concierge'}</h2><span className={styles.liveBadge}><span /> {zh ? '按问题选择助手' : t("THE RIGHT HELP FOR EACH QUESTION")}</span><button type="button" className={styles.newTrip} onClick={requestNew} disabled={authLoading}><Plus size={13} /> {zh ? '新行程' : t("New trip")}</button></div>
        <div className={styles.saveBar}><span role="status">{!user?t("Start a new trip to plan your journey."):saveState==='saving'?t("Saving to your account…"):saveError?t("Changes not saved"):dirty?t("Changes waiting to save"):saveState==='saved'?t("Saved to your account"):t("Your trips save to your account")}</span>{user?<Link href={`/${locale}/account`} onClick={event=>{if(dirty||busy){event.preventDefault();void saveNow();setError(t("Wait until your changes are saved before opening My trips."));}}}>{t("My trips →")}</Link>:tripId?<Link href={`/${locale}/login?next=${encodeURIComponent(`/${locale}/plan?trip=${tripId}`)}`}>{t("Open saved trip →")}</Link>:null}</div>
        {authError&&<p className={styles.error} role="alert">{t(authError)}</p>}
        {saveError&&<div className={styles.saveFailure} role="alert"><p>{t(saveError)}</p>{conflict?<button onClick={()=>{if(window.confirm(t("Reopen the saved version? Unsaved changes in this tab will be discarded.")))window.location.reload();}}>{t("Reopen saved trip")}</button>:<><button onClick={retrySave}>{t("Retry saving")}</button> · <Link target="_blank" href={`/${locale}/login?next=/${locale}/account`}>{t("Check sign-in in a new tab")}</Link></>}</div>}
        {resetConfirmation && <div className={styles.resetPrompt} role="group" aria-label={zh ? '确认开始新行程' : t("Confirm starting a new trip")}>
          <p aria-live="polite">{t("Start a new trip? Your saved trip will remain in My account.")}</p>
          <div><button type="button" onClick={() => setResetConfirmation(false)}>{zh ? '取消' : t("Cancel")}</button><button type="button" onClick={startNew}>{zh ? '确认新行程' : t("Confirm new trip")}</button></div>
        </div>}
        <div className={styles.feed} ref={feedRef}>

          <details className={styles.conversationHistory} open>
            <summary>{zh ? `与助手对话 · ${messages.length} 条消息` : `Conversation · ${messages.length} messages`}<ChevronDown size={14} /></summary>
            <div className={styles.conversationMessages}>
          {!messages.length && <div className={styles.welcome}><span className={styles.welcomeMark}><Sparkles size={18} /></span><h2>{zh ? '先问问，再决定。' : 'Curious? Start there.'}</h2><p>{zh ? '可以先了解值得去的地方。选好后，再告诉路线管家日期、酒店和已预约的票，让它编排地图上的行程。' : 'Explore places and travel tips first. When you know what you like, share your dates and bookings to turn them into a route.'}</p><div className={styles.suggestions}><button type="button" onClick={() => void send(zh ? '上海有哪些值得去的著名景点？先推荐一些，我会挑选。' : 'Give me famous places to visit in Shanghai. I will choose from your suggestions.')}>{zh ? '先看看上海景点' : 'Explore Shanghai places'} <ArrowRight size={14} /></button><button type="button" onClick={() => void send(zh ? '我住在上海外滩附近，带父母玩三天，第一天10点预约了豫园。希望少走路，留点时间看江景。' : 'Plan three days in Shanghai with my parents. We stay near the Bund, have Yu Garden tickets for Day 1 at 10:00, and want easy walking and a river view.')}>{zh ? '规划带父母的三天行程' : 'Plan three days with my parents'} <ArrowRight size={14} /></button></div></div>}
          {messages.map((message, index) => <div key={`${index}-${message.role}`} className={`${styles.message} ${message.role === 'user' ? styles.userMessage : styles.assistantMessage}`}>
            {message.role === 'assistant' && <span className={`${styles.messageAvatar} ${message.agent === 'travel-assistant' ? styles.travelAvatar : ''}`}>{zh ? (message.agent === 'travel-assistant' ? '旅' : '行') : (message.agent === 'travel-assistant' ? 'T' : 'C')}</span>}
            <div className={message.role === 'assistant' ? styles.assistantBubble : undefined}>
              {message.role === 'assistant' && <span className={styles.agentName}>{message.agent === 'travel-assistant' ? (zh ? '旅行助手' : 'Travel Assistant') : (zh ? '路线管家' : 'Route Concierge')}</span>}
              <p>{message.text}</p>
              {message.sources?.some(source => /google\.com\/maps/.test(source.url)) && <span className={styles.googleAttribution} translate="no">Google Maps</span>}{message.sources?.length ? <details className={styles.answerSources}><summary>{zh ? `查看来源 · ${message.sources.length}` : `View sources · ${message.sources.length}`}</summary><ol>{message.sources.map((source, sourceIndex) => <li key={`${source.url}-${sourceIndex}`}><a href={source.url} target="_blank" rel="noopener noreferrer">[{source.index || sourceIndex + 1}] {zh ? source.title : readableEnglish(source.title, `Source ${sourceIndex + 1}`)}</a></li>)}</ol></details> : null}
              {plan && message.intent === 'travel-assistant' && <small className={styles.routeUnchanged}>{zh ? '这条回答未修改现有行程。' : t("Your existing route was not changed.")}</small>}
            </div>
          </div>)}
            </div>
          </details>

          {plan?.research && !busy && messages.at(-1)?.agent !== 'travel-assistant' && <details className={styles.researchCard}>
            <summary><Compass size={15} /> {zh ? `本次联网资料 · ${plan.research.sources.length} 个来源` : `Web research · ${plan.research.sources.length} sources`} <ChevronDown size={14} /></summary>
            <p>{zh ? plan.research.summary : readableEnglish(plan.research.summary, 'This saved research brief is in Chinese. Ask the concierge to refresh it in English.')}</p>
            <ol>{plan.research.sources.map((source, index) => <li key={`${source.url}-${index}`}><a href={source.url} target="_blank" rel="noopener noreferrer">[{source.index || index + 1}] {zh ? source.title : readableEnglish(source.title, `Source ${index + 1}`)}</a>{source.site && <small> · {zh ? source.site : readableEnglish(source.site, t("Website"))}</small>}</li>)}</ol>
            <small>{zh ? '搜索结果是规划参考；预约、票价和开放规则请以对应官方页面为准。' : 'Search results inform the plan; confirm bookings, prices and opening rules on the relevant official site.'}</small>
          </details>}
          {busy && <div className={styles.progressCard} role="status" aria-live="polite"><div className={styles.progressTitle}><span className={styles.spinner} /><strong>{intent === 'route-concierge' ? (zh ? '路线管家正在核对行程' : 'Route Concierge is checking your route') : intent === 'travel-assistant' ? (zh ? '旅行助手正在查找资料' : 'Travel Assistant is checking current sources') : (zh ? '正在理解你的问题' : 'Finding the right help for your question')}</strong></div>{intent === 'route-concierge' ? <ol>{phases.map((step, index) => { const current = phases.indexOf(phase || 'understanding'); return <li key={step} className={index < current ? styles.doneStep : index === current ? styles.currentStep : ''}><span>{index < current ? <Check size={12} /> : index + 1}</span>{messageForPhase(step, zh)}</li>; })}</ol> : <small>{intent === 'travel-assistant' ? (zh ? '会直接回答，不改动地图上的行程。' : 'Answering directly without changing your route.') : (zh ? '根据问题选择合适的助手。' : 'Choosing the right assistant for this question.')}</small>}</div>}
          {error && <div className={styles.error} role="alert">{error}<button type="button" onClick={() => void (restoreFailed ? refreshSaved() : send(messages.at(-1)?.text || '', true))}>{zh ? '重试' : t("Retry")}</button></div>}
          {plan && !busy && <div className={styles.refine}><strong>{zh ? '继续调整这趟旅行' : 'Keep refining this trip'}</strong><button type="button" onClick={() => void send(zh ? '把第一天安排得更轻松，但保留所有已预约的票。' : 'Make Day 1 easier, but keep every booked ticket fixed.')}>{zh ? '少走一些路' : 'Less walking'}</button><button type="button" onClick={() => void send(zh ? '如果下雨，给我一套室内备选，并说明哪些地方需要重新确认。' : 'If it rains, suggest nearby indoor alternatives and tell me what needs checking.')}>{zh ? '准备雨天方案' : 'Rainy-day backup'}</button></div>}
        </div>
        <form className={styles.composer} onSubmit={submit}><label htmlFor="trip-request" className={styles.srOnly}>{zh ? '描述行程或提出修改' : 'Describe your trip or request a change'}</label>{editContext && <div className={styles.editContext} role="status"><span><Sparkles size={13} />{editContext}</span><button type="button" onClick={() => { setInput(''); setEditContext(''); }} aria-label={zh ? '取消修改需求' : 'Cancel edit request'}>×</button><small>{zh ? '修改需求已填入，发送后由路线管家更新行程。' : 'Request ready. Send it to update your itinerary.'}</small></div>}<textarea ref={inputRef} id="trip-request" value={input} onChange={event => setInput(event.target.value)} onKeyDown={inputKey} rows={2} maxLength={2500} disabled={!user||authLoading} placeholder={!user?t("Select New trip to start planning."):zh ? '告诉我你住哪里、和谁同行、预约了什么，或想改哪一天…' : 'Where are you staying? Who is coming? Any tickets booked? Or tell me what to change…'} /><button type={busy ? 'button' : 'submit'} onClick={busy ? () => abort.current?.abort() : undefined} aria-label={busy ? (zh ? '停止规划' : 'Stop planning') : (zh ? '发送需求' : 'Send request')} disabled={!user||authLoading||(!busy && !input.trim())}>{busy ? <Square size={17} fill="currentColor" /> : <Send size={17} />}</button><div className={styles.composeHint}><span>{zh ? '通过对话修改 · 保留已预约时间' : 'Edit by conversation · keep bookings fixed'}</span><span><CornerDownLeft size={12} /> {zh ? '回车发送' : 'Enter to send'}</span></div></form>
      </section>

      <section className={`${styles.itineraryPanel} ${mobileView !== 'itinerary' ? styles.hidePaneMobile : ''}`} aria-label={zh ? '每日行程工作区' : 'Daily itinerary workspace'}>
        <div className={styles.itineraryPanelHead}><div className={styles.itineraryPanelTitle}><h2>{zh ? '每日行程' : t("Itinerary")}</h2><h1>{plan ? (zh ? plan.title : readableEnglish(plan.title, t("Your China journey"))) : (zh ? '你的中国旅行，从这里开始' : t("Your China journey starts here"))}</h1></div></div>
        {plan && <div className={styles.dayRail} role="group" aria-label={zh ? '浏览行程日期' : 'Browse itinerary days'}><button type="button" aria-pressed={allDays} onClick={() => { setPopup(null); setDayToReveal(null); setAllDays(true); itineraryRef.current?.scrollTo({ top: 0, behavior: 'smooth' }); }}>{zh ? '总览' : 'Overview'}</button>{plan.days.map((item, index) => <button type="button" aria-pressed={!allDays && dayIndex === index} key={item.id} onClick={() => chooseDay(index, true)}>{zh ? `第 ${index + 1} 天` : `Day ${index + 1}`}</button>)}</div>}
        <div className={styles.itineraryFeed} ref={itineraryRef}>
          {plan && <ItineraryOverview plan={plan} zh={zh} dayIndex={dayIndex} selectedStop={selectedStop} allDays={allDays} busy={busy} onSelect={selectStop} onDay={index => { chooseDay(index, true); setMobileView('map'); }} onEdit={prepareEdit} onUndo={previousPlan ? () => { setPlan(previousPlan); setPopup(null); setDayToReveal(null); setPreviousPlan(null); setDayIndex(0); setSelectedStop(0); setAllDays(true); } : undefined} />}
          {!plan && <div className={styles.itineraryEmpty}><MapIcon size={30} /><h3>{zh ? '把旅行想法变成每天的安排' : 'Turn travel ideas into a day-by-day plan'}</h3><p>{zh ? '先在对话中了解景点，或告诉助手目的地、日期与同行人。生成后可在这里选择地点、调整安排，并在地图上查看路线。' : 'Explore places with the assistant, or share your destination, dates and companions. Your plan will appear here, ready to select places, refine days and follow the route on the map.'}</p><small>{zh ? '尚未核实的开放时间与交通会明确标注。' : 'Unverified opening hours and transport are clearly marked.'}</small><button type="button" disabled={authLoading} onClick={() => { if(!user){requestNew();return;} setMobileView('chat'); window.requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true })); }}>{zh ? '告诉助手你的旅行想法' : 'Tell the assistant about your trip'}<ArrowRight size={14} /></button></div>}
        </div>
      </section>

      <section className={`${styles.mapPanel} ${mobileView !== 'map' ? styles.hidePaneMobile : ''}`} aria-label={zh ? 'Google 行程地图' : 'Google itinerary map'}>
        <div className={styles.panelHead}><div><h2>{plan && allDays ? (zh ? '完整旅行路线' : 'Your whole trip') : day ? `${zh ? '第' : 'Day '}${dayIndex + 1}${zh ? '天' : ''} · ${cityLabel(day, zh)}` : (zh ? '从一个目的地开始' : 'Start with a place')}</h2></div><span className={styles.provider}>Google Maps</span></div>
        {plan && <div className={styles.dayRail} role="tablist" aria-label={zh ? '行程日期' : 'Trip days'}><button type="button" role="tab" aria-selected={allDays} onClick={() => { setPopup(null); setDayToReveal(null); setAllDays(true); }}>{zh ? '全部行程' : 'Whole trip'}<small>{plan.days.length} {zh ? '天' : t("days")}</small></button>{plan.days.map((item, index) => <button type="button" role="tab" aria-selected={!allDays && dayIndex === index} key={item.id} onClick={() => chooseDay(index, true)}>{zh ? `第 ${index + 1} 天` : `Day ${index + 1}`}<small>{cityLabel(item, zh)}</small></button>)}</div>}
        <div className={styles.mapFrame}>
          <ConciergeJourneyMap plan={plan} dayIndex={dayIndex} allDays={allDays} selectedStop={selectedStop} onSelect={(index, stop) => { setDayIndex(index); setSelectedStop(stop); setPopup({ dayIndex: index, stopIndex: stop }); }} popup={popup} placeCard={placeCard} onClose={() => setPopup(null)} zh={zh} />
          {!popup && <div className={styles.mapLegend}>{zh ? '实线：地图服务返回的路径 · 虚线：未返回路径的衔接段 · 滚轮缩放，拖动地图' : 'Solid: provider route geometry · dashed: schematic connection · scroll to zoom, drag to pan'}</div>}
        </div>

      </section>
    </div>
  </div>;
}
