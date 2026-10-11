import LocalGuideRequestForm from '@/components/travel/LocalGuideRequestForm';
import styles from '@/components/travel/LocalGuideRequest.module.css';

export const metadata = { title: 'Request a local guide', description: 'Tell Ramble China where you are going, your dates and interests to request a local guide in China.' };

export default function Page() {
  return <div className={`wrap ${styles.page}`}>
    <aside className={styles.intro}>
      <span className="eyebrow">LOCAL GUIDES / CHINA</span>
      <h1>Explore with a local guide.</h1>
      <p>Tell us where you’re going and what you’d like help with, from a city walk to a day of food and culture.</p>
      <ol className={styles.steps}>
        <li><span>01</span><div><strong>Share your plans</strong><p>Cities, dates and what matters to you.</p></div></li>
        <li><span>02</span><div><strong>Discuss the details</strong><p>Guide availability, language and price need to be confirmed.</p></div></li>
        <li><span>03</span><div><strong>Decide what works for you</strong><p>Submitting a request does not make a booking or require payment.</p></div></li>
      </ol>
    </aside>
    <LocalGuideRequestForm />
  </div>;
}
