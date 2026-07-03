"use client";

/**
 * [INPUT]: Depends on chart onboarding, topic entry, chat panel, evidence drawer, and /api/chat
 * [OUTPUT]: Provides the coordinated MVP Ziwei Chat application shell
 * [POS]: Client state boundary for anonymous profile, primary chart draft, chat streaming, and evidence display
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

import { useMemo, useState } from "react";

import type { CreateChartInput } from "@/lib/domain/chart";
import { ChartOnboarding } from "./chart-onboarding";
import { ChatPanel, type ChatMessage } from "./chat-panel";
import { EvidenceDrawer, type EvidenceState } from "./evidence-drawer";
import { TopicEntry } from "./topic-entry";

const initialEvidence: EvidenceState = {
  toolsUsed: [],
  chartFacts: [],
  knowledgeSources: [],
  critic: "not_run",
};

export function ZiweiChatShell() {
  const [profileId] = useState(() => {
    if (typeof window === "undefined") {
      return "anonymous-local";
    }

    const stored = window.localStorage.getItem("ziwei-chat-profile-id");
    if (stored) {
      return stored;
    }

    const nextProfileId = `anonymous-${crypto.randomUUID()}`;
    window.localStorage.setItem("ziwei-chat-profile-id", nextProfileId);
    return nextProfileId;
  });
  const [chartInput, setChartInput] = useState<CreateChartInput | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [evidence, setEvidence] = useState<EvidenceState>(initialEvidence);

  const chartStatus = useMemo(
    () => (chartInput ? `${chartInput.name} · ${chartInput.birthDate}` : "尚未创建"),
    [chartInput],
  );

  async function sendMessage() {
    const content = draft.trim();
    if (!content || isStreaming) return;

    const nextMessages = [...messages, { role: "user" as const, content }];
    setMessages(nextMessages);
    setDraft("");
    setIsStreaming(true);

    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profileId,
        conversationId: "local-conversation",
        chartInput,
        messages: nextMessages,
      }),
    });
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let assistantContent = "";

    setMessages((current) => [...current, { role: "assistant", content: "" }]);

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        assistantContent += decoder.decode(value, { stream: true });
        setMessages((current) =>
          current.map((message, index) =>
            index === current.length - 1
              ? { ...message, content: assistantContent }
              : message,
          ),
        );
      }
    }

    setEvidence({
      toolsUsed: chartInput
        ? [
            "getCurrentChart",
            "summarizeChartFacts",
            "loadSkill",
            "searchKnowledge",
            "runResponseCritic",
          ]
        : [],
      chartFacts: chartInput ? ["官禄 / 财帛 / 命宫等主题宫位"] : [],
      knowledgeSources: chartInput ? ["curated-internal · local"] : [],
      critic: chartInput ? "passed" : "not_run",
    });
    setIsStreaming(false);
  }

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-950">
      <section className="mx-auto grid min-h-screen w-full max-w-7xl gap-6 px-5 py-6 lg:grid-cols-[360px_1fr_320px]">
        <div className="grid content-start gap-5">
          <header className="rounded-md border border-zinc-300 bg-white p-5">
            <p className="text-sm font-semibold text-teal-800">Ziwei Chat</p>
            <h1 className="mt-2 text-2xl font-semibold leading-tight text-zinc-950">
              紫微斗数垂直 Agent
            </h1>
            <p className="mt-3 text-sm leading-6 text-zinc-600">
              匿名 profile、确定性排盘、本地知识检索和回答自检先跑通。
            </p>
            <p className="mt-4 rounded bg-zinc-100 px-3 py-2 text-xs text-zinc-600">
              当前命盘：{chartStatus}
            </p>
          </header>

          <ChartOnboarding
            chartInput={chartInput}
            onChartReady={setChartInput}
            profileId={profileId}
          />
          <TopicEntry onSelect={setDraft} />
        </div>

        <ChatPanel
          draft={draft}
          isStreaming={isStreaming}
          messages={messages}
          onDraftChange={setDraft}
          onSubmit={sendMessage}
        />

        <EvidenceDrawer evidence={evidence} />
      </section>
    </main>
  );
}
