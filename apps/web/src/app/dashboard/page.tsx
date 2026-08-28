'use client';

import { useEffect, useState } from 'react';
import type { MotherboardTask, MealPlanEntry, ProactiveNudge } from '@motherboard/shared';
import { useApp } from '@/components/providers/AppProviders';
import { Card, PageHeader, EmptyState, Badge, QuoteOfDay } from '@/components/ui';

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
    <div className="flex flex-col gap-5">
      <QuoteOfDay />
      <PageHeader title={`Good morning, ${member.display_name.split(' ')[0]}.`} subtitle="Here's your household today." />

      {nudges.length > 0 && (
        <Card title="Domo noticed">
          <div className="flex flex-col divide-y divide-border">
            {nudges.map((n) => (
              <p key={n.id} className="py-2.5 text-body text-textPrimary first:pt-0 last:pb-0">
                💡 {n.message}
              </p>
            ))}
          </div>
        </Card>
      )}

      {capabilities?.canApproveTasks && pendingApprovals.length > 0 && (
        <Card title={`Waiting on your approval (${pendingApprovals.length})`}>
          <div className="flex flex-col divide-y divide-border">
            {pendingApprovals.map((t) => (
              <div key={t.id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                <span className="text-body text-textPrimary">{t.title}</span>
                <Badge tone="accent">+{t.points} pts</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card title="Your tasks">
        {myTasks.length === 0 ? (
          <EmptyState message="Nothing due — nice work!" />
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {myTasks.map((t) => (
              <div key={t.id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                <span className="text-body text-textPrimary">{t.title}</span>
                <Badge tone="accent">+{t.points} pts</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="Tonight's dinner">
        {tonightsDinner ? (
          <p className="text-body text-textPrimary">{tonightsDinner.title}</p>
        ) : (
          <EmptyState message="Nothing planned for dinner yet. Add a meal or let Motherboard suggest one." />
        )}
      </Card>
    </div>
  );
}
