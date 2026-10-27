import Link from 'next/link';
import {notFound} from 'next/navigation';
import {ArrowDown, ArrowUpRight, Check, HeartPulse, Plus, ShieldCheck} from 'lucide-react';
import {isLocale, localizePath, type Locale} from '@/i18n/locales';
import {publishedFor} from '@/i18n/publication';
import {pageMetadata} from '@/i18n/metadata';
import {medicalBudget, medicalPreparation, medicalSections, medicalSources, medicalText} from '@/content/medical-guide';
import styles from '@/components/medical/MedicalGuide.module.css';

type Props = {params: Promise<{locale: string}>};

export async function generateMetadata({params}: Props) {
  const {locale} = await params;
  if (!isLocale(locale) || !publishedFor(locale, '/medical')) return {};
  return pageMetadata(locale, '/medical', locale === 'zh' ? '来华就医指南' : 'Medical care in China', locale === 'zh'
    ? '外国访客来华就医实用指南：医院与三甲体系、预约、费用保险、签证携药、语言、风险及回国随访。附官方来源与确认清单。'
    : 'A practical guide to care in China: hospitals, appointments, costs, insurance, entry, medicines, language and follow-up, with official sources and checklists.');
}

function Contents({locale}: {locale: Locale}) {
  const zh = locale === 'zh';
  return <nav aria-label={zh ? '就医指南章节' : 'Medical guide chapters'} className={styles.contents}>
    {medicalSections.map((section, index) => <a key={section.id} href={`#${section.id}`}><span>{String(index + 1).padStart(2, '0')}</span>{medicalText(section.title, locale)}</a>)}
    <a href="#sources"><span>↗</span>{zh ? '来源与资料说明' : 'Sources & editorial notes'}</a>
  </nav>;
}

export default async function MedicalPage({params}: Props) {
  const {locale} = await params;
  if (!isLocale(locale) || !publishedFor(locale, '/medical')) notFound();
  const zh = locale === 'zh';
  const t = (value: Parameters<typeof medicalText>[0]) => medicalText(value, locale);
  return <div className={styles.page}>
    <header className={styles.hero} id="medical-top">
      <div className={styles.heroInner}>
        <div>
          <p className={styles.eyebrow}><HeartPulse size={17} aria-hidden="true"/>{zh ? '来华生活 / 就医准备' : 'BEFORE YOU GO / HEALTHCARE'}</p>
          <h1>{zh ? '来华就医指南' : <>Medical care<br/>in China.</>}</h1>
          <p className={styles.lead}>{zh ? '从选医院到回国随访，把重要问题、准备事项和官方查询入口放在一起。' : 'Know what to ask, what to prepare and what to confirm. From choosing a hospital to continuing care at home.'}</p>
          <div className={styles.heroMeta}><span>{zh ? '中英文完整指南' : 'A complete guide · English / 中文'}</span><span>{zh ? '编辑更新' : 'Edited'} <time dateTime="2026-10-27">2026-10-27</time></span></div>
          <a href="#before-you-decide" className={styles.start}>{zh ? '开始阅读' : 'Explore the guide'} <ArrowDown size={16} aria-hidden="true"/></a>
        </div>
        <aside className={styles.emergency} aria-label={zh ? '紧急求助' : 'Urgent care'}>
          <span className={styles.noticeIcon}><Plus size={22} aria-hidden="true"/></span>
          <h2>{zh ? '紧急情况，先就地求助。' : 'Urgent problem? Get local help first.'}</h2>
          <p>{zh ? '不要为了跨境就医而推迟急救。已在中国大陆，需要救护车时拨打 120；请他人协助说明准确位置。' : 'Do not delay urgent care to arrange a trip. Already in mainland China and need an ambulance? Call 120, or ask someone to call with your exact location.'}</p>
          <a href={medicalSources.find(source => source.id === 'emergency')!.url} target="_blank" rel="noopener noreferrer">{zh ? '政府急救号码说明' : 'Official emergency numbers'} <ArrowUpRight size={14} aria-hidden="true"/></a>
        </aside>
      </div>
    </header>

    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <p className={styles.eyebrow}>{zh ? '按问题查找' : 'FIND YOUR ANSWER'}</p>
        <Contents locale={locale}/>
        <p className={styles.indexNote}>{zh ? '通用信息指南，不提供个人诊断、治疗或预约。' : 'General information to help you prepare. Individual care and appointments must be arranged with the provider.'}</p>
      </aside>
      <div className={styles.main}>
        <details className={styles.mobileIndex}>
          <summary>{zh ? '查看全部章节' : 'Browse all chapters'}<Plus size={17} aria-hidden="true"/></summary>
          <Contents locale={locale}/>
        </details>

        <section className={styles.preparation} aria-labelledby="preparation-title">
          <p className={styles.eyebrow}><ShieldCheck size={16} aria-hidden="true"/>{zh ? '出发前，先确认' : 'BEFORE YOU COMMIT'}</p>
          <h2 id="preparation-title">{zh ? '四件事，先有答案。' : 'Four checks before you book.'}</h2>
          <ul>{medicalPreparation.map(item => <li key={item.en}><Check size={17} aria-hidden="true"/><span>{t(item)}</span></li>)}</ul>
          <p className={styles.preparationNote}>{zh ? '这是一份确认清单，不是“适合就医旅行”的自测。涉及个人健康和治疗的决定，请与合格医生讨论。' : 'This is a preparation checklist, not a test of medical suitability. Discuss decisions about your health and treatment with a qualified clinician.'}</p>
        </section>

        {medicalSections.map((section, index) => <section id={section.id} key={section.id} className={styles.chapter} aria-labelledby={`${section.id}-title`}>
          <header className={styles.chapterHead}>
            <span className={styles.chapterNumber}>{String(index + 1).padStart(2, '0')}</span>
            <div><h2 id={`${section.id}-title`}>{t(section.title)}</h2><p>{t(section.intro)}</p></div>
          </header>
          {section.id === 'costs-insurance' && <div className={styles.budget}><h3>{zh ? '完整预算，逐项核对' : 'Build a complete budget'}</h3><table><thead><tr><th scope="col">{zh ? '预算项目' : 'Cost item'}</th><th scope="col">{zh ? '需要确认' : 'What to confirm'}</th></tr></thead><tbody>{medicalBudget.map(row => <tr key={row.item.en}><th scope="row">{t(row.item)}</th><td>{t(row.ask)}</td></tr>)}</tbody></table></div>}
          <div className={styles.questions}>{section.questions.map(question => <details id={`${section.id}-${question.id}`} key={question.id} open={question.id === 'cancelled-appointment' || question.id === 'missing-english-report'}>
            <summary>{t(question.title)}<Plus size={17} aria-hidden="true"/></summary>
            <p>{t(question.body)}</p>
          </details>)}</div>
          <div className={styles.actions}><h3>{zh ? '下一步，确认这些' : 'Your next step'}</h3><ul>{section.actions.map(action => <li key={action.en}>{t(action)}</li>)}</ul></div>
          <div className={styles.citations}><span>{zh ? '查询来源' : 'CHECK AT SOURCE'}</span>{section.sources.map(id => {
            const source = medicalSources.find(item => item.id === id)!;
            return <a key={id} href={source.url} target="_blank" rel="noopener noreferrer">{t(source.label)} <ArrowUpRight size={13} aria-hidden="true"/></a>;
          })}</div>
        </section>)}

        <section id="sources" className={styles.sourceSection} aria-labelledby="sources-title">
          <p className={styles.eyebrow}>{zh ? '资料依据 / 保持可核查' : 'THE READING BEHIND THIS GUIDE'}</p>
          <h2 id="sources-title">{zh ? '来源与资料说明' : 'Sources & editorial notes'}</h2>
          <p>{zh ? '以下日期表示我们读取了公开页面，不代表医院号源、价格、个人签证资格或保险理赔已核实。部分原始公告发布较早；请在付款与出发前向负责机构确认当前规则。' : 'The dates below record checks of public pages. They do not verify live appointments, prices, your entry eligibility or insurance approval. Some notices are older; confirm current requirements with the responsible organisation before paying or travelling.'}</p>
          <ul className={styles.sourceList}>{medicalSources.map(source => <li key={source.id}><a href={source.url} target="_blank" rel="noopener noreferrer">{t(source.label)} <ArrowUpRight size={14} aria-hidden="true"/></a><span>{zh ? '公开页面核对' : 'Public page checked'} <time dateTime={source.checkedAt}>{source.checkedAt}</time></span></li>)}</ul>
          <div className={styles.disclaimer}><p>{zh ? '本指南用于一般信息准备，不构成个人医疗、法律或保险意见，也不代办就医。诊疗方案、检查准备、乘机适宜性及后续照护由负责的专业人员评估。' : 'This guide provides general preparation information, not individual medical, legal or insurance advice or a booking service. Your responsible professionals should assess the care plan, test preparation, fitness to fly and follow-up.'}</p><p>{zh ? '发现资料需要更新？' : 'Something needs updating?'} <a href="mailto:service@ramblechina.com">{zh ? '联系编辑团队' : 'Contact the editorial team'}</a></p></div>
        </section>
        <div className={styles.endLinks}><Link href={localizePath('/essentials', locale)}>{zh ? '查看其他行前准备' : 'Other travel essentials'} <ArrowUpRight size={16} aria-hidden="true"/></Link><a href="#medical-top">{zh ? '返回顶部 ↑' : 'Back to top ↑'}</a></div>
      </div>
    </div>
  </div>;
}
