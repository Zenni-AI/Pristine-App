'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { SEAT_PRICES } from '@motherboard/shared';
import { useApp } from '@/components/providers/AppProviders';
import { Avatar, LoadingState } from '@/components/ui';

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
    return <LoadingState label="Loading Motherboard…" />;
  }

  return (
    <div className="flex min-h-screen bg-background text-textPrimary">
      <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-surface p-6">
        <span className="mb-10 text-lg font-bold tracking-tight">Motherboard</span>
        <nav className="flex flex-col gap-1">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-body font-medium ${
                  active ? 'bg-accentSoft text-accent' : 'text-textSecondary hover:bg-surfaceSunken hover:text-textPrimary'
                }`}
              >
                <span aria-hidden>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto flex items-center gap-3 border-t border-border pt-5">
          <Avatar name={member.display_name} size={36} />
          <div className="min-w-0">
            <p className="truncate text-body font-semibold text-textPrimary">{member.display_name}</p>
            <p className="text-secondary text-textSecondary">{SEAT_PRICES[role].label}</p>
          </div>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto px-10 py-10">
        <div className="mx-auto max-w-3xl animate-fade-in-up">{children}</div>
      </main>
    </div>
  );
}
