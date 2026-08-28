import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import type { ChatMessage } from '@motherboard/shared';
import { useHousehold } from '@/lib/HouseholdProvider';
import { useBabysitterSession } from '@/lib/useBabysitterSession';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme/colors';

/**
 * Babysitter Group Chat — both admins, relevant kids (if added), and the
 * sitter. Session-based: auto-archived when the babysitter session ends
 * (fn_expire_babysitter_session in 0002_chat.sql).
 */
export default function BabysitterChat() {
  const { member } = useHousehold();
  const { session } = useBabysitterSession();
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sharingLocation, setSharingLocation] = useState(false);

  useEffect(() => {
    if (!session) return;
    supabase.from('chat_threads').select('id').eq('babysitter_session_id', session.id).maybeSingle().then(({ data }) => setThreadId(data?.id ?? null));
  }, [session]);

  useEffect(() => {
    if (!threadId) return;
    supabase.from('chat_messages').select('*').eq('thread_id', threadId).order('created_at', { ascending: true }).then(({ data }) => setMessages((data as ChatMessage[]) ?? []));
    const channel = supabase
      .channel(`babysitter-chat:${threadId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `thread_id=eq.${threadId}` }, (payload) =>
        setMessages((prev) => [...prev, payload.new as ChatMessage])
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [threadId]);

  const send = async (body: string) => {
    if (!threadId || !member || !body.trim()) return;
    await supabase.from('chat_messages').insert({ thread_id: threadId, sender_member_id: member.id, kind: 'text', body });
    setInput('');
  };

  const toggleLocationShare = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted' || !threadId || !member) return;
    if (!sharingLocation) {
      const pos = await Location.getCurrentPositionAsync({});
      await supabase.from('chat_messages').insert({
        thread_id: threadId,
        sender_member_id: member.id,
        kind: 'location_share',
        body: 'Shared live location',
        location_lat: pos.coords.latitude,
        location_lng: pos.coords.longitude,
      });
    }
    setSharingLocation((v) => !v);
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Babysitter Chat</Text>
        <Pressable onPress={toggleLocationShare}>
          <Text style={styles.locationToggle}>{sharingLocation ? '📍 Sharing' : '📍 Share'}</Text>
        </Pressable>
      </View>

      <FlatList
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        renderItem={({ item }) => {
          const mine = item.sender_member_id === member?.id;
          const isSystem = item.sender_member_id === null;
          return (
            <View style={[styles.bubble, isSystem ? styles.systemBubble : mine ? styles.mineBubble : styles.theirBubble]}>
              <Text style={isSystem ? styles.systemText : mine ? styles.mineText : styles.theirText}>
                {item.kind === 'location_share' ? '📍 ' : ''}
                {item.body}
              </Text>
            </View>
          );
        }}
      />

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Message…"
          placeholderTextColor={colors.dark.textSecondary}
          onSubmitEditing={() => send(input)}
        />
        <Pressable style={styles.sendButton} onPress={() => send(input)} disabled={!input.trim()}>
          <Text style={styles.sendButtonText}>➤</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.background },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
  },
  backText: { color: colors.dark.accentGlow, fontSize: 14 },
  headerTitle: { color: colors.dark.textPrimary, fontSize: 16, fontWeight: '700' },
  locationToggle: { color: colors.dark.success, fontSize: 13, fontWeight: '600' },
  bubble: { maxWidth: '82%', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  mineBubble: { backgroundColor: colors.dark.accent, alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  theirBubble: { backgroundColor: colors.dark.surface, alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  systemBubble: { backgroundColor: colors.dark.surfaceRaised, alignSelf: 'center', borderRadius: 12 },
  mineText: { color: '#fff', fontSize: 15 },
  theirText: { color: colors.dark.textPrimary, fontSize: 15 },
  systemText: { color: colors.dark.textSecondary, fontSize: 13, fontStyle: 'italic' },
  inputRow: { flexDirection: 'row', padding: 16, gap: 10, alignItems: 'center' },
  input: {
    flex: 1,
    backgroundColor: colors.dark.surface,
    borderColor: colors.dark.border,
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: colors.dark.textPrimary,
    fontSize: 15,
  },
  sendButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.dark.accent, alignItems: 'center', justifyContent: 'center' },
  sendButtonText: { color: '#fff', fontSize: 16 },
});
