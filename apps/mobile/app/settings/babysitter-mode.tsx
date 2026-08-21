import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Switch, Alert } from 'react-native';
import { BABYSITTER_UNLOCK_ITEMS, BABYSITTER_UNLOCK_LABELS, type BabysitterUnlockItem, type HouseholdMember, type BabysitterSession } from '@domo/shared';
import { useHousehold } from '@/lib/HouseholdProvider';
import { useHouseholdMembers } from '@/lib/useHouseholdMembers';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme/colors';

/**
 * Admin control panel for a babysitter session. Nothing is visible to the
 * sitter by default — every item in BABYSITTER_UNLOCK_ITEMS must be
 * explicitly toggled on here, which writes a babysitter_unlocks row (RLS in
 * 0001_core.sql only grants the sitter read access to unlocked items).
 */
export default function BabysitterMode() {
  const { household, member } = useHousehold();
  const { members: kids } = useHouseholdMembers(household?.id);
  const [sitterName, setSitterName] = useState('');
  const [sitterEmail, setSitterEmail] = useState('');
  const [selectedKids, setSelectedKids] = useState<Set<string>>(new Set());
  const [unlocks, setUnlocks] = useState<Set<BabysitterUnlockItem>>(new Set());
  const [activeSession, setActiveSession] = useState<(BabysitterSession & { member?: HouseholdMember }) | null>(null);
  const [creating, setCreating] = useState(false);

  const loadActiveSession = useCallback(async () => {
    if (!household) return;
    const { data } = await supabase
      .from('babysitter_sessions')
      .select('*')
      .eq('household_id', household.id)
      .in('status', ['scheduled', 'active'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    setActiveSession((data as BabysitterSession) ?? null);
  }, [household]);

  useEffect(() => {
    loadActiveSession();
  }, [loadActiveSession]);

  const toggleKid = (id: string) => {
    setSelectedKids((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleUnlock = (item: BabysitterUnlockItem) => {
    setUnlocks((prev) => {
      const next = new Set(prev);
      next.has(item) ? next.delete(item) : next.add(item);
      return next;
    });
  };

  const startSession = async () => {
    if (!household || !member || !sitterName.trim()) return;
    setCreating(true);
    try {
      // Provision the babysitter's temporary household_members row + auth
      // invite. Actual auth user creation happens server-side (edge
      // function `provision-babysitter`) using the service role, since
      // inviting-by-email requires elevated privileges the client doesn't have.
      const { data: fn, error: fnError } = await supabase.functions.invoke('provision-babysitter', {
        body: { householdId: household.id, displayName: sitterName.trim(), email: sitterEmail.trim() || null },
      });
      if (fnError) throw fnError;
      const sitterMemberId = fn?.memberId as string;

      const { data: session, error: sessionError } = await supabase
        .from('babysitter_sessions')
        .insert({
          household_id: household.id,
          member_id: sitterMemberId,
          created_by: member.id,
          care_kids: Array.from(selectedKids),
          status: 'active',
          clocked_in_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (sessionError) throw sessionError;

      for (const item of unlocks) {
        await supabase.from('babysitter_unlocks').insert({ session_id: session.id, item, unlocked_by: member.id });
      }

      setSitterName('');
      setSitterEmail('');
      setSelectedKids(new Set());
      setUnlocks(new Set());
      loadActiveSession();
      Alert.alert('Session started', `${sitterName} can now sign in with the code sent to them.`);
    } catch (e: any) {
      Alert.alert('Could not start session', e?.message ?? 'Unknown error');
    } finally {
      setCreating(false);
    }
  };

  const endSession = async () => {
    if (!activeSession) return;
    await supabase
      .from('babysitter_sessions')
      .update({ status: 'completed', clocked_out_at: new Date().toISOString() })
      .eq('id', activeSession.id);
    loadActiveSession();
  };

  if (activeSession) {
    return (
      <View style={styles.container}>
        <View style={{ padding: 20 }}>
          <Text style={styles.title}>Session in progress</Text>
          <Text style={styles.subtitle}>Started {new Date(activeSession.starts_at).toLocaleString()}</Text>
          <Pressable style={styles.dangerButton} onPress={endSession}>
            <Text style={styles.primaryButtonText}>End session & clock out</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
      <Text style={styles.label}>Sitter's name</Text>
      <TextInput style={styles.input} value={sitterName} onChangeText={setSitterName} placeholder="Sarah" placeholderTextColor={colors.dark.textSecondary} />

      <Text style={styles.label}>Sitter's email (optional, for invite)</Text>
      <TextInput
        style={styles.input}
        value={sitterEmail}
        onChangeText={setSitterEmail}
        placeholder="sarah@example.com"
        placeholderTextColor={colors.dark.textSecondary}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <Text style={styles.label}>Kids they're watching</Text>
      <View style={styles.chipRow}>
        {kids
          .filter((k) => k.role === 'kid')
          .map((k) => (
            <Pressable key={k.id} style={[styles.chip, selectedKids.has(k.id) && styles.chipActive]} onPress={() => toggleKid(k.id)}>
              <Text style={[styles.chipText, selectedKids.has(k.id) && styles.chipTextActive]}>{k.display_name}</Text>
            </Pressable>
          ))}
      </View>

      <Text style={styles.label}>What can they see? Nothing is visible unless unlocked.</Text>
      {BABYSITTER_UNLOCK_ITEMS.map((item) => (
        <View key={item} style={styles.unlockRow}>
          <Text style={styles.unlockLabel}>{BABYSITTER_UNLOCK_LABELS[item]}</Text>
          <Switch value={unlocks.has(item)} onValueChange={() => toggleUnlock(item)} trackColor={{ true: colors.dark.accent }} />
        </View>
      ))}

      <Pressable style={styles.primaryButton} onPress={startSession} disabled={creating || !sitterName.trim()}>
        <Text style={styles.primaryButtonText}>{creating ? 'Starting…' : 'Start session & clock in'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.background },
  title: { color: colors.dark.textPrimary, fontSize: 20, fontWeight: '700' },
  subtitle: { color: colors.dark.textSecondary, fontSize: 13, marginTop: 4, marginBottom: 20 },
  label: { color: colors.dark.textSecondary, fontSize: 13, marginTop: 18, marginBottom: 8 },
  input: {
    backgroundColor: colors.dark.surface,
    borderColor: colors.dark.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.dark.textPrimary,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: colors.dark.border, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  chipActive: { backgroundColor: colors.dark.accent, borderColor: colors.dark.accent },
  chipText: { color: colors.dark.textSecondary, fontSize: 13 },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  unlockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.dark.border,
  },
  unlockLabel: { color: colors.dark.textPrimary, fontSize: 13, flex: 1, marginRight: 10 },
  primaryButton: { backgroundColor: colors.dark.accent, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 28 },
  dangerButton: { backgroundColor: colors.dark.danger, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 12 },
  primaryButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
