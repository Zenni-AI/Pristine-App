import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming, Easing } from 'react-native-reanimated';
import { colors } from '@/theme/colors';
import type { VoiceState } from '@/lib/useVoiceAssistant';

const BAR_COUNT = 5;

function Bar({ index, active }: { index: number; active: boolean }) {
  const height = useSharedValue(12);

  useEffect(() => {
    if (active) {
      height.value = withRepeat(
        withSequence(
          withTiming(14 + Math.random() * 46, { duration: 260 + index * 30, easing: Easing.inOut(Easing.ease) }),
          withTiming(10 + Math.random() * 16, { duration: 260 + index * 30, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else {
      height.value = withTiming(10, { duration: 300 });
    }
  }, [active, index, height]);

  const style = useAnimatedStyle(() => ({ height: height.value }));

  return <Animated.View style={[styles.bar, style]} />;
}

/** Sleek dark Jarvis-style animated waveform, driven by voice assistant state. */
export function Waveform({ state }: { state: VoiceState }) {
  const active = state === 'listening' || state === 'speaking';
  return (
    <View style={styles.row}>
      {Array.from({ length: BAR_COUNT }).map((_, i) => (
        <Bar key={i} index={i} active={active} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 70, justifyContent: 'center' },
  bar: { width: 8, borderRadius: 4, backgroundColor: colors.dark.accentGlow },
});
