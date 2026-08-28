import React from 'react';
import { Stack } from 'expo-router';

export default function BabysitterLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="chat" />
    </Stack>
  );
}
