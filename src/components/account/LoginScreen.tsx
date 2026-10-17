'use client';
import {useWebsiteText} from '@/i18n/context';
import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { authCallbackUrl, authErrorMessage } from '@/lib/account/auth-flow';
import styles from './Account.module.css';

// Reuses travelagent's email -> signup OTP -> password flow and Google PKCE login.
export default function LoginScreen({configured,google,next,initialError='',passwordStep=false}:{configured:boolean;google:boolean;next:string;initialError?:string;passwordStep?:boolean}) {
  const t=useWebsiteText();
  const router=useRouter();
  const [mode,setMode]=useState<'signin'|'signup'>(passwordStep?'signup':'signin');
  const [step,setStep]=useState<'email'|'code'|'password'>(passwordStep?'password':'email');
  const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[confirm,setConfirm]=useState(''),[code,setCode]=useState('');
  const [busy,setBusy]=useState(false),[error,setError]=useState(initialError),[notice,setNotice]=useState('');
  const [resendSeconds,setResendSeconds]=useState(0);
  useEffect(()=>{if(resendSeconds<=0)return;const timer=setTimeout(()=>setResendSeconds(value=>Math.max(0,value-1)),1000);return()=>clearTimeout(timer);},[resendSeconds]);
  async function run(action:()=>Promise<void>){if(busy)return;setBusy(true);setError('');setNotice('');try{if(!configured)throw Error('Account services are not configured.');await action();}catch(cause){setError(authErrorMessage(cause));}finally{setBusy(false);}}
  function finish(){router.replace(next);router.refresh();}
  async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();await run(async()=>{
    const client=createClient(),normalized=email.trim().toLowerCase();
    if(mode==='signin') {const {error}=await client.auth.signInWithPassword({email:normalized,password});if(error)throw error;finish();return;}
    if(step==='email') {
      const bytes=crypto.getRandomValues(new Uint8Array(24));
      const {data,error}=await client.auth.signUp({email:normalized,password:Array.from(bytes,byte=>byte.toString(36).padStart(2,'0')).join(''),options:{emailRedirectTo:authCallbackUrl(window.location.origin,next,true)}});
      if(error)throw error;setEmail(normalized);setStep(data.session?'password':'code');setResendSeconds(60);setNotice(data.session?'Create a password to finish your account.':'Check your inbox and spam folder for a code or confirmation link. If you already have an account, sign in.');return;
    }
    if(step==='code'){const {error}=await client.auth.verifyOtp({email:normalized,token:code.trim(),type:'signup'});if(error)throw error;setStep('password');setNotice('Email verified. Create your password.');return;}
    if(password.length<8)throw Error('Use at least 8 characters.');if(password!==confirm)throw Error('Passwords do not match.');
    const {error}=await client.auth.updateUser({password});if(error)throw error;finish();
  });}
  return <div className={styles.login}><section className={styles.card}>
    <h1 className={styles.accessibleTitle}>{mode==='signin'?t("Sign in"):step==='password'?t("Create your password"):t("Create your account")}</h1>
    <form onSubmit={submit} className={`${styles.form} ${styles.authForm}`}><fieldset disabled={busy||!configured}>
      {(mode==='signin'||step==='email')&&<label>{t("Email")}<input type="email" placeholder="you@example.com" autoComplete="email" required maxLength={254} value={email} onChange={event=>setEmail(event.target.value)}/></label>}
      {mode==='signup'&&step==='code'&&<><p>{t("Verification requested for")} <strong>{email}</strong>.</p><label>{t("Verification code")}<input inputMode="numeric" autoComplete="one-time-code" required value={code} onChange={event=>setCode(event.target.value)}/></label><div className={styles.row}><button type="button" className={styles.textButton} disabled={resendSeconds>0} onClick={()=>void run(async()=>{if(resendSeconds>0)return;setResendSeconds(60);const {error}=await createClient().auth.resend({type:'signup',email,options:{emailRedirectTo:authCallbackUrl(window.location.origin,next,true)}});if(error)throw error;setCode('');setNotice(t("Check your inbox and spam folder for the latest verification email."));})}>{resendSeconds>0?`${t("Resend in")} ${resendSeconds}${t("seconds")}`:t("Resend code")}</button><button type="button" className={styles.textButton} onClick={()=>{setStep('email');setCode('');setError('');}}>{t("Change email")}</button></div></>}
      {(mode==='signin'||step==='password')&&<label>{t("Password")}<input type="password" placeholder={mode==='signin'?t("Your password"):t("At least 8 characters")} autoComplete={mode==='signin'?'current-password':'new-password'} minLength={mode==='signup'?8:undefined} required value={password} onChange={event=>setPassword(event.target.value)}/></label>}
      {mode==='signup'&&step==='password'&&<label>{t("Confirm password")}<input type="password" autoComplete="new-password" minLength={8} required value={confirm} onChange={event=>setConfirm(event.target.value)}/></label>}
      <button className="button" type="submit">{busy?t("Please wait…"):mode==='signin'?t("Sign in"):step==='email'?t("Send verification email"):step==='code'?t("Verify email"):t("Save password")}</button>
    </fieldset></form>
    {google&&(mode==='signin'||step==='email')&&<button className={`button outline ${styles.authProvider}`} type="button" disabled={busy||!configured} onClick={()=>void run(async()=>{const {error}=await createClient().auth.signInWithOAuth({provider:'google',options:{redirectTo:authCallbackUrl(window.location.origin,next)}});if(error)throw error;})}><span aria-hidden="true" className={styles.googleMark}>G</span>{t("Sign in with Google")}</button>}
    {notice&&<p role="status" className={styles.notice}>{t(notice)}</p>}{(error||!configured)&&<p role="alert" className={styles.error}>{t(error||"Account services are not configured.")}</p>}
    {!passwordStep&&step!=='password'&&<div className={styles.modeSwitch}><p>{mode==='signin'?t("No account yet?"):t("Already have an account?")}</p><button type="button" className="button outline" disabled={busy} onClick={()=>{setMode(mode==='signin'?'signup':'signin');setStep('email');setCode('');setPassword('');setConfirm('');setError('');setNotice('');}}>{mode==='signin'?t("Sign up"):t("Sign in")}</button></div>}
  </section></div>;
}
