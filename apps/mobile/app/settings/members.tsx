import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Alert } from 'react-native';
import { SEAT_PRICES, type HouseholdMember } from '@motherboard/shared';
import { useHousehold } from '@/lib/HouseholdProvider';
import { supabase } from '@/lib/supabase';
import { colors, roleAccentColors } from '@/theme/colors';

/** Admins manage every account here: view role/tier, remove access. */
export default function ManageMembers() {
  const { household, member } = useHousehold();
  const [members, setMembers] = useState<HouseholdMember[]>([]);

  const load = useCallback(() => {
    if (!household) return;
    supabase
      .from('household_members')
      .select('*')
      .eq('household_id', household.id)
      .order('created_at', { ascending: true })
      .then(({ data }) => setMembers((data as HouseholdMember[]) ?? []));
  }, [household]);

  useEffect(() => {
    load();
  }, [load]);

  const removeMember = (m: HouseholdMember) => {
    if (m.id === member?.id) return;
    Alert.alert('Remove access?', `${m.display_name} will lose access to Motherboard immediately.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('household_members').update({ is_active: false }).eq('id', m.id);
          load();
        },
      },
    ]);
  };

  return (
    <FlatList
      style={styles.container}
      data={members.filter((m) => m.is_active)}
      keyExtractor={(m) => m.id}
      contentContainerStyle={{ padding: 20, gap: 10 }}
      renderItem={({ item }) => (
        <View style={styles.row}>
          <View style={[styles.avatar, { backgroundColor: roleAccentColors[item.role] }]}>
            <Text style={styles.avatarText}>{item.display_name.charAt(0)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{item.display_name}</Text>
            <Text style={styles.role}>{SEAT_PRICES[item.role].label}</Text>
          </View>
          {item.id !== member?.id && (
            <Pressable onPress={() => removeMember(item)}>
              <Text style={styles.removeText}>Remove</Text>
            </Pressable>
          )}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.background },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.dark.surface,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '700' },
  name: { color: colors.dark.textPrimary, fontSize: 15, fontWeight: '600' },
  role: { color: colors.dark.textSecondary, fontSize: 12 },
  removeText: { color: colors.dark.danger, fontSize: 13, fontWeight: '600' },
});
