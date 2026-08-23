'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { MemberRole } from '@domo/shared';
import { useApp } from '@/components/providers/AppProviders';

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
      <div className="w-full max-w-sm">
        <h1 className="mb-6 text-2xl font-bold">{mode === 'create' ? 'Start your household' : 'Join a household'}</h1>

        <div className="mb-6 flex gap-1 rounded-xl bg-surface p-1">
          <button
            className={`flex-1 rounded-lg py-2 text-sm font-semibold ${mode === 'create' ? 'bg-accent text-white' : 'text-textSecondary'}`}
            onClick={() => setMode('create')}
          >
            New household
          </button>
          <button
            className={`flex-1 rounded-lg py-2 text-sm font-semibold ${mode === 'join' ? 'bg-accent text-white' : 'text-textSecondary'}`}
            onClick={() => setMode('join')}
          >
            I have a code
          </button>
        </div>

        <label className="mb-2 block text-sm text-textSecondary">Your name</label>
        <input className="mb-4 w-full rounded-xl border border-border bg-surface px-4 py-3" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />

        {mode === 'create' ? (
          <>
            <label className="mb-2 block text-sm text-textSecondary">Household name</label>
            <input className="mb-2 w-full rounded-xl border border-border bg-surface px-4 py-3" value={householdName} onChange={(e) => setHouseholdName(e.target.value)} />
            <p className="text-xs text-textSecondary">You'll be the Primary Admin.</p>
          </>
        ) : (
          <>
            <label className="mb-2 block text-sm text-textSecondary">Invite code</label>
            <input className="mb-4 w-full rounded-xl border border-border bg-surface px-4 py-3 uppercase" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} />
            <label className="mb-2 block text-sm text-textSecondary">Your role</label>
            <div className="mb-4 flex flex-col gap-2">
              {JOINABLE_ROLES.map((r) => (
                <button
                  key={r.role}
                  className={`rounded-xl border px-4 py-3 text-left text-sm ${role === r.role ? 'border-accent bg-surfaceRaised' : 'border-border bg-surface text-textSecondary'}`}
                  onClick={() => setRole(r.role)}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </>
        )}

        {error && <p className="mb-2 text-sm text-danger">{error}</p>}

        <button className="w-full rounded-xl bg-accent py-3 font-semibold text-white hover:bg-accentGlow disabled:opacity-50" onClick={submit} disabled={submitting}>
          {submitting ? 'Please wait…' : mode === 'create' ? 'Create household' : 'Join household'}
        </button>
      </div>
    </main>
  );
}
