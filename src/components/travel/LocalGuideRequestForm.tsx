'use client';
import {useWebsiteText} from '@/i18n/context';

import { useRef, useState, type FormEvent } from 'react';
import { ArrowUpRight, CheckCircle2 } from 'lucide-react';
import Link,{useLocale} from '@/i18n/context';
import {guideOptionLabel} from '@/i18n/guide-options';
import type { GuideReceipt } from '@/lib/travel/guide-request';
import { formatGuideDestinations, guideCities, guideLanguages, guideBudgets } from '@/lib/travel/guide-request-options';
import styles from './LocalGuideRequest.module.css';
import AccountGate from '@/components/account/AccountGate';
import {useAuth} from '@/components/account/AuthProvider';

export default function LocalGuideRequestForm() {
  const locale=useLocale();
  return <AccountGate next={`/${locale}/local-guide`}><SignedInGuideForm/></AccountGate>;
}
function SignedInGuideForm() {
  const t=useWebsiteText(),locale=useLocale();
  const {user}=useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fields, setFields] = useState<Record<string, string[]>>({});
  const [receipt, setReceipt] = useState<GuideReceipt | null>(null);
  const [cities, setCities] = useState<string[]>([]);
  const submission = useRef<{ id: string; fingerprint: string } | null>(null);
  const busyRef = useRef(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busyRef.current) return;
    const data = new FormData(event.currentTarget);
    const input = {
      name: String(data.get('name') || ''), email: String(data.get('email') || ''),
      destinations: formatGuideDestinations(cities, String(data.get('destinations') || '')),
      startDate: String(data.get('startDate') || ''), endDate: String(data.get('endDate') || ''),
      travelers: Number(data.get('travelers')), guideLanguage: String(data.get('guideLanguage') || ''),
      budget: String(data.get('budget') || ''), notes: String(data.get('notes') || ''),
      consent: data.get('consent') === 'on', website: String(data.get('website') || ''),
    };
    const fingerprint = JSON.stringify(input);
    if (!submission.current || submission.current.fingerprint !== fingerprint) submission.current = { id: crypto.randomUUID(), fingerprint };
    busyRef.current = true; setBusy(true); setError(''); setFields({});
    try {
      const response = await fetch('/api/local-guide-requests', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...input, requestId: submission.current.id }),
        signal: AbortSignal.timeout(20_000),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || 'Your request could not be saved. Please try again.');
        setFields(result.fields || {});
        if (result.retryWithNewId) submission.current = null;
        return;
      }
      if (typeof result.reference !== 'string' || typeof result.receivedAt !== 'string') throw new Error('Missing receipt');
      setReceipt(result);
    } catch { setError('We could not confirm your submission. Your details are still here; please try again.'); }
    finally { busyRef.current = false; setBusy(false); }
  }

  function errorFor(name: string) { return fields[name]?.length ? <span className={styles.fieldError} id={`guide-${name}-error`}>{t(fields[name][0])}</span> : null; }
  function accessibility(name: string) { return { 'aria-invalid': fields[name]?.length ? true as const : undefined, 'aria-describedby': fields[name]?.length ? `guide-${name}-error` : undefined }; }

  if (receipt) return <section className={styles.card} aria-labelledby="guide-confirmation-title" role="status">
    <CheckCircle2 className={styles.check} size={32} />
    <h2 id="guide-confirmation-title">{t("Request received.")}</h2>
    <p>{t("Your local guide request has been saved for review. Availability, services and price still need to be agreed.")}</p>
    <div className={styles.receipt}><span>{t("Your request number")}</span><strong>{receipt.reference}</strong></div>
    <p className={styles.note}>{t("Keep this number for any follow-up about your request.")}</p>
    <p><Link className="text-link" href="/account">{t("View my guide requests →")}</Link></p>
    <Link className="button outline" href="/plan">{t("Back to your trip")} <ArrowUpRight size={16} /></Link>
  </section>;

  return <section className={styles.card} aria-labelledby="guide-request-title">
    <h2 id="guide-request-title">{t("Tell us about your trip")}</h2>
    <p className={styles.note}>{t("Required fields are marked with *.")}</p>
    <form onSubmit={submit} aria-busy={busy} onChange={() => { if (error) { setError(''); setFields({}); } }}>
      <fieldset disabled={busy} className={styles.form}>
        <label className={styles.field} htmlFor="guide-name">{t("Your name *")}<input id="guide-name" name="name" autoComplete="name" defaultValue={user?.user_metadata?.full_name||''} required maxLength={100} {...accessibility('name')} />{errorFor('name')}</label>
        <label className={styles.field} htmlFor="guide-email">{t("Email *")}<input id="guide-email" name="email" type="email" autoComplete="email" defaultValue={user?.email||''} required maxLength={254} {...accessibility('email')} />{errorFor('email')}</label>
        <div className={`${styles.field} ${styles.full}`}>
          <span id="guide-cities-label">{t("Cities or places to visit *")}</span>
          <div className={styles.cities} role="group" aria-labelledby="guide-cities-label" {...accessibility('destinations')}>
            {guideCities.map(city => <button key={city} type="button" aria-pressed={cities.includes(city)} onClick={() => {
              setCities(previous => previous.includes(city) ? previous.filter(value => value !== city) : [...previous, city]);
              setError(''); setFields({});
            }}>{guideOptionLabel(locale,city)}</button>)}
          </div>
          <label className={styles.additionalLabel} htmlFor="guide-destinations">{t("Other cities or places")}</label>
          <input id="guide-destinations" name="destinations" placeholder={t("Add other destinations, e.g. Jiuzhaigou")} required={cities.length === 0} maxLength={150} {...accessibility('destinations')} aria-describedby={fields.destinations?.length ? 'guide-destinations-error guide-cities-hint' : 'guide-cities-hint'} />
          <span className={styles.note} id="guide-cities-hint">{t("Choose one or more cities, or enter your destinations above.")}</span>
          {errorFor('destinations')}
        </div>
        <label className={styles.field} htmlFor="guide-startDate">{t("First date (optional)")}<input id="guide-startDate" name="startDate" type="date" {...accessibility('startDate')} />{errorFor('startDate')}</label>
        <label className={styles.field} htmlFor="guide-endDate">{t("Last date (optional)")}<input id="guide-endDate" name="endDate" type="date" {...accessibility('endDate')} />{errorFor('endDate')}</label>
        <p className={`${styles.note} ${styles.full} ${styles.dateHint}`}>{t("Still deciding? Leave the dates blank and tell us what you have in mind below.")}</p>
        <label className={styles.field} htmlFor="guide-travelers">{t("Number of travelers *")}<input id="guide-travelers" name="travelers" type="number" min={1} max={99} defaultValue={2} required {...accessibility('travelers')} />{errorFor('travelers')}</label>
        <label className={styles.field} htmlFor="guide-language">{t("Preferred guide language *")}<select id="guide-language" name="guideLanguage" defaultValue="English" required {...accessibility('guideLanguage')}>{guideLanguages.map(language => <option key={language} value={language}>{guideOptionLabel(locale,language)}</option>)}</select>{errorFor('guideLanguage')}</label>
        <label className={`${styles.field} ${styles.full}`} htmlFor="guide-budget">{t("Guide budget per day (optional)")}<select id="guide-budget" name="budget" defaultValue="" {...accessibility('budget')}><option value="">{t("Not decided yet")}</option>{guideBudgets.map(budget => <option key={budget} value={budget}>{guideOptionLabel(locale,budget)}</option>)}</select><span className={styles.note}>{t("USD per day for your group. This is your budget preference; the guide’s price needs confirmation.")}</span>{errorFor('budget')}</label>
        <label className={`${styles.field} ${styles.full}`} htmlFor="guide-notes">{t("What would you like to do? (optional)")}<textarea id="guide-notes" name="notes" rows={4} placeholder={t("Your interests, preferred pace, and which days you’d like a guide.")} maxLength={2000} {...accessibility('notes')} />{errorFor('notes')}</label>
        <div className={styles.trap} aria-hidden="true"><label htmlFor="guide-website">{t("Website")}<input id="guide-website" name="website" autoComplete="off" tabIndex={-1} /></label></div>
        <label className={`${styles.consent} ${styles.full}`}><input name="consent" type="checkbox" defaultChecked required {...accessibility('consent')} /><span>{t("You may use my details to contact me about this guide request. *")}</span></label>
        {errorFor('consent')}
        {error && <div role="alert" className={`${styles.error} ${styles.full}`}>{t(error)}</div>}
        <div className={`${styles.full} ${styles.submit}`}><button className="button" type="submit">{busy ? t("Submitting…") : t("Submit guide request")}{!busy && <ArrowUpRight size={16} />}</button><p className={styles.note}>{t("No payment is taken. Guide availability and price are confirmed separately.")}</p></div>
      </fieldset>
    </form>
  </section>;
}
