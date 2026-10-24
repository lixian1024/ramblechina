'use client';
import {useAuth} from '@/components/account/AuthProvider';
import {PackWorkflow} from './PackWorkflow';
export function PackClient({locale,tripId,orderId}:{locale:'en'|'zh';tripId?:string;orderId?:string}){const {user,loading,error}=useAuth();return <>{error&&<p role="alert">{error}</p>}<PackWorkflow key={`${user?.id||'guest'}:${tripId||''}:${orderId||''}:${locale}`} locale={locale} tripId={tripId} orderId={orderId} authReady={!loading} signedIn={Boolean(user)}/></>;}
