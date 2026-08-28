import { isSkipAnswer, type OnboardingTopic } from '@motherboard/shared';
import { supabase } from './supabase';

/**
 * Persists one onboarding answer. Skipped topics are marked 'skipped' rather
 * than left 'not_started' so the proactive-nudge job (see
 * supabase/functions/nudge-scheduler) knows to gently follow up on them
 * later — "Hey, do you know when your last oil change was?" — instead of
 * treating them as simply unanswered.
 */
export async function saveOnboardingAnswer(
  householdId: string,
  topic: OnboardingTopic,
  answerText: string,
  extraData: Record<string, unknown> = {}
) {
  const skipped = isSkipAnswer(answerText);
  const { error } = await supabase.from('onboarding_progress').upsert(
    {
      household_id: householdId,
      topic,
      status: skipped ? 'skipped' : 'complete',
      data: { raw_answer: answerText, ...extraData },
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'household_id,topic' }
  );
  if (error) throw error;
  return { skipped };
}

/**
 * Calls the onboarding AI edge function to turn a free-text answer into a
 * warm, in-character Motherboard reply and (server-side) structured data to write
 * into the right domain tables (vehicles, kids, etc). Falls back to a canned
 * reply if the function isn't reachable yet (e.g. local dev without it
 * deployed), so the conversational flow still works end-to-end.
 */
export async function getMotherboardReply(topicPrompt: string, userAnswer: string): Promise<string> {
  try {
    const { data, error } = await supabase.functions.invoke('onboarding-ai', {
      body: { topicPrompt, userAnswer },
    });
    if (error) throw error;
    return data?.reply ?? fallbackReply(userAnswer);
  } catch {
    return fallbackReply(userAnswer);
  }
}

function fallbackReply(userAnswer: string): string {
  if (isSkipAnswer(userAnswer)) {
    return "No problem — I'll check back in with you about this another time. Let's keep going.";
  }
  return "Got it, thanks! I've saved that.";
}
