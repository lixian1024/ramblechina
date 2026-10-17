import {pageMetadata} from '@/i18n/metadata';
import {siteTranslator} from '@/i18n/website';
import type {Locale} from '@/i18n/locales';
import photos from '@/lib/travel/photos.json';
export async function generateMetadata({params}:{params:Promise<{locale:Locale}>}){const {locale}=await params;return pageMetadata(locale,"/credits",locale==='zh'?"图片与来源":"Photography & sources",locale==='zh'?"照片原始来源、作者及授权条款。":"");}
export default async function Page({params}:{params:Promise<{locale:Locale}>}){
  const {locale}=await params;
  const t=siteTranslator(locale);return <div className="wrap page-intro credits"><h1>{t("Through other eyes.")}</h1><p>{t("Real places, photographed by real people. Thank you to the photographers who make this collection possible.")}</p><p>{t("Images are resized and cropped for presentation. Each photograph retains its own license; follow its source for the original and complete terms.")}</p>{photos.map(p=><article key={p.slug}><h3>{p.slug}</h3><p>{p.author} · {p.license}</p><a href={p.source} target="_blank" rel="noreferrer">{t("Original photograph:")} {p.title}</a><br/><a href={p.licenseUrl||p.source}>{t("License and reuse terms")}</a></article>)}</div>}
