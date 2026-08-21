import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { DEFAULT_QUICK_REPLIES, type ChatMessage } from '@domo/shared';
import { useHousehold } from '@/lib/HouseholdProvider';
import { useHouseholdMembers } from '@/lib/useHouseholdMembers';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme/colors';

/**
 * Family Group Chat — admins, adults, and kids. Babysitters NEVER have
 * access to this thread (enforced structurally: fn_sync_family_thread_membership
 * skips role='babysitter', and RLS only grants access via chat_thread_members).
 */
export default function FamilyChat() {
  const { household, member, capabilities, isYoungKidUi } = useHousehold();
  const { members } = useHouseholdMembers(household?.id);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');

  const memberName = useMemo(() => {
    const map = new Map(members.map((m) => [m.id, m.display_name]));
    return (id: string | null) => (id ? map.get(id) ?? 'Member' : 'Domo');
  }, [members]);

  useEffect(() => {
    if (!household) return;
    supabase
      .from('chat_threads')
      .select('id')
      .eq('household_id', household.id)
      .eq('kind', 'family')
      .maybeSingle()
      .then(({ data }) => setThreadId(data?.id ?? null));
  }, [household]);

  useEffect(() => {
    if (!threadId) return;
    supabase
      .from('chat_messages')
      .select('*')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true })
      .limit(100)
      .then(({ data }) => setMessages((data as ChatMessage[]) ?? []));

    const channel = supabase
      .channel(`chat:${threadId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `thread_id=eq.${threadId}` }, (payload) => {
        setMessages((prev) => [...prev, payload.new as ChatMessage]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [threadId]);

  const sendMessage = async (body: string, quickReplyKey?: string) => {
    if (!threadId || !member || !body.trim()) return;
    await supabase.from('chat_messages').insert({
      thread_id: threadId,
      sender_member_id: member.id,
      kind: quickReplyKey ? 'quick_reply' : 'text',
      body,
      quick_reply_key: quickReplyKey ?? null,
    });
    setInput('');
  };

  const togglePin = async (msg: ChatMessage) => {
    if (!capabilities?.canBroadcast) return; // admin-only, reuse broadcast capability as "admin power" proxy
    await supabase.from('chat_messages').update({ is_pinned: !msg.is_pinned }).eq('id', msg.id);
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Family Chat</Text>
      </View>

      <FlatList
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        renderItem={({ item }) => {
          const mine = item.sender_member_id === member?.id;
          const isSystem = item.sender_member_id === null;
          return (
            <Pressable
              onLongPress={() => togglePin(item)}
              style={[styles.bubble, isSystem ? styles.systemBubble : mine ? styles.mineBubble : styles.theirBubble]}
            >
              {!mine && !isSystem && <Text style={styles.senderLabel}>{memberName(item.sender_member_id)}</Text>}
              {item.is_pinned && <Text style={styles.pinnedLabel}>📌 Pinned</Text>}
              <Text style={isSystem ? styles.systemText : mine ? styles.mineText : styles.theirText}>{item.body}</Text>
            </Pressable>
          );
        }}
      />

      {isYoungKidUi && (
        <View style={styles.quickReplyRow}>
          {DEFAULT_QUICK_REPLIES.map((qr) => (
            <Pressable key={qr.key} style={styles.quickReplyChip} onPress={() => sendMessage(`${qr.emoji} ${qr.label}`, qr.key)}>
              <Text style={styles.quickReplyText}>
                {qr.emoji} {qr.label}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Message the family…"
          placeholderTextColor={colors.dark.textSecondary}
          onSubmitEditing={() => sendMessage(input)}
        />
        <Pressable style={styles.sendButton} onPress={() => sendMessage(input)} disabled={!input.trim()}>
          <Text style={styles.sendButtonText}>➤</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.background },
  header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.dark.border },
  headerTitle: { color: colors.dark.textPrimary, fontSize: 20, fontWeight: '700' },
  bubble: { maxWidth: '82%', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  mineBubble: { backgroundColor: colors.dark.accent, alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  theirBubble: { backgroundColor: colors.dark.surface, alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  systemBubble: { backgroundColor: colors.dark.surfaceRaised, alignSelf: 'center', borderRadius: 12 },
  senderLabel: { color: colors.dark.accentGlow, fontSize: 11, fontWeight: '700', marginBottom: 2 },
  pinnedLabel: { color: colors.dark.warning, fontSize: 10, fontWeight: '700', marginBottom: 2 },
  mineText: { color: '#fff', fontSize: 15 },
  theirText: { color: colors.dark.textPrimary, fontSize: 15 },
  systemText: { color: colors.dark.textSecondary, fontSize: 13, fontStyle: 'italic' },
  quickReplyRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingBottom: 8 },
  quickReplyChip: { backgroundColor: colors.dark.surfaceRaised, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: colors.dark.border },
  quickReplyText: { color: colors.dark.textPrimary, fontSize: 13, fontWeight: '600' },
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
