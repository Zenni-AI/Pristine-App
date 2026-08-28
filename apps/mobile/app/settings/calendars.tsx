import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import type { CalendarConnection } from '@motherboard/shared';
import { useHousehold } from '@/lib/HouseholdProvider';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme/colors';

const PROVIDERS: { id: 'google' | 'outlook' | 'apple'; label: string }[] = [
  { id: 'google', label: 'Google Calendar' },
  { id: 'outlook', label: 'Outlook' },
  { id: 'apple', label: 'Apple Calendar' },
];

/**
 * Two-way calendar sync. Connecting kicks off an OAuth flow (Google/Outlook)
 * handled by the `calendar-oauth-start` edge function, which redirects back
 * into the app via the `motherboard://auth-callback` deep link registered in
 * app.json; Apple Calendar uses device-native EventKit instead of OAuth.
 */
export default function Calendars() {
  const { household, member } = useHousehold();
  const [connections, setConnections] = useState<CalendarConnection[]>([]);

  useEffect(() => {
    if (!member) return;
    supabase
      .from('calendar_connections')
      .select('*')
      .eq('member_id', member.id)
      .then(({ data }) => setConnections((data as CalendarConnection[]) ?? []));
  }, [member]);

  const connect = async (provider: 'google' | 'outlook' | 'apple') => {
    if (!household || !member) return;
    const { data } = await supabase.functions.invoke('calendar-oauth-start', {
      body: { householdId: household.id, memberId: member.id, provider },
    });
    // In production: Linking.openURL(data.authUrl) to start the OAuth dance.
    console.log('OAuth start URL (stub):', data?.authUrl);
  };

  const isConnected = (provider: string) => connections.some((c) => c.provider === provider && c.sync_enabled);

  return (
    <View style={styles.container}>
      {PROVIDERS.map((p) => (
        <View key={p.id} style={styles.row}>
          <Text style={styles.label}>{p.label}</Text>
          <Pressable style={[styles.button, isConnected(p.id) && styles.buttonConnected]} onPress={() => connect(p.id)}>
            <Text style={styles.buttonText}>{isConnected(p.id) ? 'Connected' : 'Connect'}</Text>
          </Pressable>
        </View>
      ))}
      <Text style={styles.hint}>Events sync both ways — anything added in Motherboard shows up in your calendar and vice versa.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.background, padding: 20 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderTopWidth: 1, borderTopColor: colors.dark.border },
  label: { color: colors.dark.textPrimary, fontSize: 15 },
  button: { borderWidth: 1, borderColor: colors.dark.accent, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  buttonConnected: { backgroundColor: colors.dark.accent },
  buttonText: { color: colors.dark.textPrimary, fontSize: 13, fontWeight: '600' },
  hint: { color: colors.dark.textSecondary, fontSize: 12, marginTop: 20 },
});
