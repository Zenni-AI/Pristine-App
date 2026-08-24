'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { MemberRole } from '@motherboard/shared';
import { useApp } from '@/components/providers/AppProviders';
import { Button, Input } from '@/components/ui';

const JOINABLE_ROLES: { role: MemberRole; label: string }[] = [
  { role: 'second_admin', label: 'Second Admin (spouse/partner)' },
  { role: 'adult_member', label: 'Adult Member (view-only)' },
  { role: 'kid', label: 'Kid' },
];

export default function JoinPage() {
  const { supabase, refresh } = useApp();
  const router = useRouter();
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [displayName, setDisplayName] = useState('');
  const [householdName, setHouseholdName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [role, setRole] = useState<MemberRole>('adult_member');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setError(null);
    setSubmitting(true);
    // Everything below is wrapped in try/catch/finally — without it, a thrown
    // exception (network hiccup, timeout, anything that rejects the promise
    // instead of resolving to { data, error }) would skip setSubmitting(false)
    // entirely, leaving the button stuck on "Please wait…" forever with no
    // visible error and no navigation.
    try {
      const { error: rpcError } =
        mode === 'create'
          ? await supabase.rpc('fn_create_household', { p_name: householdName.trim() || 'My Household', p_display_name: displayName.trim() || 'Admin' })
          : await supabase.rpc('fn_join_household', { p_invite_code: inviteCode.trim().toUpperCase(), p_role: role, p_display_name: displayName.trim() || 'Member' });
      if (rpcError) {
        setError(rpcError.message || 'Something went wrong creating your household. Please try again.');
        return;
      }
      await refresh();
      router.push('/dashboard');
    } catch (err) {
      console.error('Household create/join failed:', err);
      setError(err instanceof Error ? err.message : 'Something went wrong. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-textPrimary">
      <div className="w-full max-w-sm animate-fade-in-up">
        <h1 className="mb-6 text-page-title text-textPrimary">{mode === 'create' ? 'Start your household' : 'Join a household'}</h1>

        <div className="mb-6 flex gap-1 rounded-md bg-surfaceSunken p-1">
          <button
            className={`flex-1 rounded-sm py-2 text-secondary font-semibold ${mode === 'create' ? 'bg-surface text-textPrimary shadow-card' : 'text-textSecondary'}`}
            onClick={() => setMode('create')}
          >
            New household
          </button>
          <button
            className={`flex-1 rounded-sm py-2 text-secondary font-semibold ${mode === 'join' ? 'bg-surface text-textPrimary shadow-card' : 'text-textSecondary'}`}
            onClick={() => setMode('join')}
          >
            I have a code
          </button>
        </div>

        <Input label="Your name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />

        {mode === 'create' ? (
          <>
            <Input label="Household name" value={householdName} onChange={(e) => setHouseholdName(e.target.value)} hint="You'll be the Primary Admin." />
          </>
        ) : (
          <>
            <Input label="Invite code" className="uppercase" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} />
            <label className="mb-2 block text-secondary font-medium text-textSecondary">Your role</label>
            <div className="mb-4 flex flex-col gap-2">
              {JOINABLE_ROLES.map((r) => (
                <button
                  key={r.role}
                  className={`rounded-md border px-4 py-3 text-left text-body ${
                    role === r.role ? 'border-accent bg-accentSoft text-accent' : 'border-border bg-surface text-textSecondary'
                  }`}
                  onClick={() => setRole(r.role)}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </>
        )}

        {error && <p className="mb-2 text-secondary text-danger">{error}</p>}

        <Button fullWidth onClick={submit} disabled={submitting}>
          {submitting ? 'Please wait…' : mode === 'create' ? 'Create household' : 'Join household'}
        </Button>
      </div>
    </main>
  );
}
