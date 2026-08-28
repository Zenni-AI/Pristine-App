import { useEffect, useState } from 'react';
import type { HouseholdMember } from '@motherboard/shared';
import { supabase } from './supabase';

export function useHouseholdMembers(householdId: string | undefined) {
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!householdId) {
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    supabase
      .from('household_members')
      .select('*')
      .eq('household_id', householdId)
      .eq('is_active', true)
      .neq('role', 'babysitter')
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (!cancelled) {
          setMembers((data as HouseholdMember[]) ?? []);
          setIsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [householdId]);

  return { members, isLoading };
}
