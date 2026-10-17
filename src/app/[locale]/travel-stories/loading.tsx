'use client';
import {useWebsiteText} from '@/i18n/context';
export default function Loading(){const t=useWebsiteText();return <section className="wrap page-intro" role="status" aria-live="polite"><h1>{t('Travel Stories')}</h1><p>{t('Checking recent journeys and YouTube views…')}</p></section>;}
