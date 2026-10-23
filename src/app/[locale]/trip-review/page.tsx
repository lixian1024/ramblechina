import {pageMetadata} from '@/i18n/metadata';
import type {Locale} from '@/i18n/locales';
import TripReviewForm from '@/components/travel/TripReviewForm';
import styles from '@/components/travel/LocalGuideRequest.module.css';

export async function generateMetadata({params}:{params:Promise<{locale:Locale}>}) {
  const {locale}=await params;
  return pageMetadata(locale,'/trip-review',locale==='zh'?'申请人工复核中国行程':'Request a manual China itinerary review',
    locale==='zh'?'提出你担心的中国旅行路线或时间安排问题，申请人工复核。是否可安排及时间需另行确认。':'Share a China travel route or timing question for manual review. Availability and timing are agreed separately.');
}
export default async function Page({params}:{params:Promise<{locale:Locale}>}) {
  const {locale}=await params,zh=locale==='zh';
  return <div className={`wrap ${styles.page}`}><aside className={styles.intro}>
    <span className="eyebrow">{zh?'一起检查计划':'PLAN WITH US'}</span>
    <h1>{zh?'这份行程，走得通吗？':'Will your itinerary work in practice?'}</h1>
    <p>{zh?'第一次来中国，路线、时间和预约信息可能很难判断。告诉我们最让你犹豫的一处安排，申请人工查看。':'Planning a first trip to China can leave route, timing and reservation questions. Tell us which part of your plan you are unsure about and request a manual review.'}</p>
    <ol className={styles.steps}>
      <li><span>01</span><div><strong>{zh?'描述一个真实问题':'Bring a real planning question'}</strong><p>{zh?'城市、大致日期与担心的安排即可。':'Your cities, approximate dates and the part you want checked.'}</p></div></li>
      <li><span>02</span><div><strong>{zh?'人工确认下一步':'Agree on a next step'}</strong><p>{zh?'提交不等于预约，暂不承诺回复时间或名额。':'Submitting is a request. We cannot promise a response time or a place.'}</p></div></li>
      <li><span>03</span><div><strong>{zh?'研究参与完全自愿':'Research is optional'}</strong><p>{zh?'如邀请你体验规划工具，会提前说明内容并单独征求同意。':'If invited to try the planner, we will explain the session and ask for consent first.'}</p></div></li>
    </ol></aside><TripReviewForm/></div>;
}
