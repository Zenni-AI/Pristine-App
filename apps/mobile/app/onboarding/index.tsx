import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { ONBOARDING_TOPICS, ONBOARDING_TOPIC_COPY, type OnboardingTopic } from '@motherboard/shared';
import { useHousehold } from '@/lib/HouseholdProvider';
import { saveOnboardingAnswer, getMotherboardReply } from '@/lib/onboarding';
import { colors } from '@/theme/colors';

interface ChatBubble {
  id: string;
  from: 'motherboard' | 'user';
  text: string;
}

/**
 * Friendly conversational onboarding — feels like talking to Domo, not
 * filling out a form. Walks through every ONBOARDING_TOPIC one at a time;
 * "I don't know" / "skip" is always fine, Domo just follows up later (see
 * saveOnboardingAnswer + the nudge-scheduler edge function).
 */
export default function Onboarding() {
  const { household } = useHousehold();
  const [topicIndex, setTopicIndex] = useState(0);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<ChatBubble>>(null);

  const currentTopic: OnboardingTopic | undefined = ONBOARDING_TOPICS[topicIndex];

  const [messages, setMessages] = useState<ChatBubble[]>(() => [
    {
      id: 'intro',
      from: 'motherboard',
      text: "Hi, I'm Domo 👋 I'm going to help run your household — meals, chores, vehicles, health, all of it. Let's get to know your family a bit. You can skip anything and I'll ask again later.",
    },
    { id: `prompt-0`, from: 'motherboard', text: ONBOARDING_TOPIC_COPY[ONBOARDING_TOPICS[0]].prompt },
  ]);

  const progressPct = useMemo(() => Math.round((topicIndex / ONBOARDING_TOPICS.length) * 100), [topicIndex]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || !currentTopic || !household) return;
    const answer = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, from: 'user', text: answer }]);
    setSending(true);

    try {
      await saveOnboardingAnswer(household.id, currentTopic, answer);
      const reply = await getMotherboardReply(ONBOARDING_TOPIC_COPY[currentTopic].prompt, answer);
      setMessages((prev) => [...prev, { id: `d-${Date.now()}`, from: 'motherboard', text: reply }]);

      const nextIndex = topicIndex + 1;
      if (nextIndex < ONBOARDING_TOPICS.length) {
        setTopicIndex(nextIndex);
        setMessages((prev) => [
          ...prev,
          { id: `prompt-${nextIndex}`, from: 'motherboard', text: ONBOARDING_TOPIC_COPY[ONBOARDING_TOPICS[nextIndex]].prompt },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: 'done',
            from: 'motherboard',
            text: "That's everything for now! I'm already set up to start managing your family's life. I'll gently follow up on anything you skipped — one thing at a time, never all at once.",
          },
        ]);
      }
    } finally {
      setSending(false);
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    }
  }, [input, currentTopic, household, topicIndex]);

  const isComplete = topicIndex >= ONBOARDING_TOPICS.length;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Setting up Motherboard</Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
        </View>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: 20, gap: 12 }}
        renderItem={({ item }) => (
          <View style={[styles.bubble, item.from === 'motherboard' ? styles.motherboardBubble : styles.userBubble]}>
            <Text style={item.from === 'motherboard' ? styles.motherboardText : styles.userText}>{item.text}</Text>
          </View>
        )}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
      />

      {isComplete ? (
        <Pressable style={styles.primaryButton} onPress={() => router.replace('/(tabs)')}>
          <Text style={styles.primaryButtonText}>Take me to Motherboard</Text>
        </Pressable>
      ) : (
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Type your answer, or say “skip”…"
            placeholderTextColor={colors.dark.textSecondary}
            onSubmitEditing={handleSend}
            editable={!sending}
          />
          <Pressable style={styles.sendButton} onPress={handleSend} disabled={sending || !input.trim()}>
            <Text style={styles.sendButtonText}>➤</Text>
          </Pressable>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.background },
  header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 12 },
  headerTitle: { color: colors.dark.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 10 },
  progressTrack: { height: 4, backgroundColor: colors.dark.surface, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: 4, backgroundColor: colors.dark.accent },
  bubble: { maxWidth: '85%', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  motherboardBubble: { backgroundColor: colors.dark.surface, alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  userBubble: { backgroundColor: colors.dark.accent, alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  motherboardText: { color: colors.dark.textPrimary, fontSize: 15, lineHeight: 21 },
  userText: { color: '#fff', fontSize: 15, lineHeight: 21 },
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
  primaryButton: { backgroundColor: colors.dark.accent, borderRadius: 14, paddingVertical: 16, alignItems: 'center', margin: 20 },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
