'use client';
import {useState} from 'react';
import {publishedFor} from '@/i18n/publication';
import {useRouter} from 'next/navigation';
import {useLocale, useWebsiteText} from '@/i18n/context';
import {languageNames, publishedLocales, type Locale} from '@/i18n/locales';
import {languageDestination} from '@/i18n/routing';

export default function LanguageSwitcher() {
  const locale=useLocale(),t=useWebsiteText(),router=useRouter();
  const [notice,setNotice]=useState('');
  return <><select className="site-language" aria-label={t('Website language')} value={locale} onChange={event=>{
    const navigation = new Event('ramble-language-change', {cancelable:true});
    if(!document.dispatchEvent(navigation))return;
    const path=window.location.pathname+window.location.search+window.location.hash;
    const bare=window.location.pathname.replace(/^\/(en|zh)(?=\/|$)/,'')||'/';
    if(!publishedFor(event.target.value as Locale,bare)){setNotice('此页暂时只提供英文版本。');return;}
    setNotice('');
    router.push(languageDestination(path,event.target.value as Locale));
  }}>{publishedLocales.map(language=><option key={language} value={language}>{languageNames[language]}</option>)}</select>{notice&&<span className="language-notice" role="status">{notice}</span>}</>;
}
