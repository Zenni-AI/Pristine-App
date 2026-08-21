import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Linking } from 'react-native';
import { SEAT_PRICES, estimateMonthlyCents, formatCents } from '@domo/shared';
import { useHousehold } from '@/lib/HouseholdProvider';
import { useHouseholdMembers } from '@/lib/useHouseholdMembers';
import { colors } from '@/theme/colors';

/**
 * Plan overview + link out to the Stripe Customer Portal for payment method
 * / plan changes. The portal session URL comes from the `stripe-portal`
 * edge function (service-role Stripe call — never done client-side).
 */
export default function Billing() {
  const { household } = useHousehold();
  const { members } = useHouseholdMembers(household?.id);

  const estimate = useMemo(() => estimateMonthlyCents(members.map((m) => m.role)), [members]);

  const openPortal = async () => {
    // supabase.functions.invoke('stripe-portal', { body: { householdId } })
    // then Linking.openURL(data.url) — stubbed until Stripe keys are configured.
    Linking.openURL('https://billing.stripe.com/');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
      <Text style={styles.summaryLabel}>Estimated monthly bill</Text>
      <Text style={styles.summaryValue}>{formatCents(estimate.recommendedCents)}</Text>
      {estimate.bestBundle && estimate.recommendedCents === estimate.bestBundle.monthlyCents && (
        <Text style={styles.hint}>Using the {estimate.bestBundle.label} bundle — cheaper than paying per seat.</Text>
      )}

      <Text style={styles.sectionTitle}>Seats</Text>
      {members.map((m) => (
        <View key={m.id} style={styles.seatRow}>
          <Text style={styles.seatName}>{m.display_name}</Text>
          <Text style={styles.seatRole}>{SEAT_PRICES[m.role].label}</Text>
          <Text style={styles.seatPrice}>{formatCents(SEAT_PRICES[m.role].monthlyCents)}/mo</Text>
        </View>
      ))}
      <Text style={styles.hint}>One member seat is free on every plan.</Text>

      <Pressable style={styles.primaryButton} onPress={openPortal}>
        <Text style={styles.primaryButtonText}>Manage plan & payment method</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.background },
  summaryLabel: { color: colors.dark.textSecondary, fontSize: 13, marginTop: 12 },
  summaryValue: { color: colors.dark.textPrimary, fontSize: 34, fontWeight: '800', marginTop: 4 },
  hint: { color: colors.dark.textSecondary, fontSize: 12, marginTop: 8 },
  sectionTitle: { color: colors.dark.textPrimary, fontSize: 15, fontWeight: '700', marginTop: 24, marginBottom: 10 },
  seatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.dark.border,
  },
  seatName: { color: colors.dark.textPrimary, fontSize: 14, flex: 1 },
  seatRole: { color: colors.dark.textSecondary, fontSize: 12, flex: 1 },
  seatPrice: { color: colors.dark.accentGlow, fontSize: 13, fontWeight: '600' },
  primaryButton: { backgroundColor: colors.dark.accent, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 32 },
  primaryButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
