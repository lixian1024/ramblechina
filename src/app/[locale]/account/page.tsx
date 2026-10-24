import AccountGate from '@/components/account/AccountGate';
import AccountDashboard from '@/components/account/AccountDashboard';
import type {Locale} from '@/i18n/locales';
import {pageMetadata} from '@/i18n/metadata';
export async function generateMetadata({params}:{params:Promise<{locale:Locale}>}){const {locale}=await params;return {...pageMetadata(locale,'/account',locale==='zh'?'我的账户':'My account'),robots:{index:false,follow:false},referrer:'no-referrer' as const};}
export default async function Account({params}:{params:Promise<{locale:Locale}>}){const {locale}=await params;return <AccountGate next={`/${locale}/account`}><AccountDashboard/></AccountGate>;}
