'use client';

import { useState } from 'react';
import { useApp } from '@/components/providers/AppProviders';

export default function SignInPage() {
  const { supabase } = useApp();
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    setError(null);
    setSending(true);
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setSending(false);
    if (otpError) return setError(otpError.message);
    setSent(true);
  };

  if (sent) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-textPrimary">
        <div className="w-full max-w-sm text-center">
          <h1 className="mb-2 text-2xl font-bold">Check your email</h1>
          <p className="mb-6 text-textSecondary">
            We sent a sign-in link to <span className="text-textPrimary">{email}</span>. Open it on this device to finish
            signing in.
          </p>
          <a href={`/verify?email=${encodeURIComponent(email)}`} className="text-sm font-medium text-accentGlow hover:underline">
            I have a 6-digit code instead
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-textPrimary">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-3xl font-bold">Domo</h1>
        <p className="mb-8 text-textSecondary">Sign in to your household</p>

        <label className="mb-2 block text-sm text-textSecondary">Email</label>
        <input
          className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-textPrimary outline-none focus:border-accent"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          type="email"
        />
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}

        <button
          className="mt-4 w-full rounded-xl bg-accent py-3 font-semibold text-white hover:bg-accentGlow disabled:opacity-50"
          onClick={handleSend}
          disabled={sending || !email.includes('@')}
        >
          {sending ? 'Sending…' : 'Continue'}
        </button>

        <a href="/join" className="mt-6 block text-center text-sm font-medium text-accentGlow hover:underline">
          I have an invite code
        </a>
      </div>
    </main>
  );
}
