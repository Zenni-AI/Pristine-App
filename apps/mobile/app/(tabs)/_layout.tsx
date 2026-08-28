import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useHousehold } from '@/lib/HouseholdProvider';
import { colors, roleAccentColors } from '@/theme/colors';

/**
 * One tab bar, five roles. Every role gets Home / Chat / Tasks / Map / Motherboard
 * (voice) — location and messaging are never paywalled or role-gated per
 * product spec. What differs is what's *inside* each tab (a kid sees only
 * their own tasks, an admin sees everyone's + an approval queue, etc.) and
 * the Settings tab, whose content is role-specific (billing only for admins).
 */
export default function TabsLayout() {
  const { role } = useHousehold();
  const accent = role ? roleAccentColors[role] : colors.dark.accent;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: accent,
        tabBarInactiveTintColor: colors.dark.textSecondary,
        tabBarStyle: { backgroundColor: colors.dark.surface, borderTopColor: colors.dark.border },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Home', tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="chat"
        options={{ title: 'Chat', tabBarIcon: ({ color, size }) => <Ionicons name="chatbubbles" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="tasks"
        options={{ title: 'Tasks', tabBarIcon: ({ color, size }) => <Ionicons name="checkmark-done-circle" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="map"
        options={{ title: 'Map', tabBarIcon: ({ color, size }) => <Ionicons name="location" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="voice"
        options={{ title: 'Domo', tabBarIcon: ({ color, size }) => <Ionicons name="mic-circle" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: 'Settings', tabBarIcon: ({ color, size }) => <Ionicons name="settings" color={color} size={size} /> }}
      />
    </Tabs>
  );
}
