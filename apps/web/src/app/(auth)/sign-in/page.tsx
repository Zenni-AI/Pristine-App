'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/components/providers/AppProviders';
import { Button, Input } from '@/components/ui';

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
    try {
      const { data: authData, error: authError } =
        kind === 'sign_in'
          ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
          : await supabase.auth.signUp({ email: email.trim(), password });
      if (authError) {
        setError(authError.message || 'Something went wrong. Please try again.');
        return;
      }

      // Brand-new sign-ups don't have a household yet. Rather than bouncing
      // them to a separate "start your household" page/button, create it
      // for them right here so entering an email + password takes them
      // straight to the dashboard. (Existing users signing in already have
      // one — this only ever runs on first sign-up.)
      if (kind === 'sign_up' && authData.session) {
        const namePrefix = email.trim().split('@')[0] || 'My';
        const { error: householdError } = await supabase.rpc('fn_create_household', {
          p_name: `${namePrefix}'s Household`,
          p_display_name: namePrefix,
        });
        if (householdError) {
          setError(householdError.message || "Account created, but we couldn't set up your household. Please try signing in again.");
          return;
        }
      }

      await refresh();
      router.push('/dashboard');
    } catch (err) {
      console.error('Sign-in/sign-up failed:', err);
      setError(err instanceof Error ? err.message : 'Something went wrong. Please check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  const disabled = busy || !email.includes('@') || password.length < 6;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-textPrimary">
      <div className="w-full max-w-sm animate-fade-in-up">
        <h1 className="mb-1 text-page-title text-textPrimary">Motherboard</h1>
        <p className="mb-8 text-body text-textSecondary">Sign in to your household</p>

        <Input label="Email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" type="email" />
        <Input label="Password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" type="password" />
        {error && <p className="mb-2 text-secondary text-danger">{error}</p>}

        <div className="mt-4 flex gap-3">
          <Button variant="secondary" fullWidth onClick={() => handlePasswordAuth('sign_up')} disabled={disabled}>
            {busy ? 'Please wait…' : 'Sign up'}
          </Button>
          <Button fullWidth onClick={() => handlePasswordAuth('sign_in')} disabled={disabled}>
            {busy ? 'Please wait…' : 'Sign in'}
          </Button>
        </div>
        <p className="mt-2 text-secondary text-textSecondary">New here? Click &quot;Sign up&quot; — it creates your account and signs you in immediately.</p>

        <a href="/join" className="mt-6 block text-center text-body font-medium text-accent hover:underline">
          I have an invite code
        </a>
      </div>
    </main>
  );
}
