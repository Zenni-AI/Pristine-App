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
      // .limit(1) before .maybeSingle() matters: without it, a user with
      // more than one active household_members row (e.g. from retrying
      // "Create household" after what looked like a failure) makes
      // .maybeSingle() error out on "multiple rows returned" — which,
      // destructured as just `{ data }` here, silently discards the error
      // and leaves memberRow null, bouncing the user back to /join forever
      // even though they do have a household. Picking the oldest one keeps
      // behavior stable across repeated calls.
      const { data: memberRows } = await supabase
        .from('household_members')
        .select('*')
        .eq('user_id', data.session.user.id)
        .eq('is_active', true)
        .order('joined_at', { ascending: true })
        .limit(1);
      const memberRow = memberRows?.[0] ?? null;
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
