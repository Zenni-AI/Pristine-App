'use client';

import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { getCapabilities, type Household, type HouseholdMember, type MemberRole, type RoleCapabilities } from '@motherboard/shared';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

interface AppContextValue {
  supabase: SupabaseClient;
  session: Session | null;
  household: Household | null;
  member: HouseholdMember | null;
  role: MemberRole | null;
  capabilities: RoleCapabilities | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

/**
 * Web mirror of the mobile app's AuthProvider + HouseholdProvider, combined
 * into one context since Next.js Server Components already handle the
 * initial auth check (see middleware.ts) — the client only needs live state
 * for realtime UI updates.
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
  const [supabase] = useState(() => createSupabaseBrowserClient());
  const [session, setSession] = useState<Session | null>(null);
  const [household, setHousehold] = useState<Household | null>(null);
  const [member, setMember] = useState<HouseholdMember | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    const { data } = await supabase.auth.getSession();
    setSession(data.session);

    if (data.session?.user) {
      const { data: memberRow } = await supabase
        .from('household_members')
        .select('*')
        .eq('user_id', data.session.user.id)
        .eq('is_active', true)
        .maybeSingle();
      setMember((memberRow as HouseholdMember) ?? null);

      if (memberRow) {
        const { data: householdRow } = await supabase.from('households').select('*').eq('id', memberRow.household_id).maybeSingle();
        setHousehold((householdRow as Household) ?? null);
      }
    } else {
      setMember(null);
      setHousehold(null);
    }
    setIsLoading(false);
  }, [supabase]);

  useEffect(() => {
    refresh();
    const { data: listener } = supabase.auth.onAuthStateChange(() => refresh());
    return () => listener.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<AppContextValue>(() => {
    const role = member?.role ?? null;
    return {
      supabase,
      session,
      household,
      member,
      role,
      capabilities: role ? getCapabilities(role) : null,
      isLoading,
      refresh,
    };
  }, [supabase, session, household, member, isLoading, refresh]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProviders');
  return ctx;
}
