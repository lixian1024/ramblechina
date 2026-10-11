'use client';
import Link from 'next/link';
import {Fragment} from 'react';
import { useAuth } from './AuthProvider';
import styles from './Account.module.css';
export default function AccountGate({next,children}:{next:string;children:React.ReactNode}) {
  const {user,loading,error}=useAuth();
  if(loading)return <div className={styles.gate} role="status">Checking your account…</div>;
  if(!user)return <section className={styles.gate}><span className={styles.eyebrow}>YOUR RAMBLE CHINA ACCOUNT</span><h1>Keep your travel plans together.</h1><p>Sign in to save and edit your trips, manage your details and track local guide requests.</p>{error&&<p role="alert">{error}</p>}<Link className="button" href={`/en/login?next=${encodeURIComponent(next)}`}>Sign in or create an account</Link></section>;
  return <Fragment key={user.id}>{children}</Fragment>;
}
