"use client";

/**
 * [INPUT]: Depends on chart onboarding, topic entry, chat panel, evidence drawer, Radix Dialog, and /api/chat
 * [OUTPUT]: Provides the coordinated MVP Ziwei Chat application shell
 * [POS]: Client state boundary for anonymous profile, primary chart draft, chat streaming, error handling, and evidence display
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

import * as Dialog from "@radix-ui/react-dialog";
import { ShieldCheck, Trash2, X } from "lucide-react";
import { useState } from "react";

import type { CreateChartInput } from "@/lib/domain/chart";
import {
  chatErrorFromResponse,
  classifyChatError,
  emptyAssistantResponseError,
  isEmptyAssistantResponse,
  type ChatErrorState,
} from "@/lib/ui/chat-errors";
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

    const nextProfileId = createClientUuid();
    window.localStorage.setItem("ziwei-chat-profile-id", nextProfileId);
    return nextProfileId;
  });
  const [conversationId] = useState(createClientUuid);
  const [chartInput, setChartInput] = useState<CreateChartInput | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [lastFailedContent, setLastFailedContent] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<ChatErrorState | null>(null);
  const [evidence, setEvidence] = useState<EvidenceState>(initialEvidence);
  const [chartSynced, setChartSynced] = useState(false);
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);
  const [isEvidenceDialogOpen, setIsEvidenceDialogOpen] = useState(false);

  async function sendMessage(contentOverride?: string) {
    const content = (contentOverride ?? draft).trim();
    if (!content || isStreaming) return;

    const shouldAppendUserMessage =
      messages[messages.length - 1]?.role !== "user" ||
      messages[messages.length - 1]?.content !== content;
    const nextMessages = shouldAppendUserMessage
      ? [...messages, { role: "user" as const, content }]
      : messages;

    setMessages(nextMessages);
    setDraft("");
    setError(null);
    setIsStreaming(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId,
          conversationId,
          chartInput: chartSynced ? undefined : chartInput,
          messages: nextMessages,
        }),
      });
      const responseError = chatErrorFromResponse(response);
      if (responseError) {
        setError(responseError);
        setLastFailedContent(content);
        return;
      }

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

      if (isEmptyAssistantResponse(assistantContent)) {
        setMessages((current) => current.slice(0, -1));
        setError(emptyAssistantResponseError());
        setLastFailedContent(content);
        return;
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
        chartFacts: chartInput ? ["事业宫 / 财帛宫 / 命宫等主题宫位"] : [],
        knowledgeSources: chartInput ? ["curated-internal · local"] : [],
        critic: chartInput ? "passed" : "not_run",
      });
      if (chartInput) {
        setChartSynced(true);
      }
      setLastFailedContent(null);
    } catch (caught) {
      setError(classifyChatError(caught));
      setLastFailedContent(content);
    } finally {
      setIsStreaming(false);
    }
  }

  function retryLastMessage() {
    if (lastFailedContent) {
      void sendMessage(lastFailedContent);
    }
  }

  function resetChartDraft() {
    setChartInput(null);
    setChartSynced(false);
    setEvidence(initialEvidence);
  }

  async function deleteLocalData() {
    await fetch(`/api/chat?profileId=${encodeURIComponent(profileId)}`, {
      method: "DELETE",
    });
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("ziwei-chat-profile-id");
    }
    setChartInput(null);
    setChartSynced(false);
    setMessages([]);
    setDraft("");
    setLastFailedContent(null);
    setError(null);
    setEvidence(initialEvidence);
    setIsClearDialogOpen(false);
  }

  return (
    <main className="min-h-[100dvh] bg-background text-foreground">
      <section className="mx-auto grid min-h-[100dvh] w-full max-w-[1500px] gap-4 px-4 py-4 lg:grid-cols-[340px_minmax(0,1fr)_320px] lg:gap-5 lg:px-6 lg:py-6">
        <div className="order-2 grid content-start gap-4 lg:order-1">
          <header className="rounded-lg border border-border bg-surface p-4 shadow-[0_1px_0_rgba(24,24,22,0.04)]">
            <div className="flex items-start gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-success-muted text-primary">
                <ShieldCheck size={18} strokeWidth={1.8} />
              </div>
              <div>
                <p className="text-xs font-medium text-primary">Ziwei Chat</p>
                <h1 className="mt-1 text-xl font-semibold leading-tight text-foreground">
                  命盘分析工作台
                </h1>
                <p className="mt-2 text-sm leading-6 text-muted">
                  匿名 profile、确定性排盘、本地知识检索和回答检查先跑通。
                </p>
              </div>
            </div>
          </header>

          <ChartOnboarding
            chartInput={chartInput}
            chartSynced={chartSynced}
            onChartReady={(nextChart) => {
              setChartInput(nextChart);
              setChartSynced(false);
              setError(null);
            }}
            onResetChart={resetChartDraft}
            profileId={profileId}
          />

          <TopicEntry onSelect={setDraft} />

          <ClearDataDialog
            onConfirm={deleteLocalData}
            onOpenChange={setIsClearDialogOpen}
            open={isClearDialogOpen}
          />
        </div>

        <div className="order-1 min-w-0 lg:order-2">
          <ChatPanel
            draft={draft}
            error={error}
            isStreaming={isStreaming}
            messages={messages}
            onDraftChange={setDraft}
            onOpenEvidence={() => setIsEvidenceDialogOpen(true)}
            onRetry={retryLastMessage}
            onSubmit={() => void sendMessage()}
          />
        </div>

        <div className="order-3 hidden lg:block">
          <EvidenceDrawer evidence={evidence} />
        </div>
      </section>

      <Dialog.Root open={isEvidenceDialogOpen} onOpenChange={setIsEvidenceDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/35" />
          <Dialog.Content className="fixed inset-x-3 bottom-3 z-50 max-h-[82dvh] overflow-y-auto rounded-xl border border-border bg-surface p-4 shadow-2xl">
            <div className="mb-4 flex items-center justify-between gap-3">
              <Dialog.Title className="text-base font-semibold text-foreground">
                本次回答依据
              </Dialog.Title>
              <Dialog.Close className="inline-flex size-8 items-center justify-center rounded-lg border border-border text-muted transition hover:text-foreground">
                <X size={16} strokeWidth={1.8} />
              </Dialog.Close>
            </div>
            <EvidenceDrawer compact evidence={evidence} />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </main>
  );
}

function ClearDataDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Trigger asChild>
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm font-semibold text-muted transition hover:border-warning hover:text-warning active:translate-y-px"
          type="button"
        >
          <Trash2 size={16} strokeWidth={1.8} />
          清除匿名资料数据
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/35" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-32px)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-surface p-5 shadow-2xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-lg font-semibold text-foreground">
                清除匿名资料数据？
              </Dialog.Title>
              <Dialog.Description className="mt-2 text-sm leading-6 text-muted">
                这会清除当前浏览器里的匿名 profile 状态、当前命盘、对话消息和已显示的依据。
                MVP 没有产品账号，所以这不是账号删除。
              </Dialog.Description>
            </div>
            <Dialog.Close className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-border text-muted transition hover:text-foreground">
              <X size={16} strokeWidth={1.8} />
            </Dialog.Close>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <Dialog.Close className="h-10 rounded-lg border border-border bg-surface px-4 text-sm font-semibold text-foreground transition hover:border-primary">
              取消
            </Dialog.Close>
            <button
              className="h-10 rounded-lg bg-warning px-4 text-sm font-semibold text-white transition hover:bg-[#8e2f23] active:translate-y-px"
              onClick={onConfirm}
              type="button"
            >
              确认清除
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function createClientUuid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (digit) =>
    (
      Number(digit) ^
      ((Math.random() * 16) >> (Number(digit) / 4))
    ).toString(16),
  );
}
