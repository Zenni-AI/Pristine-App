import React from 'react';
import { Stack } from 'expo-router';
import { colors } from '@/theme/colors';

export default function SettingsStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.dark.background },
        headerTintColor: colors.dark.textPrimary,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="members" options={{ title: 'Family Members' }} />
      <Stack.Screen name="babysitter-mode" options={{ title: 'Babysitter Mode' }} />
      <Stack.Screen name="restrictions" options={{ title: 'Quiet Hours & Restrictions' }} />
      <Stack.Screen name="billing" options={{ title: 'Billing' }} />
      <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
      <Stack.Screen name="calendars" options={{ title: 'Calendars' }} />
    </Stack>
  );
}
