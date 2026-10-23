'use client';
import {useWebsiteText} from '@/i18n/context';
import Link, {useLocale} from '@/i18n/context';
import LanguageSwitcher from './LanguageSwitcher';
import {usePathname} from 'next/navigation';
import {useState} from 'react';
import {Menu,X,ArrowUpRight} from 'lucide-react';
import Image from 'next/image';
import whatsappCode from '../../../images/whatsapp.png';
import {getMessages} from '@/i18n/messages';
import BrandLogo from './BrandLogo';
import footerStyles from './Footer.module.css';
import {useAuth} from '@/components/account/AuthProvider';
export function Header() {
  const t=useWebsiteText(),locale=useLocale();
  const {user}=useAuth();
  const [open, setOpen] = useState(false), pathname = usePathname(), m = getMessages(locale).nav;
  const path = pathname.replace(/^\/(en|ko|zh)(?=\/|$)/, '') || '/';
  const current = (target: string) => path === target || path.startsWith(target + '/') ? 'page' as const : undefined;
  return <header className="site-header">
    <Link href="/" className="brand"><BrandLogo /></Link>
    <nav id="site-navigation" aria-label={t("Main navigation")} className={open ? 'nav open' : 'nav'}>
      <Link aria-current={current('/plan')} onClick={() => setOpen(false)} href="/plan">{m.plan}</Link>
      <Link aria-current={current('/destinations')} onClick={() => setOpen(false)} href="/destinations">{m.destinations}</Link>
      <Link aria-current={current('/travel-stories')} onClick={() => setOpen(false)} href="/travel-stories">{t("Travel Stories")}</Link>
      <Link aria-current={current('/essentials')} onClick={() => setOpen(false)} href="/essentials">{m.essentials}</Link>
      <Link aria-current={current('/local-guide')} onClick={() => setOpen(false)} href="/local-guide">{t("Need local guide")}</Link>
    </nav>
    <div className="header-actions">
      <LanguageSwitcher/>
      <button className="menu-button" aria-label={open ? m.closeMenu : m.openMenu} aria-controls="site-navigation" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
      <Link aria-current={current(user?'/account':'/login')} className="button small account-button" onClick={() => setOpen(false)} href={user?'/account':'/login'}>{user?t("My account"):t("Sign in")} <ArrowUpRight size={15} /></Link>
    </div>
  </header>;
}
export function Footer(){
  const t=useWebsiteText(),locale=useLocale();return <footer className={`site-footer ${footerStyles.footer}`}><div className={footerStyles.inner}>
  <div className={footerStyles.top}><div className={footerStyles.brand}><Link href="/" className="brand"><BrandLogo /></Link><p>{getMessages(locale).nav.footerLine}</p></div>
  <div className={footerStyles.columns}>
    <section className={footerStyles.column} aria-labelledby="footer-product"><h2 id="footer-product">{t("Product")}</h2>
      <nav className={footerStyles.links} aria-label={t("Footer product")}><Link href="/plan">{t("Plan a trip")}</Link><Link href="/destinations">{t("Destinations")}</Link><Link href="/travel-stories">{t("Travel Stories")}</Link><Link href="/essentials">{t("Travel essentials")}</Link><Link href="/travel-tips">{locale==='zh'?'实用攻略':'Practical guides'}</Link><Link href="/trip-review">{locale==='zh'?'免费人工核对行程':'Free human trip review'}</Link><Link href="/local-guide">{t("Need local guide")}</Link></nav>
    </section>
    <section className={footerStyles.column} aria-labelledby="footer-support"><h2 id="footer-support">{t("Support")}</h2>
      <nav className={footerStyles.links} aria-label={t("Footer support")}><Link href="/about">{t("About us")}</Link><a href="mailto:service@ramblechina.com">{t("Email")}</a><a href="https://x.com/ramblecn" target="_blank" rel="noopener noreferrer">X <ArrowUpRight size={14}/></a></nav>
    </section>
    <figure className={footerStyles.whatsapp}><Image src={whatsappCode} alt={t("Scan to contact Ramble China on WhatsApp")} unoptimized/><figcaption>WhatsApp</figcaption></figure>
  </div></div><div className={footerStyles.bottom}><span>© {new Date().getFullYear()} Ramble China</span><Link href="/credits">{t("Image credits")}</Link></div>
</div></footer>}
