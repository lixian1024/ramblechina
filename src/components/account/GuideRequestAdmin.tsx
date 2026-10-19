'use client';
import {useEffect,useState} from 'react';
import Link,{useLocale} from '@/i18n/context';
import {guideOptionLabel} from '@/i18n/guide-options';
import type {AdminGuideRequest} from '@/lib/account/guide-admin';
import styles from './GuideRequestAdmin.module.css';

const copy = {
  en:{title:'Local guide requests',intro:'Review requests submitted by travelers. Times are shown in China time (UTC+8).',
    account:'My account',status:'Status',all:'All requests',new:'Received',reviewing:'Under review',contacted:'Contacted',closed:'Closed',
    loading:'Loading guide requests…',forbidden:'Administrator access is required.',error:'Guide requests could not be loaded. Check the database setup or try again.',
    retry:'Retry',refresh:'Refresh',empty:'No requests match this filter.',previous:'Previous',next:'Next',page:'Page',
    dates:'Travel dates',travelers:'Travelers',language:'Guide language',budget:'Daily budget',notes:'Notes',invalid:'Invalid request details',invalidNote:'This submission has incomplete or invalid details. Review it in Supabase using its reference.',
    undecided:'Not provided',submitted:'Submitted',details:'View request details',notice:'Availability, services and price still need confirmation.'},
  zh:{title:'本地导游需求',intro:'查看旅行者提交的需求。提交时间按中国时间（UTC+8）显示。',
    account:'我的账户',status:'状态',all:'全部需求',new:'已收到',reviewing:'审核中',contacted:'已联系',closed:'已关闭',
    loading:'正在加载导游需求…',forbidden:'此页面仅管理员可访问。',error:'导游需求未能加载，请检查数据库配置或重试。',
    retry:'重试',refresh:'刷新',empty:'此筛选条件下暂无需求。',previous:'上一页',next:'下一页',page:'页码',
    dates:'旅行日期',travelers:'人数',language:'导游语种',budget:'每日预算',notes:'备注',invalid:'需求信息异常',invalidNote:'此条提交的信息不完整或格式不正确，请按编号在 Supabase 中核查。',
    undecided:'未提供',submitted:'提交于',details:'查看需求详情',notice:'导游是否有空、具体服务与价格仍需确认。'},
};
type View = {key:string; kind:'ok'; requests:AdminGuideRequest[]; hasMore:boolean}
  | {key:string; kind:'forbidden'|'error'};
export default function GuideRequestAdmin() {
  const locale = useLocale(), c = copy[locale==='zh'?'zh':'en'];
  const [status,setStatus] = useState('all'), [page,setPage] = useState(0), [reload,setReload] = useState(0);
  const [view,setView] = useState<View|null>(null);
  const key = `${status}:${page}:${reload}`;
  useEffect(()=>{
    const controller = new AbortController(); let active = true;
    void fetch(`/api/admin/guide-requests?status=${status}&page=${page}`,{cache:'no-store',signal:controller.signal})
      .then(async response=>{
        if (response.status === 401 || response.status === 403) {
          if (active) setView({key,kind:'forbidden'});
          return;
        }
        if (!response.ok) throw new Error('unavailable');
        const data = await response.json();
        if (active) setView({key,kind:'ok',requests:data.requests,hasMore:data.hasMore});
      }).catch(()=>{if(active)setView({key,kind:'error'});});
    return ()=>{active=false;controller.abort();};
  },[status,page,reload,key]);
  const current = view?.key === key ? view : null;
  return <div className={styles.page}>
    <header className={styles.heading}><div><h1>{c.title}</h1><p>{c.intro}</p></div><Link href="/account">{c.account} →</Link></header>
    {current?.kind === 'forbidden' ? <p role="alert" className={styles.notice}>{c.forbidden}</p> : <>
      <div className={styles.toolbar}>
        <label>{c.status}<select value={status} onChange={event=>{setStatus(event.target.value);setPage(0);}}>
          <option value="all">{c.all}</option>
          {(['new','reviewing','contacted','closed'] as const).map(value=><option key={value} value={value}>{c[value]}</option>)}
        </select></label>
        <button className="button outline" disabled={!current} onClick={()=>setReload(n=>n+1)}>{c.refresh}</button>
      </div>
      {!current && <p role="status">{c.loading}</p>}
      {current?.kind === 'error' && <div role="alert" className={styles.notice}><p>{c.error}</p><button className="button outline" onClick={()=>setReload(n=>n+1)}>{c.retry}</button></div>}
      {current?.kind === 'ok' && <>
        {current.requests.length === 0 && <p className={styles.notice}>{c.empty}</p>}
        <div className={styles.requests}>{current.requests.map(row=><article className={styles.card} key={row.id}>
          <div className={styles.cardHeading}><h2>{row.request?.destinations||c.invalid}</h2><span className={styles.badge}>{c[row.status]}</span></div>
          <p className={styles.meta}>{c.submitted} {new Date(row.created_at).toLocaleString(locale==='zh'?'zh-CN':'en-GB',{timeZone:'Asia/Shanghai'})}</p>
          <p className={styles.reference}>{row.reference}</p>
          {!row.request&&<p role="alert">{c.invalidNote}</p>}
          {row.request&&<><p className={styles.contact}>{row.request.name} · <a href={`mailto:${row.request.email}`}>{row.request.email}</a></p>
          <details><summary>{c.details}</summary><dl>
            <dt>{c.dates}</dt><dd>{row.request.startDate ? `${row.request.startDate}${row.request.endDate?` – ${row.request.endDate}`:''}` : c.undecided}</dd>
            <dt>{c.travelers}</dt><dd>{row.request.travelers}</dd>
            <dt>{c.language}</dt><dd>{guideOptionLabel(locale,row.request.guideLanguage)}</dd>
            <dt>{c.budget}</dt><dd>{guideOptionLabel(locale,row.request.budget)||c.undecided}</dd>
            <dt>{c.notes}</dt><dd>{row.request.notes||c.undecided}</dd>
          </dl><p className={styles.meta}>{c.notice}</p></details></>}
        </article>)}</div>
        <nav className={styles.pagination} aria-label={c.page}>
          <button className="button outline" disabled={page===0} onClick={()=>setPage(n=>n-1)}>{c.previous}</button>
          <span>{c.page} {page+1}</span>
          <button className="button outline" disabled={!current.hasMore} onClick={()=>setPage(n=>n+1)}>{c.next}</button>
        </nav>
      </>}
    </>}
  </div>;
}
