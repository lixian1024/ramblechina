'use client';
import Link,{useWebsiteText} from '@/i18n/context';
export default function NotFound(){const t=useWebsiteText();return <div className="wrap page-intro"><h1>{t('A little off the map.')}</h1><p>{t('We couldn’t find this page. Your next discovery is still out there.')}</p><Link className="button" href="/destinations">{t('Explore destinations')}</Link></div>;}
