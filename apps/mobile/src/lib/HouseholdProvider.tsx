import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  getCapabilities,
  isYoungKid,
  type HouseholdMember,
  type Household,
  type MemberRole,
  type RoleCapabilities,
} from '@motherboard/shared';
import { supabase } from './supabase';
import { useAuth } from './AuthProvider';

interface HouseholdContextValue {
  household: Household | null;
  member: HouseholdMember | null;
  role: MemberRole | null;
  capabilities: RoleCapabilities | null;
  isYoungKidUi: boolean;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

const HouseholdContext = createContext<HouseholdContextValue | undefined>(undefined);

/**
 * Loads the signed-in user's household_members row — the single source of
 * truth for "which experience does this person see." Every screen reads
 * `role` / `capabilities` from here rather than re-querying, so the whole
 * app stays in sync with one fetch per session.
 */
export function HouseholdProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [household, setHousehold] = useState<Household | null>(null);
  const [member, setMember] = useState<HouseholdMember | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!session?.user) {
      setHousehold(null);
      setMember(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const { data: memberRow } = await supabase
      .from('household_members')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (memberRow) {
      setMember(memberRow as HouseholdMember);
      const { data: householdRow } = await supabase
        .from('households')
        .select('*')
        .eq('id', memberRow.household_id)
        .maybeSingle();
      setHousehold((householdRow as Household) ?? null);
    } else {
      setMember(null);
      setHousehold(null);
    }
    setIsLoading(false);
  }, [session?.user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo<HouseholdContextValue>(() => {
    const role = member?.role ?? null;
    return {
      household,
      member,
      role,
      capabilities: role ? getCapabilities(role) : null,
      isYoungKidUi: role ? isYoungKid(role, member?.birthdate) : false,
      isLoading,
      refresh,
    };
  }, [household, member, isLoading, refresh]);

  return <HouseholdContext.Provider value={value}>{children}</HouseholdContext.Provider>;
}

export function useHousehold(): HouseholdContextValue {
  const ctx = useContext(HouseholdContext);
  if (!ctx) throw new Error('useHousehold must be used within HouseholdProvider');
  return ctx;
}
