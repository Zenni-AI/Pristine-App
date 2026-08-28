// The proactive AI butler's heartbeat. Invoke on a schedule (Supabase
// Scheduled Functions / pg_cron, e.g. hourly) — see docs/ARCHITECTURE.md for
// the cron setup. Scans domain tables for "Domo should say something" moments,
// writes a proactive_nudges row (idempotent per related record), and fires a
// notification. Deploy with: supabase functions deploy nudge-scheduler
import { createSupabaseAdminClient } from '../_shared/supabaseAdmin.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

type Supabase = ReturnType<typeof createSupabaseAdminClient>;

Deno.serve(async () => {
  const supabase = createSupabaseAdminClient();
  const results = await Promise.allSettled([
    checkVehicleOilChanges(supabase),
    checkOnboardingFollowUps(supabase),
    checkPlantWatering(supabase),
    checkCoupleActivities(supabase),
    checkHomeMaintenance(supabase),
    checkMedicationRefills(supabase),
    checkUpcomingOccasions(supabase),
    checkTomorrowsSchedule(supabase),
  ]);

  return new Response(JSON.stringify({ ranAt: new Date().toISOString(), results: results.map((r) => r.status) }), {
    headers: { 'content-type': 'application/json' },
  });
});

/** Insert a nudge only if there isn't already a live one for this exact record, then notify. */
async function upsertNudge(
  supabase: Supabase,
  args: { householdId: string; targetMemberId?: string | null; domain: string; relatedRecordType?: string; relatedRecordId?: string; message: string }
) {
  const { data: existing } = await supabase
    .from('proactive_nudges')
    .select('id')
    .eq('household_id', args.householdId)
    .eq('domain', args.domain)
    .eq('related_record_id', args.relatedRecordId ?? null)
    .in('status', ['pending', 'sent'])
    .maybeSingle();
  if (existing) return;

  const { data: nudge } = await supabase
    .from('proactive_nudges')
    .insert({
      household_id: args.householdId,
      target_member_id: args.targetMemberId ?? null,
      domain: args.domain,
      related_record_type: args.relatedRecordType,
      related_record_id: args.relatedRecordId,
      message: args.message,
      status: 'sent',
      sent_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  // Notify admins (nudges without a target member) or the specific member.
  const { data: recipients } = args.targetMemberId
    ? { data: [{ id: args.targetMemberId }] }
    : await supabase.from('household_members').select('id').eq('household_id', args.householdId).in('role', ['primary_admin', 'second_admin']);

  for (const r of recipients ?? []) {
    await fetch(`${SUPABASE_URL}/functions/v1/send-notification`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
      body: JSON.stringify({ householdId: args.householdId, memberId: r.id, subject: 'Domo', body: args.message, nudgeId: nudge?.id }),
    }).catch(() => undefined);
  }
}

async function checkVehicleOilChanges(supabase: Supabase) {
  const threeMonthsAgo = new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const { data: vehicles } = await supabase
    .from('vehicles')
    .select('id, household_id, nickname, make, model, last_oil_change_on, last_oil_change_unknown');
  for (const v of vehicles ?? []) {
    const label = v.nickname || [v.make, v.model].filter(Boolean).join(' ') || 'your vehicle';
    if (v.last_oil_change_unknown) {
      await upsertNudge(supabase, {
        householdId: v.household_id,
        domain: 'vehicles',
        relatedRecordType: 'vehicle',
        relatedRecordId: v.id,
        message: `Hey, do you know when ${label} last had an oil change? I can set up reminders once I know.`,
      });
    } else if (v.last_oil_change_on && v.last_oil_change_on < threeMonthsAgo) {
      await upsertNudge(supabase, {
        householdId: v.household_id,
        domain: 'vehicles',
        relatedRecordType: 'vehicle',
        relatedRecordId: v.id,
        message: `It's been 3 months since ${label}'s last oil change — want me to remind you to book one?`,
      });
    }
  }
}

async function checkOnboardingFollowUps(supabase: Supabase) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
  const { data: skipped } = await supabase
    .from('onboarding_progress')
    .select('id, household_id, topic, last_nudged_at, nudge_count')
    .eq('status', 'skipped')
    .or(`last_nudged_at.is.null,last_nudged_at.lt.${sevenDaysAgo}`)
    .limit(1); // ONE gentle nudge at a time, never all skipped topics at once

  for (const topic of skipped ?? []) {
    await upsertNudge(supabase, {
      householdId: topic.household_id,
      domain: 'onboarding',
      relatedRecordType: 'onboarding_topic',
      relatedRecordId: topic.id,
      message: `Got a sec? I still don't know much about "${topic.topic.replace(/_/g, ' ')}" — want to fill me in?`,
    });
    await supabase
      .from('onboarding_progress')
      .update({ last_nudged_at: new Date().toISOString(), nudge_count: (topic.nudge_count ?? 0) + 1 })
      .eq('id', topic.id);
  }
}

async function checkPlantWatering(supabase: Supabase) {
  const today = new Date().toISOString().slice(0, 10);
  const { data: plants } = await supabase.from('plants').select('id, household_id, name, next_watering_on').lte('next_watering_on', today);
  for (const p of plants ?? []) {
    await upsertNudge(supabase, {
      householdId: p.household_id,
      domain: 'garden',
      relatedRecordType: 'plant',
      relatedRecordId: p.id,
      message: `It's been a bit — don't forget to water ${p.name}. 🌱`,
    });
  }
}

async function checkCoupleActivities(supabase: Supabase) {
  const today = new Date().toISOString().slice(0, 10);
  const { data: activities } = await supabase.from('couple_activities').select('id, household_id, title, next_due_on').lte('next_due_on', today);
  for (const a of activities ?? []) {
    await upsertNudge(supabase, {
      householdId: a.household_id,
      domain: 'relationships',
      relatedRecordType: 'couple_activity',
      relatedRecordId: a.id,
      message: `You haven't had "${a.title}" in a while — want me to schedule one?`,
    });
  }
}

async function checkHomeMaintenance(supabase: Supabase) {
  const today = new Date().toISOString().slice(0, 10);
  const { data: schedules } = await supabase.from('maintenance_schedules').select('id, household_id, title, next_due_on').lte('next_due_on', today);
  for (const s of schedules ?? []) {
    await upsertNudge(supabase, {
      householdId: s.household_id,
      domain: 'home',
      relatedRecordType: 'maintenance_schedule',
      relatedRecordId: s.id,
      message: `"${s.title}" is due — want me to help you schedule it?`,
    });
  }
}

async function checkMedicationRefills(supabase: Supabase) {
  const threeDaysOut = new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const { data: meds } = await supabase.from('medications').select('id, household_id, member_id, name, refill_on').eq('is_active', true).lte('refill_on', threeDaysOut);
  for (const m of meds ?? []) {
    await upsertNudge(supabase, {
      householdId: m.household_id,
      targetMemberId: m.member_id,
      domain: 'health',
      relatedRecordType: 'medication',
      relatedRecordId: m.id,
      message: `${m.name} refill is coming up — want me to remind the pharmacy or set a reminder?`,
    });
  }
}

async function checkUpcomingOccasions(supabase: Supabase) {
  const today = new Date();
  const { data: occasions } = await supabase.from('special_occasions').select('id, household_id, title, occasion_date, reminder_days_before');
  for (const o of occasions ?? []) {
    const occasionDate = new Date(o.occasion_date);
    if (o.is_recurring_yearly) occasionDate.setFullYear(today.getFullYear());
    const daysUntil = Math.round((occasionDate.getTime() - today.getTime()) / (24 * 3600 * 1000));
    if ((o.reminder_days_before ?? []).includes(daysUntil)) {
      await upsertNudge(supabase, {
        householdId: o.household_id,
        domain: 'relationships',
        relatedRecordType: 'special_occasion',
        relatedRecordId: `${o.id}:${daysUntil}`, // distinct per reminder milestone
        message: `${o.title} is coming up in ${daysUntil} day${daysUntil === 1 ? '' : 's'} — want a reminder set?`,
      });
    }
  }
}

async function checkTomorrowsSchedule(supabase: Supabase) {
  const tomorrowStart = new Date();
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  tomorrowStart.setHours(0, 0, 0, 0);
  const tomorrowEnd = new Date(tomorrowStart);
  tomorrowEnd.setHours(23, 59, 59, 999);

  const { data: events } = await supabase
    .from('schedule_events')
    .select('id, household_id')
    .gte('starts_at', tomorrowStart.toISOString())
    .lte('starts_at', tomorrowEnd.toISOString())
    .in('kind', ['game', 'practice']);

  for (const e of events ?? []) {
    await supabase.rpc('fn_post_schedule_reminder', { p_event_id: e.id });
  }
}
