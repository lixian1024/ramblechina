import Link from 'next/link';
import {localizePath, type Locale} from '@/i18n/locales';
import {travelTipView, type TravelTip} from '@/content/travel-tips';

export default function TravelTipArticle({guide, locale}: {guide: TravelTip; locale: Locale}) {
  const view = travelTipView(guide, locale), zh = locale === 'zh';
  const citations = (ids: string[]) => ids.map(id => {
    const index = guide.sources.findIndex(source => source.id === id);
    return <a href={`#source-${id}`} key={id} aria-label={`${zh ? '来源' : 'Source'} ${index + 1}`}>[{index + 1}]</a>;
  });
  return <article className="travel-tip-article wrap">
    <nav className="travel-tip-breadcrumb" aria-label={zh ? '面包屑导航' : 'Breadcrumb'}><Link href={localizePath('/travel-tips', locale)}>{zh ? '实用旅行指南' : 'Practical travel guides'}</Link><span aria-hidden="true"> / </span><span>{zh ? '行前准备' : 'Before you go'}</span></nav>
    <header className="travel-tip-header"><p className="eyebrow">{zh ? '初次来华 · 实用步骤' : 'YOUR FIRST CHINA TRIP · PRACTICAL STEPS'}</p><h1>{view.title}</h1><p className="travel-tip-lead">{view.intro}</p><p className="travel-tip-date">{zh ? '公开来源核对日期：' : 'Public sources checked: '}<time dateTime={guide.checkedAt}>{guide.checkedAt}</time>{zh ? ' · 不代表实时余票核验' : ' · Not a live availability check'}</p></header>
    <div className="travel-tip-layout"><aside className="travel-tip-index"><nav aria-label={zh ? '本文目录' : 'On this page'}><a href="#prepare">{zh ? '开始前准备' : 'Before you start'}</a><a href="#steps">{zh ? '按步骤操作' : 'What to do'}</a><a href="#recovery">{zh ? '失败时的下一步' : 'If something goes wrong'}</a><a href="#sources">{zh ? '来源与适用边界' : 'Sources and limits'}</a></nav></aside>
      <div className="travel-tip-body">
        <section id="prepare" className="travel-tip-prepare"><h2>{zh ? '开始前准备' : 'Have these ready'}</h2><ul>{view.prepare.map(item => <li key={item}>{item}</li>)}</ul></section>
        <section id="steps"><h2>{zh ? '按步骤操作' : 'What to do'}</h2><ol className="travel-tip-steps">{view.steps.map(step => <li key={step.id} id={step.id}><h3>{step.title}</h3><p>{step.body} <span className="travel-tip-citations">{citations(step.sources)}</span></p></li>)}</ol></section>
        <section id="recovery"><h2>{zh ? '失败时的下一步' : 'If something goes wrong'}</h2>{view.problems.map(problem => <div className="travel-tip-problem" key={problem.id}><h3>{problem.title}</h3><p>{problem.body} <span className="travel-tip-citations">{citations(problem.sources)}</span></p></div>)}</section>
        <section id="sources" className="travel-tip-sources"><h2>{zh ? '来源与适用边界' : 'Sources and limits'}</h2><p>{view.limitations}</p><ol>{view.sources.map(source => <li id={`source-${source.id}`} key={source.id}><a href={source.url} target="_blank" rel="noreferrer">{source.label} ↗</a><span>{zh ? '核对于 ' : 'Checked '}{guide.checkedAt}</span></li>)}</ol><p className="travel-tip-date">{zh ? 'Ramble China 编辑整理。步骤中的留时、备选和规划建议属于编辑建议，不是运营方承诺。' : 'Compiled by Ramble China. Buffer time, fallback options and planning suggestions are editorial advice, not operator guarantees.'}</p></section>
        <section className="travel-tip-cta"><p className="eyebrow">{zh ? '带着约束继续规划' : 'TAKE YOUR CONSTRAINTS INTO THE PLAN'}</p><h2>{zh ? '把预约变成合理的一天' : 'Build the day around what is confirmed'}</h2><p>{view.planning}</p><Link href={localizePath('/plan', locale)} className="button">{zh ? '打开行程规划' : 'Open the trip planner'} <span aria-hidden="true">↗</span></Link></section>
      </div>
    </div>
  </article>;
}
