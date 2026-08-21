import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Modal, TextInput, ScrollView } from 'react-native';
import type { DomoTask } from '@domo/shared';
import { useHousehold } from '@/lib/HouseholdProvider';
import { useHouseholdMembers } from '@/lib/useHouseholdMembers';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme/colors';

const STATUS_LABEL: Record<DomoTask['status'], string> = {
  assigned: 'To do',
  submitted: 'Waiting on approval',
  approved: 'Done ✅',
  rejected: 'Needs redo',
  overdue: 'Overdue',
};

export default function Tasks() {
  const { household, member, capabilities } = useHousehold();
  const { members } = useHouseholdMembers(household?.id);
  const [tasks, setTasks] = useState<DomoTask[]>([]);
  const [assignOpen, setAssignOpen] = useState(false);

  const loadTasks = useCallback(async () => {
    if (!household || !member) return;
    let query = supabase.from('tasks').select('*').eq('household_id', household.id).order('due_at', { ascending: true });
    if (!capabilities?.fullVisibility) {
      query = query.eq('assigned_to', member.id);
    }
    const { data } = await query;
    setTasks((data as DomoTask[]) ?? []);
  }, [household, member, capabilities]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const submitTask = async (taskId: string) => {
    await supabase.rpc('fn_submit_task', { p_task_id: taskId });
    loadTasks();
  };

  const decideTask = async (task: DomoTask, approve: boolean) => {
    await supabase
      .from('tasks')
      .update({ status: approve ? 'approved' : 'rejected', reviewed_by: member?.id, reviewed_at: new Date().toISOString() })
      .eq('id', task.id);
    loadTasks();
  };

  const memberName = (id: string) => members.find((m) => m.id === id)?.display_name ?? '—';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{capabilities?.fullVisibility ? 'Chores & Tasks' : 'My Tasks'}</Text>
        {capabilities?.canAssignTasks && (
          <Pressable style={styles.addButton} onPress={() => setAssignOpen(true)}>
            <Text style={styles.addButtonText}>+ Assign</Text>
          </Pressable>
        )}
      </View>

      <FlatList
        data={tasks}
        keyExtractor={(t) => t.id}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        ListEmptyComponent={<Text style={styles.emptyText}>No tasks yet.</Text>}
        renderItem={({ item }) => (
          <View style={styles.taskCard}>
            <View style={styles.taskCardHeader}>
              <Text style={styles.taskTitle}>{item.title}</Text>
              <Text style={styles.taskPoints}>+{item.points} pts</Text>
            </View>
            {capabilities?.fullVisibility && <Text style={styles.taskAssignee}>Assigned to {memberName(item.assigned_to)}</Text>}
            {item.description && <Text style={styles.taskDescription}>{item.description}</Text>}
            <Text style={styles.taskStatus}>{STATUS_LABEL[item.status]}</Text>

            {item.status === 'assigned' && item.assigned_to === member?.id && (
              <Pressable style={styles.actionButton} onPress={() => submitTask(item.id)}>
                <Text style={styles.actionButtonText}>Mark complete</Text>
              </Pressable>
            )}

            {capabilities?.canApproveTasks && item.status === 'submitted' && (
              <View style={styles.approveRow}>
                <Pressable style={[styles.actionButton, styles.approveButton]} onPress={() => decideTask(item, true)}>
                  <Text style={styles.actionButtonText}>Approve</Text>
                </Pressable>
                <Pressable style={[styles.actionButton, styles.rejectButton]} onPress={() => decideTask(item, false)}>
                  <Text style={styles.actionButtonText}>Send back</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}
      />

      {capabilities?.canAssignTasks && (
        <AssignTaskModal
          visible={assignOpen}
          onClose={() => setAssignOpen(false)}
          onCreated={() => {
            setAssignOpen(false);
            loadTasks();
          }}
        />
      )}
    </View>
  );
}

function AssignTaskModal({ visible, onClose, onCreated }: { visible: boolean; onClose: () => void; onCreated: () => void }) {
  const { household, member } = useHousehold();
  const { members } = useHouseholdMembers(household?.id);
  const [title, setTitle] = useState('');
  const [points, setPoints] = useState('5');
  const [assignedTo, setAssignedTo] = useState<string | null>(null);

  const submit = async () => {
    if (!household || !member || !title.trim() || !assignedTo) return;
    await supabase.from('tasks').insert({
      household_id: household.id,
      assigned_to: assignedTo,
      assigned_by: member.id,
      title: title.trim(),
      points: Number(points) || 0,
    });
    setTitle('');
    setPoints('5');
    setAssignedTo(null);
    onCreated();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Assign a task</Text>
          <TextInput style={styles.input} placeholder="e.g. Take out trash" placeholderTextColor={colors.dark.textSecondary} value={title} onChangeText={setTitle} />
          <TextInput style={styles.input} placeholder="Points" placeholderTextColor={colors.dark.textSecondary} value={points} onChangeText={setPoints} keyboardType="number-pad" />
          <ScrollView horizontal contentContainerStyle={{ gap: 8, paddingVertical: 8 }}>
            {members.map((m) => (
              <Pressable key={m.id} style={[styles.memberChip, assignedTo === m.id && styles.memberChipActive]} onPress={() => setAssignedTo(m.id)}>
                <Text style={[styles.memberChipText, assignedTo === m.id && styles.memberChipTextActive]}>{m.display_name}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <View style={styles.modalActions}>
            <Pressable style={styles.modalCancelButton} onPress={onClose}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.actionButton} onPress={submit} disabled={!title.trim() || !assignedTo}>
              <Text style={styles.actionButtonText}>Assign</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.background },
  header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { color: colors.dark.textPrimary, fontSize: 20, fontWeight: '700' },
  addButton: { backgroundColor: colors.dark.accent, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  addButtonText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  emptyText: { color: colors.dark.textSecondary, textAlign: 'center', marginTop: 40 },
  taskCard: { backgroundColor: colors.dark.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: colors.dark.border },
  taskCardHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  taskTitle: { color: colors.dark.textPrimary, fontSize: 15, fontWeight: '600', flex: 1 },
  taskPoints: { color: colors.dark.accentGlow, fontWeight: '700' },
  taskAssignee: { color: colors.dark.textSecondary, fontSize: 12, marginTop: 4 },
  taskDescription: { color: colors.dark.textSecondary, fontSize: 13, marginTop: 4 },
  taskStatus: { color: colors.dark.warning, fontSize: 12, fontWeight: '600', marginTop: 8 },
  actionButton: { backgroundColor: colors.dark.accent, borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginTop: 10 },
  actionButtonText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  approveRow: { flexDirection: 'row', gap: 10 },
  approveButton: { flex: 1, backgroundColor: colors.dark.success },
  rejectButton: { flex: 1, backgroundColor: colors.dark.danger },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: colors.dark.surfaceRaised, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  modalTitle: { color: colors.dark.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 16 },
  input: {
    backgroundColor: colors.dark.surface,
    borderColor: colors.dark.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.dark.textPrimary,
    marginBottom: 10,
  },
  memberChip: { borderWidth: 1, borderColor: colors.dark.border, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  memberChipActive: { backgroundColor: colors.dark.accent, borderColor: colors.dark.accent },
  memberChipText: { color: colors.dark.textSecondary, fontSize: 13 },
  memberChipTextActive: { color: '#fff', fontWeight: '600' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 12, marginBottom: 20 },
  modalCancelButton: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  modalCancelText: { color: colors.dark.textSecondary },
});
