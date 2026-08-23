'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/components/providers/AppProviders';

export default function SignInPage() {
  const { supabase, refresh } = useApp();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePasswordAuth = async (kind: 'sign_in' | 'sign_up') => {
    setError(null);
    setBusy(true);
    const { error: authError } =
      kind === 'sign_in'
        ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
        : await supabase.auth.signUp({ email: email.trim(), password });
    setBusy(false);
    if (authError) return setError(authError.message);
    await refresh();
    router.push('/');
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-textPrimary">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-3xl font-bold">Domo</h1>
        <p className="mb-8 text-textSecondary">Sign in to your household</p>

        <label className="mb-2 block text-sm text-textSecondary">Email</label>
        <input
          className="mb-4 w-full rounded-xl border border-border bg-surface px-4 py-3 text-textPrimary outline-none focus:border-accent"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          type="email"
        />

        <label className="mb-2 block text-sm text-textSecondary">Password</label>
        <input
          className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-textPrimary outline-none focus:border-accent"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 6 characters"
          type="password"
        />
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}

        <div className="mt-4 flex gap-3">
          <button
            className="flex-1 rounded-xl border border-border bg-surface py-3 font-semibold text-textPrimary hover:border-accent disabled:opacity-50"
            onClick={() => handlePasswordAuth('sign_up')}
            disabled={busy || !email.includes('@') || password.length < 6}
          >
            {busy ? 'Please wait…' : 'Sign up'}
          </button>
          <button
            className="flex-1 rounded-xl bg-accent py-3 font-semibold text-white hover:bg-accentGlow disabled:opacity-50"
            onClick={() => handlePasswordAuth('sign_in')}
            disabled={busy || !email.includes('@') || password.length < 6}
          >
            {busy ? 'Please wait…' : 'Sign in'}
          </button>
        </div>
        <p className="mt-2 text-xs text-textSecondary">New here? Click "Sign up" — it creates your account and signs you in immediately.</p>

        <a href="/join" className="mt-6 block text-center text-sm font-medium text-accentGlow hover:underline">
          I have an invite code
        </a>
      </div>
    </main>
  );
}
