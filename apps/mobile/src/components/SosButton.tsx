import React, { useState } from 'react';
import { Pressable, Text, StyleSheet, Alert } from 'react-native';
import * as Location from 'expo-location';
import { useHousehold } from '@/lib/HouseholdProvider';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme/colors';

/**
 * SOS emergency button — alerts both admins instantly with exact location.
 * Available to every role, everywhere it's rendered (dashboard + map), per
 * spec. Writing to sos_alerts fires fn_sos_to_chat (0004_location.sql),
 * which pins an urgent message in family chat automatically.
 */
export function SosButton({ compact = false }: { compact?: boolean }) {
  const { household, member } = useHousehold();
  const [sending, setSending] = useState(false);

  const handlePress = () => {
    Alert.alert('Send SOS?', 'This immediately alerts both admins with your exact location.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Send SOS', style: 'destructive', onPress: trigger },
    ]);
  };

  const trigger = async () => {
    if (!household || !member) return;
    setSending(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      let lat = 0;
      let lng = 0;
      if (status === 'granted') {
        const pos = await Location.getCurrentPositionAsync({});
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      }
      await supabase.from('sos_alerts').insert({ household_id: household.id, member_id: member.id, lat, lng });
      Alert.alert('SOS sent', 'Both admins have been alerted with your location.');
    } catch {
      Alert.alert('Could not send SOS', 'Check your connection and try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Pressable style={[styles.button, compact && styles.compact]} onPress={handlePress} disabled={sending}>
      <Text style={styles.text}>{sending ? 'Sending…' : 'SOS'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.dark.sos,
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 28,
    alignItems: 'center',
    shadowColor: colors.dark.sos,
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  compact: { paddingVertical: 10, paddingHorizontal: 18 },
  text: { color: '#fff', fontWeight: '800', fontSize: 16, letterSpacing: 1 },
});
