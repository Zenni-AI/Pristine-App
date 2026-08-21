'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useApp } from '@/components/providers/AppProviders';

export default function VerifyPage() {
  const { supabase, refresh } = useApp();
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get('email') ?? '';
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  const handleVerify = async () => {
    setError(null);
    setVerifying(true);
    const { error: verifyError } = await supabase.auth.verifyOtp({ email, token: code.trim(), type: 'email' });
    setVerifying(false);
    if (verifyError) return setError(verifyError.message);
    await refresh();
    router.push('/dashboard');
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-textPrimary">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-2xl font-bold">Check your email</h1>
        <p className="mb-8 text-textSecondary">We sent a 6-digit code to {email}</p>

        <input
          className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-center text-2xl tracking-[0.5em] text-textPrimary outline-none focus:border-accent"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          maxLength={6}
          placeholder="123456"
        />
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}

        <button
          className="mt-4 w-full rounded-xl bg-accent py-3 font-semibold text-white hover:bg-accentGlow disabled:opacity-50"
          onClick={handleVerify}
          disabled={verifying || code.length < 6}
        >
          {verifying ? 'Verifying…' : 'Verify'}
        </button>
      </div>
    </main>
  );
}
