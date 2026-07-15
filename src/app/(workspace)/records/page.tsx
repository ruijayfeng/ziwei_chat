"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { LifeTimeline } from "@/components/records/life-timeline";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import {
  currentSessionConversation,
  loadConversationList,
  loadConversationMessages,
  type ConversationListItem,
  type ConversationMessageItem,
} from "@/lib/ui/conversation-records";

export default function RecordsPage() {
  const { ready, profileId, conversationId, chatSession } = useWorkspace();
  const current = useMemo(() => currentSessionConversation(conversationId, chatSession.messages), [chatSession.messages, conversationId]);
  const [persisted, setPersisted] = useState<ConversationListItem[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [persistedMessages, setPersistedMessages] = useState<ConversationMessageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || !profileId) return;
    let active = true;
    void loadConversationList(profileId)
      .then(async (result) => {
        if (!active) return;
        setPersisted(result.conversations);
        setUnavailable(result.unavailable);
        const firstId = current?.conversation.id ?? result.conversations[0]?.id ?? "";
        setSelectedId(firstId);
        if (firstId && firstId !== current?.conversation.id) {
          const messages = await loadConversationMessages(profileId, firstId);
          if (active) setPersistedMessages(messages);
        }
      })
      .catch((caught: unknown) => { if (active) setError(caught instanceof Error ? caught.message : "记录读取失败。"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [current?.conversation.id, profileId, ready]);

  const conversations = useMemo(() => {
    if (!current) return persisted;
    return [current.conversation, ...persisted.filter((item) => item.id !== current.conversation.id)];
  }, [current, persisted]);
  const displayedMessages = selectedId === current?.conversation.id ? current.messages : persistedMessages;

  const selectConversation = useCallback((nextId: string) => {
    setSelectedId(nextId);
    if (nextId === current?.conversation.id) {
      setPersistedMessages([]);
      return;
    }
    setPersistedMessages([]);
    void loadConversationMessages(profileId, nextId)
      .then(setPersistedMessages)
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : "对话内容读取失败。"));
  }, [current?.conversation.id, profileId]);

  return (
    <section className="mx-auto max-w-5xl py-8">
      <p className="text-sm text-cinnabar">记录</p>
      <h1 className="mt-3 font-serif text-4xl font-bold">真实对话记录</h1>
      <p className="mt-4 max-w-2xl leading-7 text-muted-foreground">只展示当前匿名 profile 与当前浏览器会话中的内容，不生成演示时间线。</p>
      {unavailable ? <p className="mt-5 rounded-xl border border-border bg-card/55 px-4 py-3 text-sm text-muted-foreground">持久化记录暂时不可用，下面仍会保留当前浏览器会话。</p> : null}
      {error ? <p className="mt-5 rounded-xl border border-destructive/35 bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">{error}</p> : null}
      {loading && !current ? <p className="mt-8 text-sm text-muted-foreground">正在读取记录…</p> : <LifeTimeline conversations={conversations} currentConversationId={current?.conversation.id} messages={displayedMessages} onSelect={selectConversation} selectedId={selectedId} />}
    </section>
  );
}
