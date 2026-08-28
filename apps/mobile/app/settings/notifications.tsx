import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Switch, TextInput } from 'react-native';
import { useHousehold } from '@/lib/HouseholdProvider';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme/colors';

interface Prefs {
  push_enabled: boolean;
  sms_enabled: boolean;
  email_enabled: boolean;
  phone_number: string | null;
  email: string | null;
}

const DEFAULT_PREFS: Prefs = { push_enabled: true, sms_enabled: false, email_enabled: false, phone_number: null, email: null };

/** Reminders via push, text, and email — per-member preference, set during onboarding and editable here. */
export default function Notifications() {
  const { household, member } = useHousehold();
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);

  useEffect(() => {
    if (!member) return;
    supabase
      .from('notification_preferences')
      .select('*')
      .eq('member_id', member.id)
      .maybeSingle()
      .then(({ data }) => data && setPrefs(data as Prefs));
  }, [member]);

  const update = async (patch: Partial<Prefs>) => {
    if (!household || !member) return;
    const next = { ...prefs, ...patch };
    setPrefs(next);
    await supabase.from('notification_preferences').upsert({ member_id: member.id, household_id: household.id, ...next });
  };

  return (
    <View style={styles.container}>
      <Row label="Push notifications" value={prefs.push_enabled} onChange={(v) => update({ push_enabled: v })} />
      <Row label="Text messages (SMS)" value={prefs.sms_enabled} onChange={(v) => update({ sms_enabled: v })} />
      {prefs.sms_enabled && (
        <TextInput
          style={styles.input}
          placeholder="Phone number"
          placeholderTextColor={colors.dark.textSecondary}
          value={prefs.phone_number ?? ''}
          onChangeText={(v) => update({ phone_number: v })}
          keyboardType="phone-pad"
        />
      )}
      <Row label="Email" value={prefs.email_enabled} onChange={(v) => update({ email_enabled: v })} />
      {prefs.email_enabled && (
        <TextInput
          style={styles.input}
          placeholder="Email address"
          placeholderTextColor={colors.dark.textSecondary}
          value={prefs.email ?? ''}
          onChangeText={(v) => update({ email: v })}
          autoCapitalize="none"
          keyboardType="email-address"
        />
      )}
    </View>
  );
}

function Row({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.dark.accent }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.background, padding: 20 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderTopWidth: 1, borderTopColor: colors.dark.border },
  rowLabel: { color: colors.dark.textPrimary, fontSize: 15 },
  input: {
    backgroundColor: colors.dark.surface,
    borderColor: colors.dark.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.dark.textPrimary,
    marginBottom: 8,
  },
});
