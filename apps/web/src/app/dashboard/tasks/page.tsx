'use client';

import { useCallback, useEffect, useState } from 'react';
import type { MotherboardTask, HouseholdMember } from '@motherboard/shared';
import { useApp } from '@/components/providers/AppProviders';
import { Button, Card, PageHeader, EmptyState, Badge } from '@/components/ui';

const STATUS_LABEL: Record<MotherboardTask['status'], string> = {
  assigned: 'To do',
  submitted: 'Waiting on approval',
  approved: 'Done',
  rejected: 'Needs redo',
  overdue: 'Overdue',
};

const STATUS_TONE: Record<MotherboardTask['status'], 'neutral' | 'warning' | 'success' | 'danger'> = {
  assigned: 'neutral',
  submitted: 'warning',
  approved: 'success',
  rejected: 'danger',
  overdue: 'danger',
};

export default function TasksPage() {
  const { supabase, household, member, capabilities } = useApp();
  const [tasks, setTasks] = useState<MotherboardTask[]>([]);
  const [members, setMembers] = useState<HouseholdMember[]>([]);

  const load = useCallback(async () => {
    if (!household || !member) return;
    let query = supabase.from('tasks').select('*').eq('household_id', household.id).order('due_at', { ascending: true });
    if (!capabilities?.fullVisibility) query = query.eq('assigned_to', member.id);
    const { data } = await query;
    setTasks((data as MotherboardTask[]) ?? []);

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

  const decideTask = async (task: MotherboardTask, approve: boolean) => {
    await supabase.from('tasks').update({ status: approve ? 'approved' : 'rejected', reviewed_by: member?.id, reviewed_at: new Date().toISOString() }).eq('id', task.id);
    load();
  };

  return (
    <div>
      <PageHeader title={capabilities?.fullVisibility ? 'Chores & Tasks' : 'My Tasks'} />
      {tasks.length === 0 ? (
        <Card>
          <EmptyState message="No tasks yet. Add one to get the household moving." />
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {tasks.map((t) => (
            <Card key={t.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-body font-semibold text-textPrimary">{t.title}</p>
                  {capabilities?.fullVisibility && <p className="mt-0.5 text-secondary text-textSecondary">Assigned to {memberName(t.assigned_to)}</p>}
                </div>
                <Badge tone="accent">+{t.points} pts</Badge>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <Badge tone={STATUS_TONE[t.status]}>{STATUS_LABEL[t.status]}</Badge>
                <div className="flex gap-2">
                  {t.status === 'assigned' && t.assigned_to === member?.id && (
                    <Button size="sm" onClick={() => submitTask(t.id)}>
                      Mark complete
                    </Button>
                  )}
                  {capabilities?.canApproveTasks && t.status === 'submitted' && (
                    <>
                      <Button size="sm" variant="secondary" onClick={() => decideTask(t, false)}>
                        Send back
                      </Button>
                      <Button size="sm" onClick={() => decideTask(t, true)}>
                        Approve
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
