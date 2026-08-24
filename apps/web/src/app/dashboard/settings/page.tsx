'use client';

import { SEAT_PRICES, formatCents } from '@motherboard/shared';
import { useApp } from '@/components/providers/AppProviders';
import { Avatar, Button, Card, PageHeader } from '@/components/ui';

export default function SettingsPage() {
  const { supabase, household, member, role, capabilities } = useApp();
  if (!household || !member || !role) return null;
  const seat = SEAT_PRICES[role];

  return (
    <div>
      <PageHeader title="Settings" />
      <div className="flex flex-col gap-4">
        <Card title="Your profile">
          <div className="flex items-center gap-3">
            <Avatar name={member.display_name} />
            <div>
              <p className="text-body font-semibold text-textPrimary">{member.display_name}</p>
              <p className="text-secondary text-textSecondary">{seat.label}</p>
            </div>
          </div>
        </Card>

        {capabilities?.canManageAccounts && (
          <Card title="Household">
            <p className="text-secondary text-textSecondary">Invite code</p>
            <p className="mt-1 text-page-title tracking-widest text-accent">{household.invite_code}</p>
            <p className="mt-2 text-secondary text-textSecondary">Share this so other family members can join with the right role.</p>
          </Card>
        )}

        {capabilities?.canViewFinance && (
          <Card title="Billing">
            <p className="text-secondary text-textSecondary">Your seat</p>
            <p className="text-body font-semibold text-textPrimary">
              {seat.label} — {formatCents(seat.monthlyCents)}/mo
            </p>
          </Card>
        )}

        <Button variant="ghost" className="w-fit !text-danger" onClick={() => supabase.auth.signOut()}>
          Sign out
        </Button>
      </div>
    </div>
  );
}
