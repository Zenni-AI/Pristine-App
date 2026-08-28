import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { quoteOfTheDay } from '@motherboard/shared';
import { colors } from '@/theme/colors';

/**
 * The daily empowerment quote — an editorial moment, not a data summary, so
 * it deliberately doesn't use SectionCard. Always the first thing on the
 * home screen. Themed against colors.dark to match every other mobile
 * screen today — see docs/DESIGN_SYSTEM.md for the mobile re-skin status.
 */
export function QuoteOfDay() {
  const quote = useMemo(() => quoteOfTheDay(), []);

  return (
    <View style={styles.wrap}>
      <Text style={styles.mark}>“</Text>
      <Text style={styles.quote}>{quote}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.dark.surfaceRaised,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.dark.border,
    padding: 20,
    marginBottom: 16,
  },
  mark: { color: colors.dark.accentGlow, fontSize: 28, lineHeight: 28, fontStyle: 'italic', marginBottom: 4 },
  quote: { color: colors.dark.textPrimary, fontSize: 17, lineHeight: 23, fontWeight: '600' },
});
