'use client';
import {createContext,useContext} from 'react';
import Link,{type LinkProps} from 'next/link';
import type {AnchorHTMLAttributes,ReactNode} from 'react';
import {localizePath,type Locale} from './locales';
const LocaleContext=createContext<Locale>('en');
export function LocaleProvider({locale,children}:{locale:Locale;children:ReactNode}){return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>}
export function useLocale(){return useContext(LocaleContext)}
type Props=LinkProps&AnchorHTMLAttributes<HTMLAnchorElement>&{children:ReactNode};
export default function LocalizedLink({href,children,...props}:Props){const locale=useLocale();return <Link href={typeof href==='string'?localizePath(href,locale):href} {...props}>{children}</Link>}
