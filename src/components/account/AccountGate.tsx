'use client';
import {useWebsiteText} from '@/i18n/context';
import Link,{useLocale} from '@/i18n/context';
import {Fragment} from 'react';
import { useAuth } from './AuthProvider';
import styles from './Account.module.css';
export default function AccountGate({next,children}:{next:string;children:React.ReactNode}) {
  const t=useWebsiteText(),locale=useLocale();
  const {user,loading,error}=useAuth();
  if(loading)return <div className={styles.gate} role="status">{t("Checking your account…")}</div>;
  if(!user)return <section className={styles.gate}><span className={styles.eyebrow}>{t("YOUR RAMBLE CHINA ACCOUNT")}</span><h1>{t("Keep your travel plans together.")}</h1><p>{t("Sign in to save and edit your trips, manage your details and track local guide requests.")}</p>{error&&<p role="alert">{t(error)}</p>}<Link className="button" href={`/${locale}/login?next=${encodeURIComponent(next)}`}>{t("Sign in or create an account")}</Link></section>;
  return <Fragment key={user.id}>{children}</Fragment>;
}
