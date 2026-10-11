'use client';
import Link from '@/i18n/context';
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
  const {user}=useAuth();
  const [open, setOpen] = useState(false), pathname = usePathname(), m = getMessages('en').nav;
  const path = pathname.replace(/^\/(en|ko|zh)(?=\/|$)/, '') || '/';
  const current = (target: string) => path === target || path.startsWith(target + '/') ? 'page' as const : undefined;
  return <header className="site-header">
    <Link href="/" className="brand"><BrandLogo /></Link>
    <nav id="site-navigation" aria-label="Main navigation" className={open ? 'nav open' : 'nav'}>
      <Link aria-current={current('/destinations')} onClick={() => setOpen(false)} href="/destinations">{m.destinations}</Link>
      <Link aria-current={current('/essentials')} onClick={() => setOpen(false)} href="/essentials">{m.essentials}</Link>
      <Link aria-current={current('/plan')} onClick={() => setOpen(false)} href="/plan">{m.plan}</Link>
      <Link aria-current={current('/local-guide')} onClick={() => setOpen(false)} href="/local-guide">Need local guide</Link>
    </nav>
    <div className="header-actions">
      <select className="site-language" aria-label="Website language" defaultValue="en"><option value="en">English</option></select>
      <button className="menu-button" aria-label={open ? m.closeMenu : m.openMenu} aria-controls="site-navigation" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
      <Link aria-current={current(user?'/account':'/login')} className="button small account-button" onClick={() => setOpen(false)} href={user?'/account':'/login'}>{user?'My account':'Sign in'} <ArrowUpRight size={15} /></Link>
    </div>
  </header>;
}
export function Footer(){return <footer className={`site-footer ${footerStyles.footer}`}><div className={footerStyles.inner}>
  <div className={footerStyles.top}><div className={footerStyles.brand}><Link href="/" className="brand"><BrandLogo /></Link><p>{getMessages('en').nav.footerLine}</p></div>
  <div className={footerStyles.columns}>
    <section className={footerStyles.column} aria-labelledby="footer-product"><h2 id="footer-product">Product</h2>
      <nav className={footerStyles.links} aria-label="Footer product"><Link href="/plan">Plan a trip</Link><Link href="/destinations">Destinations</Link><Link href="/essentials">Travel essentials</Link><Link href="/local-guide">Need local guide</Link></nav>
    </section>
    <section className={footerStyles.column} aria-labelledby="footer-support"><h2 id="footer-support">Support</h2>
      <nav className={footerStyles.links} aria-label="Footer support"><Link href="/about">About us</Link><a href="mailto:service@fewerpoints.com">Email</a><a href="https://x.com/ramblecn" target="_blank" rel="noopener noreferrer">X <ArrowUpRight size={14}/></a></nav>
    </section>
    <figure className={footerStyles.whatsapp}><Image src={whatsappCode} alt="Scan to contact Ramble China on WhatsApp" unoptimized/><figcaption>WhatsApp</figcaption></figure>
  </div></div><div className={footerStyles.bottom}><span>© {new Date().getFullYear()} Ramble China</span><Link href="/credits">Image credits</Link></div>
</div></footer>}
