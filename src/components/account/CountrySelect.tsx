import { countries } from '@/lib/account/countries';

export default function CountrySelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <select autoComplete="country-name" value={value} onChange={event => onChange(event.target.value)}>
    <option value="">Select a country or region</option>
    {value && !countries.includes(value) && <option value={value}>{value}</option>}
    {countries.map(country => <option key={country} value={country}>{country}</option>)}
  </select>;
}
