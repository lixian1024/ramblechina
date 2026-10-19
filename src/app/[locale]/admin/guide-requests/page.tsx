import type {Metadata} from 'next';
import type {Locale} from '@/i18n/locales';
import AccountGate from '@/components/account/AccountGate';
import GuideRequestAdmin from '@/components/account/GuideRequestAdmin';

export async function generateMetadata({params}:{params:Promise<{locale:Locale}>}):Promise<Metadata> {
  const {locale}=await params;
  return {title:locale==='zh'?'导游需求管理':'Guide requests',robots:{index:false,follow:false}};
}
export default async function GuideRequests({params}:{params:Promise<{locale:Locale}>}) {
  const {locale} = await params;
  return <AccountGate next={`/${locale}/admin/guide-requests`}><GuideRequestAdmin/></AccountGate>;
}
