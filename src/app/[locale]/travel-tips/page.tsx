import Link from 'next/link';
import {notFound} from 'next/navigation';
import {isLocale, localizePath} from '@/i18n/locales';
import {publishedFor} from '@/i18n/publication';
import {pageMetadata} from '@/i18n/metadata';
import {travelTips, travelTipView} from '@/content/travel-tips';

type Props = {params: Promise<{locale: string}>};
export async function generateMetadata({params}: Props) {
  const {locale} = await params;
  if (!isLocale(locale) || !publishedFor(locale, '/travel-tips')) return {};
  return pageMetadata(locale, '/travel-tips', locale === 'zh' ? '初次来华实用旅行指南' : 'Practical Guides for Your First China Trip', locale === 'zh' ? '从护照订火车票到故宫预约：有官方来源、核对日期与失败恢复步骤的行前指南。' : 'Passport train bookings and Forbidden City reservations: official sources, checked dates and practical steps when something goes wrong.');
}
export default async function TravelTips({params}: Props) {
  const {locale} = await params;
  if (!isLocale(locale) || !publishedFor(locale, '/travel-tips')) notFound();
  const zh = locale === 'zh';
  return <div className="travel-tip-hub wrap"><header><p className="eyebrow">{zh ? '为下一步做好准备' : 'MAKE THE NEXT STEP EASIER'}</p><h1>{zh ? '初次来华，先解决这几个问题' : 'Practical guides for your first China trip'}</h1><p className="travel-tip-lead">{zh ? '先确认订票和证件，再安排每天的路线。这里把官方规则、操作步骤与失败后的选择放在一起。' : 'Sort out the booking and document questions before fixing your route. Start with official rules, practical steps and a way forward if things go wrong.'}</p></header><div className="travel-tip-cards">{travelTips.map(guide => {const view = travelTipView(guide, locale);return <article key={guide.slug}><p className="eyebrow">{zh ? '公开来源核对于' : 'SOURCES CHECKED'} {guide.checkedAt}</p><h2><Link href={localizePath(`/travel-tips/${guide.slug}`, locale)}>{view.title} <span aria-hidden="true">↗</span></Link></h2><p>{view.description}</p></article>;})}</div><p className="travel-tip-hub-note">{zh ? '这些指南不查询实时余票，也不代办预订。' : 'These guides do not check live availability or make reservations.'} <Link href={localizePath('/plan', locale)}>{zh ? '带着已确认的安排开始规划 →' : 'Start planning with your confirmed arrangements →'}</Link></p></div>;
}
