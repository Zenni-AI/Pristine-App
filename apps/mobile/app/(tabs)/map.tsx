import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import type { MemberLocation, SavedLocation } from '@domo/shared';
import { useHousehold } from '@/lib/HouseholdProvider';
import { useHouseholdMembers } from '@/lib/useHouseholdMembers';
import { supabase } from '@/lib/supabase';
import { colors, roleAccentColors } from '@/theme/colors';
import { SosButton } from '@/components/SosButton';

/**
 * Family Location — real-time map of every member. Never paywalled for any
 * role (per spec), including babysitters, whose visibility of the KIDS'
 * location is still gated behind an explicit 'kids_location' unlock for
 * their active session (enforced by RLS in 0004_location.sql); a babysitter
 * always sees and shares their own position here.
 */
export default function FamilyMap() {
  const { household, member } = useHousehold();
  const { members } = useHouseholdMembers(household?.id);
  const [locations, setLocations] = useState<Record<string, MemberLocation>>({});
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>([]);
  const mapRef = useRef<MapView>(null);

  // Publish my own location periodically.
  useEffect(() => {
    if (!household || !member) return;
    let subscription: Location.LocationSubscription | undefined;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 30000, distanceInterval: 50 },
        async (pos) => {
          await supabase.from('member_locations').upsert({
            member_id: member.id,
            household_id: household.id,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy_meters: pos.coords.accuracy,
            heading: pos.coords.heading,
            speed_mps: pos.coords.speed,
            updated_at: new Date().toISOString(),
          });
        }
      );
    })();

    return () => subscription?.remove();
  }, [household, member]);

  // Subscribe to everyone else's location.
  useEffect(() => {
    if (!household) return;
    supabase
      .from('member_locations')
      .select('*')
      .eq('household_id', household.id)
      .then(({ data }) => {
        const map: Record<string, MemberLocation> = {};
        (data as MemberLocation[] | null)?.forEach((l) => (map[l.member_id] = l));
        setLocations(map);
      });

    supabase
      .from('saved_locations')
      .select('*')
      .eq('household_id', household.id)
      .then(({ data }) => setSavedLocations((data as SavedLocation[]) ?? []));

    const channel = supabase
      .channel(`locations:${household.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'member_locations', filter: `household_id=eq.${household.id}` },
        (payload) => {
          const row = payload.new as MemberLocation;
          if (row?.member_id) setLocations((prev) => ({ ...prev, [row.member_id]: row }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [household]);

  const memberById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);

  return (
    <View style={styles.container}>
      <MapView ref={mapRef} style={StyleSheet.absoluteFill} provider={PROVIDER_GOOGLE} showsUserLocation>
        {Object.values(locations).map((loc) => {
          const m = memberById.get(loc.member_id);
          if (!m) return null;
          return (
            <Marker key={loc.member_id} coordinate={{ latitude: loc.lat, longitude: loc.lng }} title={m.display_name} pinColor={roleAccentColors[m.role]} />
          );
        })}
        {savedLocations.map((loc) => (
          <Circle
            key={loc.id}
            center={{ latitude: loc.lat, longitude: loc.lng }}
            radius={loc.radius_meters}
            strokeColor={loc.is_safe_zone ? colors.dark.success : colors.dark.accent}
            fillColor={loc.is_safe_zone ? 'rgba(61,217,167,0.15)' : 'rgba(108,92,231,0.12)'}
          />
        ))}
      </MapView>

      <View style={styles.memberStrip}>
        {members.map((m) => {
          const loc = locations[m.id];
          return (
            <View key={m.id} style={styles.memberPill}>
              <View style={[styles.dot, { backgroundColor: roleAccentColors[m.role] }]} />
              <Text style={styles.memberPillText}>{m.display_name}</Text>
              {!loc && <Text style={styles.memberPillMuted}> · no signal</Text>}
            </View>
          );
        })}
      </View>

      <View style={styles.sosOverlay}>
        <SosButton compact />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.background },
  memberStrip: {
    position: 'absolute',
    top: 56,
    left: 16,
    right: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  memberPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dark.surface,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  memberPillText: { color: colors.dark.textPrimary, fontSize: 12, fontWeight: '600' },
  memberPillMuted: { color: colors.dark.textSecondary, fontSize: 11 },
  sosOverlay: { position: 'absolute', bottom: 24, alignSelf: 'center' },
});
