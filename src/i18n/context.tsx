'use client';
import {createContext,useContext,useMemo} from 'react';
import Link,{type LinkProps} from 'next/link';
import type {AnchorHTMLAttributes,ReactNode} from 'react';
import {localizePath,type Locale} from './locales';
import {siteTranslator} from './website';
const LocaleContext=createContext<Locale>('en');
export function LocaleProvider({locale,children}:{locale:Locale;children:ReactNode}){return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>}
export function useLocale(){return useContext(LocaleContext)}
export function useWebsiteText(){const locale=useLocale();return useMemo(()=>siteTranslator(locale),[locale])}
type Props=LinkProps&AnchorHTMLAttributes<HTMLAnchorElement>&{children:ReactNode};
export default function LocalizedLink({href,children,...props}:Props){const locale=useLocale();return <Link href={typeof href==='string'?localizePath(href,locale):href} {...props}>{children}</Link>}
