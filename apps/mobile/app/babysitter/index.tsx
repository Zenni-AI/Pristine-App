import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { router } from 'expo-router';
import { BABYSITTER_UNLOCK_LABELS } from '@domo/shared';
import { useBabysitterSession } from '@/lib/useBabysitterSession';
import { useAuth } from '@/lib/AuthProvider';
import { SectionCard } from '@/components/SectionCard';
import { SosButton } from '@/components/SosButton';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme/colors';

const CARE_TASKS = ['Fed', 'Bathed', 'In bed'];

/**
 * Babysitter's whole experience. Nothing renders unless it appears in
 * `unlocked` — that set is populated purely from babysitter_unlocks rows the
 * admin explicitly created, so a locked item is not just visually hidden,
 * it's never fetched.
 */
export default function BabysitterHome() {
  const { session, unlocked, isLoading, clockOut } = useBabysitterSession();
  const { signOut } = useAuth();

  const markCareTask = async (task: string) => {
    if (!session) return;
    // Logged as a system chat message in the babysitter thread; parents see
    // it live via fn_create_babysitter_thread's membership + realtime.
    const { data: thread } = await supabase.from('chat_threads').select('id').eq('babysitter_session_id', session.id).maybeSingle();
    if (thread) {
      await supabase.from('chat_messages').insert({ thread_id: thread.id, sender_member_id: null, kind: 'ai_update', body: `Kids: ${task} ✅` });
    }
  };

  if (isLoading) return null;

  if (!session) {
    return (
      <View style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.title}>No active session</Text>
          <Text style={styles.subtitle}>Your access will activate once an admin starts your babysitting session.</Text>
          <Pressable style={styles.signOutButton} onPress={signOut}>
            <Text style={styles.signOutText}>Sign out</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, paddingTop: 60, paddingBottom: 40 }}>
      <Text style={styles.title}>You're clocked in</Text>
      <Text style={styles.subtitle}>Since {session.clocked_in_at ? new Date(session.clocked_in_at).toLocaleTimeString() : '—'}</Text>

      <SectionCard title="Mark care tasks complete">
        <View style={styles.chipRow}>
          {CARE_TASKS.map((t) => (
            <Pressable key={t} style={styles.chip} onPress={() => markCareTask(t)}>
              <Text style={styles.chipText}>{t}</Text>
            </Pressable>
          ))}
        </View>
      </SectionCard>

      {unlocked.has('care_plan') && (
        <SectionCard title="Care plan">
          <Text style={styles.bodyText}>Allergies, medications, bedtime routine, and house rules will appear here.</Text>
        </SectionCard>
      )}
      {unlocked.has('emergency_contacts') && (
        <SectionCard title="Emergency contacts">
          <Text style={styles.bodyText}>Emergency contact list appears here.</Text>
        </SectionCard>
      )}
      {unlocked.has('dinner_instructions') && (
        <SectionCard title="Dinner instructions">
          <Text style={styles.bodyText}>Tonight's dinner instructions appear here.</Text>
        </SectionCard>
      )}
      {unlocked.has('wifi_and_door_codes') && (
        <SectionCard title="WiFi & door codes">
          <Text style={styles.bodyText}>WiFi password and door codes appear here.</Text>
        </SectionCard>
      )}
      {unlocked.has('schedule') && (
        <SectionCard title="Kids' schedule">
          <Text style={styles.bodyText}>Tonight's schedule appears here.</Text>
        </SectionCard>
      )}
      {unlocked.has('activity_details') && (
        <SectionCard title="Activity details">
          <Text style={styles.bodyText}>Field location, time, and what to bring appear here.</Text>
        </SectionCard>
      )}

      <SectionCard title="Locked for this session">
        {Object.entries(BABYSITTER_UNLOCK_LABELS)
          .filter(([key]) => !unlocked.has(key as any))
          .map(([key, label]) => (
            <Text key={key} style={styles.lockedText}>
              🔒 {label}
            </Text>
          ))}
      </SectionCard>

      <Pressable style={styles.chatButton} onPress={() => router.push('/babysitter/chat')}>
        <Text style={styles.chatButtonText}>Open babysitter chat</Text>
      </Pressable>

      <View style={styles.sosWrap}>
        <SosButton />
      </View>

      <Pressable style={styles.clockOutButton} onPress={clockOut}>
        <Text style={styles.clockOutText}>Clock out & end session</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { color: colors.dark.textPrimary, fontSize: 22, fontWeight: '700' },
  subtitle: { color: colors.dark.textSecondary, fontSize: 13, marginTop: 4, marginBottom: 20 },
  bodyText: { color: colors.dark.textPrimary, fontSize: 13, lineHeight: 19 },
  chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { backgroundColor: colors.dark.surfaceRaised, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: colors.dark.border },
  chipText: { color: colors.dark.textPrimary, fontSize: 13, fontWeight: '600' },
  lockedText: { color: colors.dark.textSecondary, fontSize: 13, paddingVertical: 4 },
  chatButton: { backgroundColor: colors.dark.surfaceRaised, borderRadius: 14, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: colors.dark.border, marginTop: 8 },
  chatButtonText: { color: colors.dark.textPrimary, fontWeight: '600' },
  sosWrap: { alignItems: 'center', marginTop: 20 },
  clockOutButton: { alignItems: 'center', marginTop: 24 },
  clockOutText: { color: colors.dark.danger, fontWeight: '600' },
  signOutButton: { marginTop: 20 },
  signOutText: { color: colors.dark.danger },
});
