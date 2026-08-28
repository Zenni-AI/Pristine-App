import { useCallback, useEffect, useState } from 'react';
import type { BabysitterSession, BabysitterUnlockItem } from '@motherboard/shared';
import { useHousehold } from './HouseholdProvider';
import { supabase } from './supabase';

export function useBabysitterSession() {
  const { member } = useHousehold();
  const [session, setSession] = useState<BabysitterSession | null>(null);
  const [unlocked, setUnlocked] = useState<Set<BabysitterUnlockItem>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!member) return;
    setIsLoading(true);
    const { data: sessionRow } = await supabase
      .from('babysitter_sessions')
      .select('*')
      .eq('member_id', member.id)
      .eq('status', 'active')
      .maybeSingle();
    setSession((sessionRow as BabysitterSession) ?? null);

    if (sessionRow) {
      const { data: unlockRows } = await supabase.from('babysitter_unlocks').select('item').eq('session_id', sessionRow.id);
      setUnlocked(new Set((unlockRows ?? []).map((u) => u.item as BabysitterUnlockItem)));
    }
    setIsLoading(false);
  }, [member]);

  useEffect(() => {
    load();
  }, [load]);

  const clockOut = useCallback(async () => {
    if (!session) return;
    await supabase.from('babysitter_sessions').update({ status: 'completed', clocked_out_at: new Date().toISOString() }).eq('id', session.id);
    load();
  }, [session, load]);

  return { session, unlocked, isLoading, refresh: load, clockOut };
}
