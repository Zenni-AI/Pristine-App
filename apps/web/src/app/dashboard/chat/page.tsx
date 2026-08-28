'use client';

import { useEffect, useRef, useState } from 'react';
import type { ChatMessage } from '@motherboard/shared';
import { useApp } from '@/components/providers/AppProviders';
import { PageHeader } from '@/components/ui';

export default function FamilyChatPage() {
  const { supabase, household, member } = useApp();
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!household) return;
    supabase
      .from('chat_threads')
      .select('id')
      .eq('household_id', household.id)
      .eq('kind', 'family')
      .maybeSingle()
      .then(({ data }) => setThreadId(data?.id ?? null));
  }, [supabase, household]);

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
  }, [supabase, threadId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    if (!threadId || !member || !input.trim()) return;
    await supabase.from('chat_messages').insert({ thread_id: threadId, sender_member_id: member.id, kind: 'text', body: input.trim() });
    setInput('');
  };

  return (
    <div className="flex h-[calc(100vh-5rem)] flex-col">
      <PageHeader title="Family Chat" />
      <div className="flex-1 overflow-y-auto rounded-lg border border-border bg-surface p-5 shadow-card">
        {messages.map((m) => {
          const mine = m.sender_member_id === member?.id;
          const isSystem = m.sender_member_id === null;
          return (
            <div key={m.id} className={`mb-2.5 flex ${mine ? 'justify-end' : isSystem ? 'justify-center' : 'justify-start'}`}>
              <div
                className={`max-w-[70%] rounded-lg px-4 py-2.5 text-body ${
                  mine ? 'bg-accent text-textOnAccent' : isSystem ? 'bg-surfaceSunken text-textSecondary italic' : 'bg-surfaceSunken text-textPrimary'
                }`}
              >
                {m.body}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <div className="mt-4 flex gap-2">
        <input
          className="flex-1 rounded-md border border-border bg-surfaceSunken px-4 py-3 text-body text-textPrimary outline-none placeholder:text-textTertiary focus:border-accent focus:bg-surface"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Message the family…"
        />
        <button className="rounded-md bg-accent px-5 py-3 text-body font-semibold text-textOnAccent hover:bg-accentHover" onClick={send}>
          Send
        </button>
      </div>
    </div>
  );
}
