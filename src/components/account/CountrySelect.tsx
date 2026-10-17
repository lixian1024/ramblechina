'use client';
import {useLocale} from '@/i18n/context';
import names from '@/i18n/countries-zh.json';
import { countries } from '@/lib/account/countries';

export default function CountrySelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const locale=useLocale();
  const label=(country:string)=>locale==='zh'?(names as Record<string,string>)[country]??country:country;
  return <select autoComplete="country-name" value={value} onChange={event => onChange(event.target.value)}>
    <option value="">{locale==='zh'?'选择国家或地区':'Select a country or region'}</option>
    {value && !countries.includes(value) && <option value={value}>{value}</option>}
    {countries.map(country => <option key={country} value={country}>{label(country)}</option>)}
  </select>;
}
