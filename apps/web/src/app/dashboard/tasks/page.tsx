'use client';

import { useCallback, useEffect, useState } from 'react';
import type { DomoTask, HouseholdMember } from '@domo/shared';
import { useApp } from '@/components/providers/AppProviders';

const STATUS_LABEL: Record<DomoTask['status'], string> = {
  assigned: 'To do',
  submitted: 'Waiting on approval',
  approved: 'Done ✅',
  rejected: 'Needs redo',
  overdue: 'Overdue',
};

export default function TasksPage() {
  const { supabase, household, member, capabilities } = useApp();
  const [tasks, setTasks] = useState<DomoTask[]>([]);
  const [members, setMembers] = useState<HouseholdMember[]>([]);

  const load = useCallback(async () => {
    if (!household || !member) return;
    let query = supabase.from('tasks').select('*').eq('household_id', household.id).order('due_at', { ascending: true });
    if (!capabilities?.fullVisibility) query = query.eq('assigned_to', member.id);
    const { data } = await query;
    setTasks((data as DomoTask[]) ?? []);

    if (capabilities?.fullVisibility) {
      const { data: memberRows } = await supabase.from('household_members').select('*').eq('household_id', household.id).eq('is_active', true);
      setMembers((memberRows as HouseholdMember[]) ?? []);
    }
  }, [supabase, household, member, capabilities]);

  useEffect(() => {
    load();
  }, [load]);

  const memberName = (id: string) => members.find((m) => m.id === id)?.display_name ?? '—';

  const submitTask = async (taskId: string) => {
    await supabase.rpc('fn_submit_task', { p_task_id: taskId });
    load();
  };

  const decideTask = async (task: DomoTask, approve: boolean) => {
    await supabase.from('tasks').update({ status: approve ? 'approved' : 'rejected', reviewed_by: member?.id, reviewed_at: new Date().toISOString() }).eq('id', task.id);
    load();
  };

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-2xl font-bold">{capabilities?.fullVisibility ? 'Chores & Tasks' : 'My Tasks'}</h1>
      <div className="flex flex-col gap-3">
        {tasks.length === 0 && <p className="text-textSecondary">No tasks yet.</p>}
        {tasks.map((t) => (
          <div key={t.id} className="rounded-2xl border border-border bg-surface p-4">
            <div className="flex justify-between">
              <span className="font-semibold">{t.title}</span>
              <span className="font-semibold text-accentGlow">+{t.points} pts</span>
            </div>
            {capabilities?.fullVisibility && <p className="mt-1 text-xs text-textSecondary">Assigned to {memberName(t.assigned_to)}</p>}
            <p className="mt-2 text-xs font-semibold text-warning">{STATUS_LABEL[t.status]}</p>

            {t.status === 'assigned' && t.assigned_to === member?.id && (
              <button className="mt-3 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white" onClick={() => submitTask(t.id)}>
                Mark complete
              </button>
            )}
            {capabilities?.canApproveTasks && t.status === 'submitted' && (
              <div className="mt-3 flex gap-2">
                <button className="flex-1 rounded-lg bg-success px-4 py-2 text-sm font-semibold text-white" onClick={() => decideTask(t, true)}>
                  Approve
                </button>
                <button className="flex-1 rounded-lg bg-danger px-4 py-2 text-sm font-semibold text-white" onClick={() => decideTask(t, false)}>
                  Send back
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
