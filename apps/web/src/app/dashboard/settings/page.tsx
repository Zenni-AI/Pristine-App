'use client';

import { SEAT_PRICES, formatCents } from '@motherboard/shared';
import { useApp } from '@/components/providers/AppProviders';

export default function SettingsPage() {
  const { supabase, household, member, role, capabilities } = useApp();
  if (!household || !member || !role) return null;
  const seat = SEAT_PRICES[role];

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold">Settings</h1>

      <Card title="Your profile">
        <p className="font-semibold">{member.display_name}</p>
        <p className="text-sm text-textSecondary">{seat.label}</p>
      </Card>

      {capabilities?.canManageAccounts && (
        <Card title="Household">
          <p className="text-xs text-textSecondary">Invite code</p>
          <p className="text-2xl font-extrabold tracking-widest text-accentGlow">{household.invite_code}</p>
          <p className="mt-2 text-xs text-textSecondary">Share this so other family members can join with the right role.</p>
        </Card>
      )}

      {capabilities?.canViewFinance && (
        <Card title="Billing">
          <p className="text-sm text-textSecondary">Your seat</p>
          <p className="font-semibold">
            {seat.label} — {formatCents(seat.monthlyCents)}/mo
          </p>
        </Card>
      )}

      <button className="mt-4 text-sm font-semibold text-danger" onClick={() => supabase.auth.signOut()}>
        Sign out
      </button>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4 rounded-2xl border border-border bg-surface p-5">
      <h2 className="mb-2 text-sm font-bold">{title}</h2>
      {children}
    </div>
  );
}
