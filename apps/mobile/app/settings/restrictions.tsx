import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, TextInput, Modal } from 'react-native';
import { useHousehold } from '@/lib/HouseholdProvider';
import { useHouseholdMembers } from '@/lib/useHouseholdMembers';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme/colors';

/** Per-kid quiet hours + screen time limits, set by admins. */
export default function Restrictions() {
  const { household } = useHousehold();
  const { members, isLoading } = useHouseholdMembers(household?.id);
  const kids = members.filter((m) => m.role === 'kid');
  const [editing, setEditing] = useState<string | null>(null);
  const [quietStart, setQuietStart] = useState('20:00');
  const [quietEnd, setQuietEnd] = useState('07:00');
  const [screenLimit, setScreenLimit] = useState('120');

  const openEdit = (kidId: string) => {
    const kid = kids.find((k) => k.id === kidId);
    setQuietStart(kid?.quiet_hours_start ?? '20:00');
    setQuietEnd(kid?.quiet_hours_end ?? '07:00');
    setScreenLimit(String(kid?.screen_time_limit_minutes ?? 120));
    setEditing(kidId);
  };

  const save = async () => {
    if (!editing) return;
    await supabase
      .from('household_members')
      .update({
        quiet_hours_start: quietStart,
        quiet_hours_end: quietEnd,
        screen_time_limit_minutes: Number(screenLimit) || null,
      })
      .eq('id', editing);
    setEditing(null);
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={kids}
        keyExtractor={(k) => k.id}
        contentContainerStyle={{ padding: 20, gap: 10 }}
        ListEmptyComponent={!isLoading ? <Text style={styles.emptyText}>No kid accounts yet.</Text> : null}
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => openEdit(item.id)}>
            <Text style={styles.name}>{item.display_name}</Text>
            <Text style={styles.meta}>
              {item.quiet_hours_start ? `Quiet ${item.quiet_hours_start}–${item.quiet_hours_end}` : 'No quiet hours set'}
            </Text>
          </Pressable>
        )}
      />

      <Modal visible={!!editing} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Restrictions</Text>
            <Text style={styles.label}>Quiet hours start (chat muted after)</Text>
            <TextInput style={styles.input} value={quietStart} onChangeText={setQuietStart} placeholder="20:00" placeholderTextColor={colors.dark.textSecondary} />
            <Text style={styles.label}>Quiet hours end</Text>
            <TextInput style={styles.input} value={quietEnd} onChangeText={setQuietEnd} placeholder="07:00" placeholderTextColor={colors.dark.textSecondary} />
            <Text style={styles.label}>Screen time limit (minutes/day)</Text>
            <TextInput style={styles.input} value={screenLimit} onChangeText={setScreenLimit} keyboardType="number-pad" />
            <View style={styles.modalActions}>
              <Pressable style={styles.cancelButton} onPress={() => setEditing(null)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.saveButton} onPress={save}>
                <Text style={styles.saveText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.background },
  emptyText: { color: colors.dark.textSecondary, textAlign: 'center', marginTop: 40 },
  row: { backgroundColor: colors.dark.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.dark.border },
  name: { color: colors.dark.textPrimary, fontSize: 15, fontWeight: '600' },
  meta: { color: colors.dark.textSecondary, fontSize: 12, marginTop: 4 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: colors.dark.surfaceRaised, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  modalTitle: { color: colors.dark.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 12 },
  label: { color: colors.dark.textSecondary, fontSize: 12, marginTop: 12, marginBottom: 6 },
  input: {
    backgroundColor: colors.dark.surface,
    borderColor: colors.dark.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.dark.textPrimary,
  },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 20, marginBottom: 20 },
  cancelButton: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  cancelText: { color: colors.dark.textSecondary },
  saveButton: { flex: 1, backgroundColor: colors.dark.accent, borderRadius: 12, alignItems: 'center', paddingVertical: 12 },
  saveText: { color: '#fff', fontWeight: '700' },
});
