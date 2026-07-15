"use client";

import { ArrowLeft, Settings } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";

import { useWorkspace } from "@/components/workspace/workspace-provider";
import { ChatComposer } from "./chat-composer";
import { HomeChartRing } from "./home-chart-ring";
import { MessageBubble } from "./message-bubble";

export function ChatExperience() {
  const {
    ready,
    chartDisplay,
    chatSession,
    sendMessage,
    retryLastMessage,
    resetChat,
    setSelectedEvidenceMessageId,
  } = useWorkspace();
  const threadRef = useRef<HTMLDivElement>(null);
  const active = chatSession.messages.length > 0;
  const busy = chatSession.activeRequestId !== null;

  useEffect(() => {
    if (!active) return;
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" });
  }, [active, chatSession.messages]);

  if (!ready) return <div className="mx-auto mt-20 h-56 w-full max-w-3xl rounded-2xl border border-border bg-card/45" aria-label="正在准备对话" />;

  if (!active) {
    return (
      <section className="mx-auto flex min-h-[calc(100dvh-9rem)] w-full max-w-3xl flex-col justify-center py-8">
        <header>
          <p className="text-sm text-cinnabar">对话工作台</p>
          <h1 className="mt-4 text-balance font-serif text-4xl font-bold leading-tight tracking-[-0.02em] sm:text-5xl">想从哪件事开始？</h1>
          <p className="mt-4 max-w-2xl text-pretty leading-7 text-muted-foreground">
            {chartDisplay ? "我会先读取你的真实命盘事实，再调用工具、skill、知识检索与 critic。" : "你也可以先聊天；涉及命盘判断时，需要先补全出生资料。"}
          </p>
        </header>
        <div className="my-8 flex justify-center"><HomeChartRing model={chartDisplay} /></div>
        <ChatComposer disabled={busy} onSend={(content) => void sendMessage(content)} />
      </section>
    );
  }

  return (
    <section className="mx-auto flex h-[calc(100dvh-8rem)] w-full max-w-3xl flex-col">
      <header className="flex min-h-16 items-center justify-between border-b border-border/70">
        <button className="flex min-h-11 items-center gap-2 text-sm text-muted-foreground hover:text-foreground" onClick={resetChat} type="button"><ArrowLeft className="size-4" />新对话</button>
        <Link className="flex min-h-11 items-center gap-2 text-sm text-muted-foreground hover:text-foreground" href="/settings"><Settings className="size-4" />模型设置</Link>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto py-6 pr-1" ref={threadRef}>
        <div className="grid gap-6">
          {chatSession.messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              onInspect={message.role === "assistant" ? () => setSelectedEvidenceMessageId(message.id) : undefined}
              onRetry={message.status === "failed" ? () => void retryLastMessage() : undefined}
            />
          ))}
        </div>
      </div>
      <div className="bg-background pb-3 pt-4">
        <ChatComposer disabled={busy} onSend={(content) => void sendMessage(content)} variant="docked" />
      </div>
    </section>
  );
}
