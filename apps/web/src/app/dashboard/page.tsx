'use client';

import { useEffect, useState } from 'react';
import type { MotherboardTask, MealPlanEntry, ProactiveNudge } from '@motherboard/shared';
import { useApp } from '@/components/providers/AppProviders';

export default function DashboardHome() {
  const { supabase, household, member, capabilities } = useApp();
  const [myTasks, setMyTasks] = useState<MotherboardTask[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<MotherboardTask[]>([]);
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
      .then(({ data }) => setMyTasks((data as MotherboardTask[]) ?? []));

    if (capabilities?.canApproveTasks) {
      supabase
        .from('tasks')
        .select('*')
        .eq('household_id', household.id)
        .eq('status', 'submitted')
        .then(({ data }) => setPendingApprovals((data as MotherboardTask[]) ?? []));
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
      .order('scheduled_for', { ascending: true })
      .limit(5)
      .then(({ data }) => setNudges((data as ProactiveNudge[]) ?? []));
  }, [supabase, household, member, capabilities]);

  if (!member) return null;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-1 text-3xl font-bold">Hey {member.display_name.split(' ')[0]} 👋</h1>
      <p className="mb-8 text-textSecondary">Here's what's happening today.</p>

      {nudges.length > 0 && (
        <Card title="Domo noticed">
          {nudges.map((n) => (
            <p key={n.id} className="border-t border-border py-2 text-sm first:border-t-0">
              💡 {n.message}
            </p>
          ))}
        </Card>
      )}

      {capabilities?.canApproveTasks && pendingApprovals.length > 0 && (
        <Card title={`Waiting on your approval (${pendingApprovals.length})`}>
          {pendingApprovals.map((t) => (
            <div key={t.id} className="flex justify-between border-t border-border py-2 text-sm first:border-t-0">
              <span>{t.title}</span>
              <span className="font-semibold text-accentGlow">+{t.points} pts</span>
            </div>
          ))}
        </Card>
      )}

      <Card title="Your tasks">
        {myTasks.length === 0 ? (
          <p className="text-sm text-textSecondary">Nothing due — nice work!</p>
        ) : (
          myTasks.map((t) => (
            <div key={t.id} className="flex justify-between border-t border-border py-2 text-sm first:border-t-0">
              <span>{t.title}</span>
              <span className="font-semibold text-accentGlow">+{t.points} pts</span>
            </div>
          ))
        )}
      </Card>

      <Card title="Tonight's dinner">
        <p className="text-sm">{tonightsDinner ? tonightsDinner.title : 'Not planned yet'}</p>
      </Card>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4 rounded-2xl border border-border bg-surface p-5">
      <h2 className="mb-2 text-sm font-bold">{title}</h2>
      {children}
    </div>
  );
}
