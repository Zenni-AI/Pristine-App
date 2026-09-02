'use client';

import { useMemo } from 'react';
import { quoteOfTheDay } from '@motherboard/shared';

/**
 * The daily empowerment quote — an editorial moment, not a data summary, so
 * it deliberately doesn't use Card. Always the first thing on the home
 * screen. Pure client-side pick, no fetch/loading state needed.
 */
export function QuoteOfDay() {
  const quote = useMemo(() => quoteOfTheDay(), []);

  return (
    <div className="rounded-lg bg-accentSoft px-6 py-5">
      <span aria-hidden className="text-3xl font-serif italic leading-none text-accent">
        “
      </span>
      <p className="mt-1 text-section-title font-semibold leading-snug text-textPrimary">{quote.text}</p>
      <p className="mt-2 text-secondary text-textSecondary">— {quote.author}</p>
    </div>
  );
}
