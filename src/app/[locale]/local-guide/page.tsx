import {siteTranslator} from '@/i18n/website';
import {pageMetadata} from '@/i18n/metadata';
import type {Locale} from '@/i18n/locales';
import LocalGuideRequestForm from '@/components/travel/LocalGuideRequestForm';
import styles from '@/components/travel/LocalGuideRequest.module.css';

export async function generateMetadata({params}:{params:Promise<{locale:Locale}>}){const {locale}=await params;return pageMetadata(locale,"/local-guide",locale==='zh'?"咨询本地导游":"Request a local guide",locale==='zh'?"告诉 Ramble China 目的地、日期与兴趣，咨询中国本地导游。":"Tell Ramble China where you are going, your dates and interests to request a local guide in China.");}

export default async function Page({params}:{params:Promise<{locale:Locale}>}) {
  const {locale}=await params;const t=siteTranslator(locale);
  return <div className={`wrap ${styles.page}`}>
    <aside className={styles.intro}>
      <span className="eyebrow">{t("LOCAL GUIDES / CHINA")}</span>
      <h1>{t("Explore with a local guide.")}</h1>
      <p>{t("Tell us where you’re going and what you’d like help with, from a city walk to a day of food and culture.")}</p>
      <ol className={styles.steps}>
        <li><span>01</span><div><strong>{t("Share your plans")}</strong><p>{t("Cities, dates and what matters to you.")}</p></div></li>
        <li><span>02</span><div><strong>{t("Discuss the details")}</strong><p>{t("Guide availability, language and price need to be confirmed.")}</p></div></li>
        <li><span>03</span><div><strong>{t("Decide what works for you")}</strong><p>{t("Submitting a request does not make a booking or require payment.")}</p></div></li>
      </ol>
    </aside>
    <LocalGuideRequestForm />
  </div>;
}
