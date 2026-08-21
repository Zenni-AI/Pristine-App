import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Waveform } from '@/components/Waveform';
import { useVoiceAssistant } from '@/lib/useVoiceAssistant';
import { colors } from '@/theme/colors';

const STATE_LABEL: Record<string, string> = {
  idle: 'Tap to talk to Domo',
  listening: 'Listening…',
  thinking: 'Thinking…',
  speaking: 'Speaking…',
};

/**
 * Full voice interaction screen — sleek dark Jarvis-style UI. Works
 * identically on phone, tablet, and web (see apps/web for the browser
 * build); tablet layout is the same component sized up for a countertop
 * or wall-mounted display via the OS's native scaling.
 */
export default function VoiceScreen() {
  const { state, transcript, reply, startListening, stopListening } = useVoiceAssistant();

  const onPressIn = () => startListening();
  const onPressOut = () => stopListening();

  return (
    <View style={styles.container}>
      <View style={styles.glowRing}>
        <View style={styles.innerRing}>
          <Waveform state={state} />
        </View>
      </View>

      <Text style={styles.stateLabel}>{STATE_LABEL[state]}</Text>

      {!!transcript && <Text style={styles.transcript}>“{transcript}”</Text>}
      {!!reply && <Text style={styles.reply}>{reply}</Text>}

      <Pressable
        style={[styles.micButton, state === 'listening' && styles.micButtonActive]}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
      >
        <Text style={styles.micButtonText}>{state === 'listening' ? 'Release to send' : 'Hold to talk'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.background, alignItems: 'center', justifyContent: 'center', padding: 24 },
  glowRing: {
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 1,
    borderColor: colors.dark.border,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.dark.accent,
    shadowOpacity: 0.6,
    shadowRadius: 40,
    marginBottom: 32,
  },
  innerRing: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: colors.dark.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateLabel: { color: colors.dark.textSecondary, fontSize: 15, marginBottom: 24 },
  transcript: { color: colors.dark.textPrimary, fontSize: 16, textAlign: 'center', marginBottom: 12, paddingHorizontal: 20 },
  reply: { color: colors.dark.accentGlow, fontSize: 16, textAlign: 'center', paddingHorizontal: 20, lineHeight: 22 },
  micButton: {
    marginTop: 40,
    backgroundColor: colors.dark.surface,
    borderWidth: 1,
    borderColor: colors.dark.accent,
    borderRadius: 999,
    paddingHorizontal: 28,
    paddingVertical: 14,
  },
  micButtonActive: { backgroundColor: colors.dark.accent },
  micButtonText: { color: colors.dark.textPrimary, fontWeight: '600', fontSize: 14 },
});
