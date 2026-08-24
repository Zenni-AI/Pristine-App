// Motherboard voice assistant — full loop: speech-to-text (ElevenLabs Scribe) ->
// reasoning with household context (Anthropic) -> text-to-speech (ElevenLabs)
// -> reply audio uploaded to Supabase Storage. Deploy with:
//   supabase functions deploy voice-assistant
import { corsHeaders } from '../_shared/cors.ts';
import { createSupabaseAdminClient } from '../_shared/supabaseAdmin.ts';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;
const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY')!;
const ELEVENLABS_VOICE_ID = Deno.env.get('ELEVENLABS_VOICE_ID') ?? 'EXAVITQu4vr4xnSDxMaL'; // ElevenLabs default "Sarah" voice
const MODEL = 'claude-sonnet-4-5';

const SYSTEM_PROMPT = `You are Domo, a family's proactive AI life & home butler, speaking out loud
in a voice conversation. Be warm, concise, and conversational — 2-3 sentences max unless asked for
detail. You have access to a snapshot of the household's upcoming tasks and nudges below; use it
to answer naturally. If asked to do something you can't yet do autonomously (book a doctor, pay a
bill), say you've noted it and a human will need to confirm/complete it.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { householdId, memberId, audioUri, text } = await req.json();
    const supabase = createSupabaseAdminClient();

    // 1. Speech-to-text (skipped if the client already sent text, e.g. web fallback).
    let transcript = text as string | undefined;
    if (!transcript && audioUri) {
      transcript = await transcribeAudio(audioUri);
    }
    if (!transcript) throw new Error('No audio or text provided');

    // 2. Pull light household context so Motherboard can answer "what's on my plate today" etc.
    const [{ data: tasks }, { data: nudges }] = await Promise.all([
      supabase.from('tasks').select('title, due_at, status').eq('household_id', householdId).eq('assigned_to', memberId).in('status', ['assigned', 'submitted']).limit(5),
      supabase.from('proactive_nudges').select('message').eq('household_id', householdId).eq('status', 'pending').limit(5),
    ]);

    const context = [
      tasks?.length ? `Upcoming tasks: ${tasks.map((t) => t.title).join(', ')}` : '',
      nudges?.length ? `Things Motherboard has noticed: ${nudges.map((n) => n.message).join(' | ')}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    // 3. Reasoning via Anthropic.
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 300,
        system: `${SYSTEM_PROMPT}\n\n${context}`,
        messages: [{ role: 'user', content: transcript }],
      }),
    });
    if (!anthropicRes.ok) throw new Error(`Anthropic error ${anthropicRes.status}: ${await anthropicRes.text()}`);
    const anthropicData = await anthropicRes.json();
    const reply: string = anthropicData.content?.[0]?.text?.trim() ?? "I'm not sure how to help with that yet.";

    // 4. Text-to-speech via ElevenLabs, uploaded to Storage for the client to play.
    let audioUrl: string | null = null;
    try {
      const ttsRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'xi-api-key': ELEVENLABS_API_KEY },
        body: JSON.stringify({ text: reply, model_id: 'eleven_turbo_v2_5' }),
      });
      if (ttsRes.ok) {
        const audioBuffer = await ttsRes.arrayBuffer();
        const path = `voice-replies/${householdId}/${crypto.randomUUID()}.mp3`;
        await supabase.storage.from('domo-audio').upload(path, audioBuffer, { contentType: 'audio/mpeg' });
        const { data: signed } = await supabase.storage.from('domo-audio').createSignedUrl(path, 60 * 10);
        audioUrl = signed?.signedUrl ?? null;
      }
    } catch {
      // Voice playback is a nice-to-have here — text reply still returns.
    }

    // 5. Log the turn for pattern learning / conversation history.
    const { data: conversation } = await supabase
      .from('ai_conversations')
      .insert({ household_id: householdId, member_id: memberId, kind: 'voice' })
      .select('id')
      .single();
    if (conversation) {
      await supabase.from('ai_messages').insert([
        { conversation_id: conversation.id, role: 'user', content: transcript },
        { conversation_id: conversation.id, role: 'assistant', content: reply, audio_url: audioUrl },
      ]);
    }

    return new Response(JSON.stringify({ transcript, reply, audioUrl }), {
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    });
  }
});

async function transcribeAudio(audioUri: string): Promise<string> {
  const audioRes = await fetch(audioUri);
  const audioBlob = await audioRes.blob();
  const form = new FormData();
  form.append('file', audioBlob, 'audio.m4a');
  form.append('model_id', 'scribe_v1');

  const res = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
    method: 'POST',
    headers: { 'xi-api-key': ELEVENLABS_API_KEY },
    body: form,
  });
  if (!res.ok) throw new Error(`ElevenLabs STT error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.text ?? '';
}
