import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';
import type { DomoTask, MealPlanEntry, ProactiveNudge } from '@domo/shared';
import { useHousehold } from '@/lib/HouseholdProvider';
import { supabase } from '@/lib/supabase';
import { SectionCard } from '@/components/SectionCard';
import { SosButton } from '@/components/SosButton';
import { colors } from '@/theme/colors';

export default function Dashboard() {
  const { household, member, role, capabilities, isYoungKidUi } = useHousehold();
  const [myTasks, setMyTasks] = useState<DomoTask[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<DomoTask[]>([]);
  const [tonightsDinner, setTonightsDinner] = useState<MealPlanEntry | null>(null);
  const [nudges, setNudges] = useState<ProactiveNudge[]>([]);

  useEffect(() => {
    if (!household || !member) return;

    supabase
      .from('tasks')
      .select('*')
      .eq('household_id', household.id)
      .eq('assigned_to', member.id)
      .in('status', ['assigned', 'rejected'])
      .order('due_at', { ascending: true })
      .then(({ data }) => setMyTasks((data as DomoTask[]) ?? []));

    if (capabilities?.canApproveTasks) {
      supabase
        .from('tasks')
        .select('*')
        .eq('household_id', household.id)
        .eq('status', 'submitted')
        .then(({ data }) => setPendingApprovals((data as DomoTask[]) ?? []));
    }

    const today = new Date().toISOString().slice(0, 10);
    supabase
      .from('meal_plan_entries')
      .select('*')
      .eq('household_id', household.id)
      .eq('meal_date', today)
      .eq('meal_type', 'dinner')
      .maybeSingle()
      .then(({ data }) => setTonightsDinner((data as MealPlanEntry) ?? null));

    supabase
      .from('proactive_nudges')
      .select('*')
      .eq('household_id', household.id)
      .in('status', ['pending', 'sent'])
      .or(`target_member_id.eq.${member.id},target_member_id.is.null`)
      .order('scheduled_for', { ascending: true })
      .limit(5)
      .then(({ data }) => setNudges((data as ProactiveNudge[]) ?? []));
  }, [household, member, capabilities]);

  if (!household || !member) return null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, paddingTop: 60, paddingBottom: 40 }}>
      <Text style={styles.greeting}>Hey {member.display_name.split(' ')[0]} 👋</Text>
      <Text style={styles.subGreeting}>{household.name}</Text>

      {/* Proactive AI butler nudges — the anticipatory layer */}
      {nudges.length > 0 && (
        <SectionCard title="Domo noticed">
          {nudges.map((n) => (
            <View key={n.id} style={styles.nudgeRow}>
              <Text style={styles.nudgeText}>💡 {n.message}</Text>
            </View>
          ))}
        </SectionCard>
      )}

      {capabilities?.canApproveTasks && pendingApprovals.length > 0 && (
        <SectionCard title={`Waiting on your approval (${pendingApprovals.length})`}>
          {pendingApprovals.map((t) => (
            <Pressable key={t.id} style={styles.taskRow} onPress={() => router.push('/(tabs)/tasks')}>
              <Text style={styles.taskTitle}>{t.title}</Text>
              <Text style={styles.taskMeta}>+{t.points} pts</Text>
            </Pressable>
          ))}
        </SectionCard>
      )}

      <SectionCard title={isYoungKidUi ? 'My jobs today' : 'Your tasks'}>
        {myTasks.length === 0 ? (
          <Text style={styles.emptyText}>Nothing due — nice work!</Text>
        ) : (
          myTasks.map((t) => (
            <Pressable key={t.id} style={styles.taskRow} onPress={() => router.push('/(tabs)/tasks')}>
              <Text style={styles.taskTitle}>{t.title}</Text>
              <Text style={styles.taskMeta}>+{t.points} pts</Text>
            </Pressable>
          ))
        )}
      </SectionCard>

      <SectionCard title="Tonight's dinner">
        <Text style={styles.dinnerText}>{tonightsDinner ? tonightsDinner.title : 'Not planned yet'}</Text>
      </SectionCard>

      {member.points > 0 && (
        <SectionCard title="Your points">
          <Text style={styles.pointsText}>⭐ {member.points} points</Text>
        </SectionCard>
      )}

      <View style={styles.sosWrap}>
        <SosButton />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.background },
  greeting: { fontSize: 26, fontWeight: '700', color: colors.dark.textPrimary },
  subGreeting: { fontSize: 14, color: colors.dark.textSecondary, marginBottom: 24 },
  nudgeRow: { paddingVertical: 6 },
  nudgeText: { color: colors.dark.textPrimary, fontSize: 14, lineHeight: 20 },
  taskRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.dark.border },
  taskTitle: { color: colors.dark.textPrimary, fontSize: 14 },
  taskMeta: { color: colors.dark.accentGlow, fontSize: 13, fontWeight: '600' },
  emptyText: { color: colors.dark.textSecondary, fontSize: 14 },
  dinnerText: { color: colors.dark.textPrimary, fontSize: 15 },
  pointsText: { color: colors.dark.warning, fontSize: 18, fontWeight: '700' },
  sosWrap: { alignItems: 'center', marginTop: 12 },
});
