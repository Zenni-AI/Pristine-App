// Domo onboarding conversation — turns a raw answer into a warm, in-character
// reply using Claude. Called from apps/mobile/src/lib/onboarding.ts and the
// web equivalent. Deploy with: supabase functions deploy onboarding-ai
import { corsHeaders } from '../_shared/cors.ts';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;
const MODEL = 'claude-sonnet-4-5';

const SYSTEM_PROMPT = `You are Domo, a warm and capable AI household butler running a friendly
conversational onboarding. You just asked the user a question about their family/home/life.
They answered. Reply in 1-2 short sentences: acknowledge what they said naturally (don't just
repeat it back), and if it's useful, note what you'll do with it. If they skipped or said they
don't know, reassure them you'll check back later — never make them feel bad about skipping.
Never ask a new question yourself; the app drives the topic sequence.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { topicPrompt, userAnswer } = await req.json();

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 150,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: `Domo asked: "${topicPrompt}"\nUser answered: "${userAnswer}"` }],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Anthropic error ${res.status}: ${text}`);
    }

    const data = await res.json();
    const reply = data.content?.[0]?.text?.trim() ?? "Got it, thanks!";

    return new Response(JSON.stringify({ reply }), { headers: { ...corsHeaders, 'content-type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err), reply: 'Got it, thanks — noted!' }), {
      status: 200, // degrade gracefully; the client already has a fallback reply
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    });
  }
});
