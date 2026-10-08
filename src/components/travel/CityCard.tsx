import Image from 'next/image';
import Link from '@/i18n/context';
import { City, photoFor } from '@/lib/travel/data';
import SaveButton from './SaveButton';
export default function CityCard({city}:{city:City}){const photo=photoFor(city.slug);return <article className="city-card"><Link href={'/destinations/'+city.slug} className="city-image">{photo?<Image src={city.image} alt={city.name+' — '+city.tagline} fill sizes="(max-width:600px) 90vw, (max-width:900px) 45vw, 25vw"/>:<div className="city-no-photo">{city.chinese}</div>}<div className="city-overlay"><span>{city.province}</span><h3>{city.name}</h3></div></Link><SaveButton slug={city.slug}/><div className="city-caption"><p>{city.tagline}</p><span>{city.days} days · {city.region}</span></div></article>}
