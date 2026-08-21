import { useCallback, useRef, useState } from 'react';
import { Audio } from 'expo-av';
import { useHousehold } from './HouseholdProvider';
import { supabase } from './supabase';

export type VoiceState = 'idle' | 'listening' | 'thinking' | 'speaking';

/**
 * Drives the voice screen: records the user's speech, sends it to the
 * `voice-assistant` edge function (Anthropic for reasoning + ElevenLabs for
 * TTS — see supabase/functions/voice-assistant), and plays back the reply.
 * Conversation turns are logged to ai_conversations/ai_messages so Domo's
 * proactive butler can learn from what's discussed here too.
 */
export function useVoiceAssistant() {
  const { household, member } = useHousehold();
  const [state, setState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState('');
  const [reply, setReply] = useState('');
  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  const startListening = useCallback(async () => {
    const { granted } = await Audio.requestPermissionsAsync();
    if (!granted) return;
    await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
    const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
    recordingRef.current = recording;
    setState('listening');
    setTranscript('');
    setReply('');
  }, []);

  const stopListening = useCallback(async () => {
    const recording = recordingRef.current;
    if (!recording || !household || !member) return;
    setState('thinking');
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    recordingRef.current = null;

    try {
      // In production this uploads the audio to Supabase Storage and invokes
      // the voice-assistant edge function with the file path; Anthropic
      // handles reasoning, ElevenLabs handles speech-to-text/text-to-speech.
      const { data, error } = await supabase.functions.invoke('voice-assistant', {
        body: { householdId: household.id, memberId: member.id, audioUri: uri },
      });
      if (error) throw error;
      setTranscript(data?.transcript ?? '');
      setReply(data?.reply ?? "I'm still getting set up — try again in a bit.");

      if (data?.audioUrl) {
        setState('speaking');
        const { sound } = await Audio.Sound.createAsync({ uri: data.audioUrl });
        soundRef.current = sound;
        sound.setOnPlaybackStatusUpdate((status) => {
          if ('didJustFinish' in status && status.didJustFinish) setState('idle');
        });
        await sound.playAsync();
      } else {
        setState('idle');
      }
    } catch {
      setReply("I couldn't reach the voice service. Check your connection and try again.");
      setState('idle');
    }
  }, [household, member]);

  return { state, transcript, reply, startListening, stopListening };
}
