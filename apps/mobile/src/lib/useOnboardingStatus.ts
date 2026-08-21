import { useEffect, useState } from 'react';
import { supabase } from './supabase';

export function useOnboardingStatus(householdId: string | undefined) {
  const [hasStarted, setHasStarted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!householdId) {
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { count } = await supabase
        .from('onboarding_progress')
        .select('id', { count: 'exact', head: true })
        .eq('household_id', householdId)
        .neq('status', 'not_started');
      if (!cancelled) {
        setHasStarted((count ?? 0) > 0);
        setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [householdId]);

  return { hasStarted, isLoading };
}
