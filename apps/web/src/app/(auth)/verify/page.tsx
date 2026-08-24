'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useApp } from '@/components/providers/AppProviders';
import { Button, Input } from '@/components/ui';

export default function VerifyPage() {
  // useSearchParams() opts the tree below it out of static prerendering unless
  // wrapped in Suspense — without this, `next build` fails on this page even
  // though `next dev` never shows the problem.
  return (
    <Suspense>
      <VerifyForm />
    </Suspense>
  );
}

function VerifyForm() {
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
      <div className="w-full max-w-sm animate-fade-in-up">
        <h1 className="mb-1 text-page-title text-textPrimary">Check your email</h1>
        <p className="mb-8 text-body text-textSecondary">We sent a 6-digit code to {email}</p>

        <Input
          className="text-center text-2xl tracking-[0.5em]"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          maxLength={6}
          placeholder="123456"
        />
        {error && <p className="mb-2 text-secondary text-danger">{error}</p>}

        <Button fullWidth onClick={handleVerify} disabled={verifying || code.length < 6}>
          {verifying ? 'Verifying…' : 'Verify'}
        </Button>
      </div>
    </main>
  );
}
