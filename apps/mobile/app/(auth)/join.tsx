import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import type { MemberRole } from '@motherboard/shared';
import { supabase } from '@/lib/supabase';
import { useHousehold } from '@/lib/HouseholdProvider';
import { colors } from '@/theme/colors';

type Mode = 'create' | 'join';

const JOINABLE_ROLES: { role: MemberRole; label: string }[] = [
  { role: 'second_admin', label: 'Second Admin (spouse/partner)' },
  { role: 'adult_member', label: 'Adult Member (view-only)' },
  { role: 'kid', label: 'Kid' },
];

/**
 * Reached when a signed-in user has no household_members row yet: either
 * they're starting a brand new household (becomes primary_admin) or joining
 * one an admin already created (invite code, from Settings > Invite).
 * Babysitters aren't provisioned here — see docs/ARCHITECTURE.md: an admin
 * creates the babysitter's temporary login directly from Babysitter Mode.
 */
export default function Join() {
  const [mode, setMode] = useState<Mode>('create');
  const [displayName, setDisplayName] = useState('');
  const [householdName, setHouseholdName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [role, setRole] = useState<MemberRole>('adult_member');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { refresh } = useHousehold();

  const handleCreate = async () => {
    setError(null);
    setSubmitting(true);
    const { error: rpcError } = await supabase.rpc('fn_create_household', {
      p_name: householdName.trim() || 'My Household',
      p_display_name: displayName.trim() || 'Admin',
    });
    setSubmitting(false);
    if (rpcError) return setError(rpcError.message);
    await refresh();
    router.replace('/');
  };

  const handleJoin = async () => {
    setError(null);
    setSubmitting(true);
    const { error: rpcError } = await supabase.rpc('fn_join_household', {
      p_invite_code: inviteCode.trim().toUpperCase(),
      p_role: role,
      p_display_name: displayName.trim() || 'Member',
    });
    setSubmitting(false);
    if (rpcError) return setError(rpcError.message);
    await refresh();
    router.replace('/');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 24, paddingTop: 80 }}>
      <Text style={styles.title}>{mode === 'create' ? 'Start your household' : 'Join a household'}</Text>

      <View style={styles.toggleRow}>
        <Pressable style={[styles.toggleButton, mode === 'create' && styles.toggleButtonActive]} onPress={() => setMode('create')}>
          <Text style={[styles.toggleText, mode === 'create' && styles.toggleTextActive]}>New household</Text>
        </Pressable>
        <Pressable style={[styles.toggleButton, mode === 'join' && styles.toggleButtonActive]} onPress={() => setMode('join')}>
          <Text style={[styles.toggleText, mode === 'join' && styles.toggleTextActive]}>I have a code</Text>
        </Pressable>
      </View>

      <Text style={styles.label}>Your name</Text>
      <TextInput style={styles.input} value={displayName} onChangeText={setDisplayName} placeholder="Jamie" placeholderTextColor={colors.dark.textSecondary} />

      {mode === 'create' ? (
        <>
          <Text style={styles.label}>Household name</Text>
          <TextInput
            style={styles.input}
            value={householdName}
            onChangeText={setHouseholdName}
            placeholder="The Smith Family"
            placeholderTextColor={colors.dark.textSecondary}
          />
          <Text style={styles.hint}>You'll be the Primary Admin — full control of Motherboard for your family.</Text>
        </>
      ) : (
        <>
          <Text style={styles.label}>Invite code</Text>
          <TextInput
            style={styles.input}
            value={inviteCode}
            onChangeText={setInviteCode}
            placeholder="8-character code"
            placeholderTextColor={colors.dark.textSecondary}
            autoCapitalize="characters"
          />
          <Text style={styles.label}>Your role</Text>
          <View style={styles.roleList}>
            {JOINABLE_ROLES.map((r) => (
              <Pressable key={r.role} style={[styles.roleOption, role === r.role && styles.roleOptionActive]} onPress={() => setRole(r.role)}>
                <Text style={[styles.roleOptionText, role === r.role && styles.roleOptionTextActive]}>{r.label}</Text>
              </Pressable>
            ))}
          </View>
        </>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        style={styles.primaryButton}
        onPress={mode === 'create' ? handleCreate : handleJoin}
        disabled={submitting || (mode === 'join' && inviteCode.trim().length < 4)}
      >
        <Text style={styles.primaryButtonText}>{submitting ? 'Please wait…' : mode === 'create' ? 'Create household' : 'Join household'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.background },
  title: { fontSize: 24, fontWeight: '700', color: colors.dark.textPrimary, marginBottom: 20 },
  toggleRow: { flexDirection: 'row', backgroundColor: colors.dark.surface, borderRadius: 12, padding: 4, marginBottom: 24 },
  toggleButton: { flex: 1, paddingVertical: 10, borderRadius: 9, alignItems: 'center' },
  toggleButtonActive: { backgroundColor: colors.dark.accent },
  toggleText: { color: colors.dark.textSecondary, fontWeight: '600', fontSize: 13 },
  toggleTextActive: { color: '#fff' },
  label: { color: colors.dark.textSecondary, marginBottom: 8, marginTop: 16, fontSize: 13 },
  input: {
    backgroundColor: colors.dark.surface,
    borderColor: colors.dark.border,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.dark.textPrimary,
    fontSize: 16,
  },
  hint: { color: colors.dark.textSecondary, fontSize: 12, marginTop: 8 },
  roleList: { gap: 8 },
  roleOption: { borderWidth: 1, borderColor: colors.dark.border, borderRadius: 12, padding: 14, backgroundColor: colors.dark.surface },
  roleOptionActive: { borderColor: colors.dark.accent, backgroundColor: colors.dark.surfaceRaised },
  roleOptionText: { color: colors.dark.textSecondary, fontSize: 14 },
  roleOptionTextActive: { color: colors.dark.textPrimary, fontWeight: '600' },
  error: { color: colors.dark.danger, marginTop: 12, fontSize: 13 },
  primaryButton: { backgroundColor: colors.dark.accent, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 24, marginBottom: 40 },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
