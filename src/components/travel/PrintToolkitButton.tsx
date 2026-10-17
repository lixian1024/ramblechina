'use client';
import {useWebsiteText} from '@/i18n/context';
export default function PrintToolkitButton(){const t=useWebsiteText();return <button type="button" className="button outline toolkit-print" onClick={()=>window.print()}>{t("Print / save toolkit")}</button>}
