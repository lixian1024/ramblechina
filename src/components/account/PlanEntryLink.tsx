'use client';

import type { ReactNode } from 'react';
import Link from '@/i18n/context';
import {localizePath,type Locale} from '@/i18n/locales';

export const planSignInPath = '/en/login?next=%2Fen%2Fplan';
export const planSignInPathFor = (locale:Locale) => `${localizePath('/login',locale)}?next=${encodeURIComponent(localizePath('/plan',locale))}`;

export default function PlanEntryLink({ children, className }: { children: ReactNode; className?: string }) {
  return <Link href="/plan" className={className}>{children}</Link>;
}
