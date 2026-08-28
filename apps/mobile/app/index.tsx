import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '@/lib/AuthProvider';
import { useHousehold } from '@/lib/HouseholdProvider';
import { colors } from '@/theme/colors';
import { ONBOARDING_TOPICS } from '@motherboard/shared';
import { useOnboardingStatus } from '@/lib/useOnboardingStatus';

/**
 * Entry router: decides whether to send the user to auth, onboarding, the
 * babysitter mode shell, or the normal role-based tabs.
 */
export default function Index() {
  const { session, isLoading: authLoading } = useAuth();
  const { member, role, household, isLoading: householdLoading } = useHousehold();
  const { hasStarted, isLoading: onboardingLoading } = useOnboardingStatus(household?.id);

  if (authLoading || (session && householdLoading)) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.dark.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.dark.accent} />
      </View>
    );
  }

  if (!session) return <Redirect href="/(auth)/sign-in" />;
  if (!member) return <Redirect href="/(auth)/join" />;

  if (role === 'babysitter') return <Redirect href="/babysitter" />;

  const isAdmin = role === 'primary_admin' || role === 'second_admin';
  if (isAdmin && !onboardingLoading && !hasStarted && ONBOARDING_TOPICS.length > 0) {
    return <Redirect href="/onboarding" />;
  }

  return <Redirect href="/(tabs)" />;
}
