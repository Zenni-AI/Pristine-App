import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SEAT_PRICES, formatCents } from '@motherboard/shared';
import { useHousehold } from '@/lib/HouseholdProvider';
import { useAuth } from '@/lib/AuthProvider';
import { SectionCard } from '@/components/SectionCard';
import { colors, roleAccentColors } from '@/theme/colors';

export default function Settings() {
  const { household, member, role, capabilities } = useHousehold();
  const { signOut } = useAuth();

  if (!member || !household || !role) return null;
  const seat = SEAT_PRICES[role];

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, paddingTop: 60, paddingBottom: 40 }}>
      <Text style={styles.headerTitle}>Settings</Text>

      <SectionCard title="Your profile">
        <View style={styles.profileRow}>
          <View style={[styles.avatar, { backgroundColor: roleAccentColors[role] }]}>
            <Text style={styles.avatarText}>{member.display_name.charAt(0)}</Text>
          </View>
          <View>
            <Text style={styles.profileName}>{member.display_name}</Text>
            <Text style={styles.profileRole}>{seat.label}</Text>
          </View>
        </View>
      </SectionCard>

      {capabilities?.canManageAccounts && (
        <SectionCard title="Household">
          <Text style={styles.rowLabel}>Invite code</Text>
          <Text style={styles.inviteCode}>{household.invite_code}</Text>
          <Text style={styles.hint}>Share this so other family members can join with the right role.</Text>

          <Pressable style={styles.linkRow} onPress={() => router.push('/settings/members')}>
            <Text style={styles.linkText}>Manage family members →</Text>
          </Pressable>
          <Pressable style={styles.linkRow} onPress={() => router.push('/settings/babysitter-mode')}>
            <Text style={styles.linkText}>Babysitter Mode →</Text>
          </Pressable>
          <Pressable style={styles.linkRow} onPress={() => router.push('/settings/restrictions')}>
            <Text style={styles.linkText}>Quiet hours & restrictions →</Text>
          </Pressable>
        </SectionCard>
      )}

      {capabilities?.canViewFinance && (
        <SectionCard title="Billing">
          <Text style={styles.rowLabel}>Your seat</Text>
          <Text style={styles.billingValue}>
            {seat.label} — {formatCents(seat.monthlyCents)}/mo
          </Text>
          {capabilities.canManageAccounts && (
            <Pressable style={styles.linkRow} onPress={() => router.push('/settings/billing')}>
              <Text style={styles.linkText}>Manage plan & payment →</Text>
            </Pressable>
          )}
        </SectionCard>
      )}

      <SectionCard title="Notifications">
        <Pressable style={styles.linkRow} onPress={() => router.push('/settings/notifications')}>
          <Text style={styles.linkText}>Push, text & email preferences →</Text>
        </Pressable>
        <Pressable style={styles.linkRow} onPress={() => router.push('/settings/calendars')}>
          <Text style={styles.linkText}>Connect Google / Outlook / Apple Calendar →</Text>
        </Pressable>
      </SectionCard>

      <Pressable style={styles.signOutButton} onPress={signOut}>
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.background },
  headerTitle: { color: colors.dark.textPrimary, fontSize: 24, fontWeight: '700', marginBottom: 20 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 18 },
  profileName: { color: colors.dark.textPrimary, fontSize: 16, fontWeight: '600' },
  profileRole: { color: colors.dark.textSecondary, fontSize: 13 },
  rowLabel: { color: colors.dark.textSecondary, fontSize: 12, marginBottom: 4 },
  inviteCode: { color: colors.dark.accentGlow, fontSize: 22, fontWeight: '800', letterSpacing: 2 },
  hint: { color: colors.dark.textSecondary, fontSize: 12, marginTop: 6 },
  billingValue: { color: colors.dark.textPrimary, fontSize: 15, fontWeight: '600' },
  linkRow: { paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.dark.border, marginTop: 8 },
  linkText: { color: colors.dark.accentGlow, fontSize: 14, fontWeight: '600' },
  signOutButton: { alignItems: 'center', marginTop: 20 },
  signOutText: { color: colors.dark.danger, fontSize: 14, fontWeight: '600' },
});
