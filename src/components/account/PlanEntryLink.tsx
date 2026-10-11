'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { useAuth } from './AuthProvider';

export const planSignInPath = '/en/login?next=%2Fen%2Fplan';

export default function PlanEntryLink({ children, className }: { children: ReactNode; className?: string }) {
  const { user, loading } = useAuth();
  return <Link href={user ? '/en/plan' : planSignInPath} className={className} aria-disabled={loading} onClick={event => { if (loading) event.preventDefault(); }}>{children}</Link>;
}
