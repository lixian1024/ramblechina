import {pageMetadata} from '@/i18n/metadata';
import {siteTranslator} from '@/i18n/website';
import type {Locale} from '@/i18n/locales';
import { ArrowRight, ArrowUpRight, Compass, ListChecks, Mail, Map, Users } from 'lucide-react';
import Link from '@/i18n/context';
import styles from '@/components/travel/PublicPages.module.css';

export async function generateMetadata({params}:{params:Promise<{locale:Locale}>}){const {locale}=await params;return pageMetadata(locale,"/about",locale==='zh'?"关于我们":"About us",locale==='zh'?"认识 Ramble China 团队，通过目的地指南、行前准备、行程规划与本地导游咨询探索中国。":"Meet the Ramble China team introducing China travel to international visitors through destination guides, travel preparation, itinerary planning and local guide connections.");}

export default async function About({params}:{params:Promise<{locale:Locale}>}) {
  const {locale}=await params;
  const t=siteTranslator(locale);
  return <div className={styles.about}>
    <header className={styles.aboutHeader}>
      <span className={styles.eyebrow}>{t("ABOUT US")}</span>
      <h1>{t("About Ramble China")}</h1>
      <p>{t("We’re a team helping international visitors discover China and feel more prepared for the journey.")}</p>
    </header>
    <div className={styles.aboutBody}>
      <section aria-labelledby="about-team-title">
        <h2 id="about-team-title">{t("A clearer way to explore China.")}</h2>
        <p>{t("We introduce China’s destinations, culture and local experiences to travellers from around the world.")}</p>
        <p>{t("Our aim is to help you have the best possible experience in China: understand the places you’re visiting, prepare for everyday practicalities, and plan a journey that fits your interests and pace.")}</p>
        <ul className={styles.aboutServices}>
          <li><Compass size={21} /><div><h3>{t("Destination and attraction guides")}</h3><p>{t("Discover cities, sights and local experiences to help you decide where to go.")}</p></div></li>
          <li><ListChecks size={21} /><div><h3>{t("Travel preparation")}</h3><p>{t("Check what you need before arrival, including entry, connectivity, payments and transport.")}</p></div></li>
          <li><Map size={21} /><div><h3>{t("Itinerary planning")}</h3><p>{t("Build a day-by-day plan, explore the route on a map and refine it as your ideas change.")}</p></div></li>
          <li><Users size={21} /><div><h3>{t("Connections with local guides")}</h3><p>{t("Share your plans and preferred language so our team can help you connect with a local guide. Availability, services and price need to be confirmed.")}</p></div></li>
        </ul>
        <p className={styles.aboutClosing}>{t("Good travel information should make the next step easier. We explain what still needs checking, and welcome your feedback as we improve the site.")}</p>
        <div className={styles.actions}><Link href="/plan" className="button">{t("Plan a trip")} <ArrowRight size={16} /></Link><Link href="/local-guide" className={styles.textLink}>{t("Request a local guide")} <ArrowUpRight size={16} /></Link></div>
      </section>
      <aside className={styles.contact} aria-labelledby="about-contact-title">
        <Mail size={27} strokeWidth={1.4} />
        <h2 id="about-contact-title">{t("Get in touch")}</h2>
        <p>{t("Have a question about the website, spotted something that needs correcting, or want to share a suggestion? Email us.")}</p>
        <a className={styles.email} href="mailto:service@ramblechina.com">service@ramblechina.com <ArrowUpRight size={15} /></a>
        <p className={styles.contactNote}>{t("For help finding a local guide,")} <Link href="/local-guide">{t("submit a guide request")}</Link> {t("with your destinations, dates and preferred language.")}</p>
      </aside>
    </div>
  </div>;
}
