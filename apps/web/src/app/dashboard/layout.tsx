'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { SEAT_PRICES } from '@motherboard/shared';
import { useApp } from '@/components/providers/AppProviders';

const NAV = [
  { href: '/dashboard', label: 'Home', icon: '🏠' },
  { href: '/dashboard/chat', label: 'Family Chat', icon: '💬' },
  { href: '/dashboard/tasks', label: 'Tasks', icon: '✅' },
  { href: '/dashboard/settings', label: 'Settings', icon: '⚙️' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { session, member, household, role, isLoading } = useApp();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!session) router.replace('/sign-in');
    else if (!member) router.replace('/join');
  }, [isLoading, session, member, router]);

  if (isLoading || !household || !member || !role) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-textSecondary">
        Loading Motherboard…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background text-textPrimary">
      <aside className="flex w-64 flex-col border-r border-border bg-surface p-6">
        <span className="mb-8 text-xl font-bold">Motherboard</span>
        <nav className="flex flex-col gap-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${
                pathname === item.href ? 'bg-accent text-white' : 'text-textSecondary hover:bg-surfaceRaised hover:text-textPrimary'
              }`}
            >
              {item.icon} {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto pt-6 text-xs text-textSecondary">
          <p className="font-semibold text-textPrimary">{member.display_name}</p>
          <p>{SEAT_PRICES[role].label}</p>
          <p className="mt-1 text-textSecondary">{household.name}</p>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}
