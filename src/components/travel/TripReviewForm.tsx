'use client';
import {useRef,useState,type FormEvent} from 'react';
import Link,{useLocale} from '@/i18n/context';
import {recordGrowthEvent} from '@/lib/growth/analytics';
import styles from './LocalGuideRequest.module.css';

const copy = {
  en: {title: 'Request a manual itinerary review', email: 'Contact email', destination: 'Cities you plan to visit',
    travelWindow: 'Approximate travel dates (optional)', question: 'What would you like us to check?',
    hint: 'Share the route or timing question that concerns you. Please leave out passport numbers, booking references, payment details and other sensitive information.',
    consent: 'I agree that Ramble China may store this request and contact me about the review and optional travel-planning research.',
    privacy: 'We use these details to review your request and arrange any agreed research. Participation is optional. To withdraw or request deletion, email service@ramblechina.com with your request number.',
    submit: 'Submit review request', busy: 'Saving request…', failure: 'We could not confirm your submission. Your details are still here; please try again.',
    received: 'Request received', confirmation: 'Your request is saved for manual review. This is not a confirmed review session, booking or guarantee of a response. If we can help, we will email you to discuss the next step.',
    reference: 'Your request number', back: 'Try the Shanghai planner', promise: 'No payment or account required. Availability and timing are agreed separately.'},
  zh: {title: '申请人工复核行程', email: '联系邮箱', destination: '计划前往的城市', travelWindow: '大致旅行日期（选填）',
    question: '希望我们帮你检查什么？', hint: '请描述担心的路线或时间安排。请勿填写护照号码、预订编号、支付资料或其他敏感信息。',
    consent: '我同意 Ramble China 保存此申请，并就行程复核及可选的旅行规划研究联系我。',
    privacy: '这些资料仅用于审核申请和安排双方同意的研究。是否参与由你决定。如需退出或删除资料，请附上申请编号，发送邮件至 service@ramblechina.com。',
    submit: '提交复核申请', busy: '正在保存…', failure: '暂时无法确认提交结果，已填写的内容仍在，请重试。', received: '已收到申请',
    confirmation: '申请已保存，等待人工查看。这不代表已确认复核场次、预订或承诺回复。如能提供帮助，我们会通过邮件与你商量下一步。',
    reference: '申请编号', back: '试用上海行程规划', promise: '无需付款或注册。具体是否可安排及时间需另行商定。'},
};

export default function TripReviewForm() {
  const locale=useLocale(),language=locale==='zh'?'zh':'en',t=copy[language];
  const [values,setValues]=useState({email:'',destination:'',travelWindow:'',question:'',website:'',consent:false});
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[receipt,setReceipt]=useState('');
  const submission=useRef<{id:string;fingerprint:string}|null>(null),busyRef=useRef(false);
  const change=(name:keyof typeof values,value:string|boolean)=>setValues(previous=>({...previous,[name]:value}));
  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault(); if(busyRef.current)return;
    const input={...values,language},fingerprint=JSON.stringify(input);
    if(!submission.current||submission.current.fingerprint!==fingerprint)submission.current={id:crypto.randomUUID(),fingerprint};
    const id=submission.current.id;
    busyRef.current=true;setBusy(true);setError('');
    try {
      const response=await fetch('/api/research-requests',{method:'POST',headers:{'Content-Type':'application/json','Accept-Language':language},
        body:JSON.stringify({...input,requestId:id}),signal:AbortSignal.timeout(20_000)});
      const result=await response.json();
      if(!response.ok){setError(typeof result.error==='string'?result.error:t.failure);if(result.retryWithNewId)submission.current=null;return;}
      if(result.requestId!==id)throw Error('Missing receipt');
      setReceipt(id);
      recordGrowthEvent('research_requested',{locale:language,actor:'guest'},{dedupeKey:id});
    }catch{setError(t.failure);}
    finally{busyRef.current=false;setBusy(false);}
  }
  if(receipt)return <section className={styles.card} role="status"><h2>{t.received}</h2><p>{t.confirmation}</p>
    <div className={styles.receipt}><span>{t.reference}</span><strong>RR-{receipt}</strong></div>
    <p className={styles.note}>{t.privacy}</p><Link className="button outline" href="/plan">{t.back}</Link></section>;
  return <section className={styles.card} aria-labelledby="review-form-title"><h2 id="review-form-title">{t.title}</h2>
    <form onSubmit={submit}>
      <fieldset className={styles.form} disabled={busy}>
        <label className={`${styles.field} ${styles.full}`}>{t.email}<input name="email" type="email" required maxLength={254} autoComplete="email" value={values.email} onChange={event=>change('email',event.target.value)}/></label>
        <label className={`${styles.field} ${styles.full}`}>{t.destination}<input name="destination" required maxLength={200} value={values.destination} onChange={event=>change('destination',event.target.value)}/></label>
        <label className={`${styles.field} ${styles.full}`}>{t.travelWindow}<input name="travelWindow" maxLength={200} value={values.travelWindow} onChange={event=>change('travelWindow',event.target.value)}/></label>
        <label className={`${styles.field} ${styles.full}`}>{t.question}<textarea name="question" required maxLength={2000} rows={5} aria-describedby="review-input-hint" value={values.question} onChange={event=>change('question',event.target.value)}/>
          <span className={styles.note} id="review-input-hint">{t.hint}</span></label>
        <div className={styles.trap} aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" value={values.website} onChange={event=>change('website',event.target.value)}/></label></div>
        <label className={`${styles.consent} ${styles.full}`}><input name="consent" type="checkbox" required checked={values.consent} onChange={event=>change('consent',event.target.checked)}/><span>{t.consent}</span></label>
        <p className={`${styles.note} ${styles.full}`}>{t.privacy}</p>
        {error&&<p className={`${styles.error} ${styles.full}`} role="alert">{error}</p>}
        <div className={`${styles.submit} ${styles.full}`}><button className="button" type="submit" disabled={busy}>{busy?t.busy:t.submit}</button><p className={styles.note}>{t.promise}</p></div>
      </fieldset>
    </form></section>;
}
