"use client";

/**
 * [INPUT]: Depends on chart onboarding, topic entry, chat panel, evidence drawer, shadcn Sheet/AlertDialog, and /api/chat
 * [OUTPUT]: Provides the coordinated MVP Ziwei Chat application shell
 * [POS]: Client state boundary for anonymous profile, primary chart draft, chat streaming, error handling, and evidence display
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

import { useEffect, useState } from "react";
import { Menu, ShieldCheck, Trash2 } from "lucide-react";

import type { CreateChartInput } from "@/lib/domain/chart";
import { evidenceFromResponse, initialEvidence } from "@/lib/ui/chat-evidence";
import {
  chatErrorFromResponse,
  classifyChatError,
  emptyAssistantResponseError,
  isEmptyAssistantResponse,
  type ChatErrorState,
} from "@/lib/ui/chat-errors";
import {
  defaultModelSettingsDraft,
  modelSettingsDraftFromStorage,
  modelSettingsRequestFromDraft,
  modelSettingsStorageKey,
  modelSettingsStorageValue,
  type ModelSettingsDraft,
} from "@/lib/ui/model-settings";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ChartOnboarding } from "./chart-onboarding";
import { ChatPanel, type ChatMessage } from "./chat-panel";
import { EvidenceDrawer } from "./evidence-drawer";
import { ModelSettingsPanel } from "./model-settings-panel";
import { TopicEntry } from "./topic-entry";

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
  const [evidence, setEvidence] = useState(initialEvidence);
  const [chartSynced, setChartSynced] = useState(false);
  const [modelSettings, setModelSettings] = useState<ModelSettingsDraft>(() => {
    if (typeof window === "undefined") return defaultModelSettingsDraft;
    return modelSettingsDraftFromStorage(window.localStorage.getItem(modelSettingsStorageKey));
  });

  useEffect(() => {
    window.localStorage.setItem(modelSettingsStorageKey, modelSettingsStorageValue(modelSettings));
  }, [modelSettings]);

  const workspace = (
    <WorkspacePanel
      chartInput={chartInput}
      chartSynced={chartSynced}
      onChartReady={(nextChart) => {
        setChartInput(nextChart);
        setChartSynced(false);
        setError(null);
      }}
      onClear={deleteLocalData}
      onModelSettingsChange={setModelSettings}
      onResetChart={resetChartDraft}
      onTopicSelect={setDraft}
      modelSettings={modelSettings}
      profileId={profileId}
    />
  );

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
          modelSettings: modelSettingsRequestFromDraft(modelSettings),
        }),
      });
      const responseError = chatErrorFromResponse(response);
      if (responseError) {
        setError(responseError);
        setLastFailedContent(content);
        return;
      }

      const nextEvidence = evidenceFromResponse(response);
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

      setEvidence(nextEvidence);
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
      window.localStorage.removeItem(modelSettingsStorageKey);
    }
    setChartInput(null);
    setChartSynced(false);
    setMessages([]);
    setDraft("");
    setLastFailedContent(null);
    setError(null);
    setEvidence(initialEvidence);
    setModelSettings(defaultModelSettingsDraft);
  }

  return (
    <main className="flex h-[100dvh] min-h-[100dvh] flex-col overflow-hidden bg-background text-foreground">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
            <ShieldCheck size={17} strokeWidth={1.8} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-sm font-semibold sm:text-base">Ziwei Chat</h1>
              <Badge className="hidden bg-accent text-primary sm:inline-flex" variant="secondary">
                Evidence Companion
              </Badge>
            </div>
            <p className="hidden text-xs text-muted-foreground sm:block">
              可信命盘分析工作台
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Sheet>
            <SheetTrigger
              render={
                <Button className="lg:hidden" size="sm" type="button" variant="outline" />
              }
            >
              <Menu data-icon="inline-start" />
              资料
            </SheetTrigger>
            <SheetContent className="w-[340px] max-w-[calc(100vw-24px)] p-0" side="left">
              <SheetHeader className="border-b border-border">
                <SheetTitle>命盘资料</SheetTitle>
                <SheetDescription>当前匿名 profile 的命盘与主题入口。</SheetDescription>
              </SheetHeader>
              <div className="min-h-0 overflow-y-auto p-3">{workspace}</div>
            </SheetContent>
          </Sheet>

          <Sheet>
            <SheetTrigger
              render={
                <Button className="xl:hidden" size="sm" type="button" variant="outline" />
              }
            >
              依据
            </SheetTrigger>
            <SheetContent className="w-[360px] max-w-[calc(100vw-24px)] p-0" side="right">
              <SheetHeader className="border-b border-border">
                <SheetTitle>本次回答依据</SheetTitle>
                <SheetDescription>工具、命盘事实、知识来源和 critic 检查。</SheetDescription>
              </SheetHeader>
              <div className="min-h-0 overflow-y-auto p-3">
                <EvidenceDrawer compact evidence={evidence} />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <section className="grid min-h-0 flex-1 lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)_360px]">
        <aside className="hidden min-h-0 border-r border-border bg-card lg:flex lg:flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto p-3">{workspace}</div>
        </aside>

        <div className="min-h-0">
          <ChatPanel
            draft={draft}
            error={error}
            isStreaming={isStreaming}
            messages={messages}
            onDraftChange={setDraft}
            onRetry={retryLastMessage}
            onSubmit={() => void sendMessage()}
          />
        </div>

        <aside className="hidden min-h-0 border-l border-border bg-card xl:flex xl:flex-col">
          <EvidenceDrawer evidence={evidence} />
        </aside>
      </section>
    </main>
  );
}

function WorkspacePanel({
  profileId,
  chartInput,
  chartSynced,
  onChartReady,
  onModelSettingsChange,
  onResetChart,
  onTopicSelect,
  onClear,
  modelSettings,
}: {
  profileId: string;
  chartInput: CreateChartInput | null;
  chartSynced: boolean;
  modelSettings: ModelSettingsDraft;
  onChartReady: (chart: CreateChartInput) => void;
  onModelSettingsChange: (value: ModelSettingsDraft) => void;
  onResetChart: () => void;
  onTopicSelect: (prompt: string) => void;
  onClear: () => void;
}) {
  return (
    <div className="grid gap-4">
      <ChartOnboarding
        chartInput={chartInput}
        chartSynced={chartSynced}
        onChartReady={onChartReady}
        onResetChart={onResetChart}
        profileId={profileId}
      />
      <ModelSettingsPanel value={modelSettings} onChange={onModelSettingsChange} />
      <TopicEntry onSelect={onTopicSelect} />
      <ClearDataDialog onConfirm={onClear} />
    </div>
  );
}

function ClearDataDialog({ onConfirm }: { onConfirm: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button type="button" variant="outline" />}>
        <Trash2 data-icon="inline-start" />
        清除匿名资料数据
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-warning-muted text-warning">
            <Trash2 />
          </AlertDialogMedia>
          <AlertDialogTitle>清除匿名资料数据？</AlertDialogTitle>
          <AlertDialogDescription>
            这会清除当前浏览器里的匿名 profile 状态、当前命盘、对话消息和已显示的依据。
            Beta 没有产品账号，所以这不是账号删除。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction className="bg-warning text-white hover:bg-[#8e2f23]" onClick={onConfirm}>
            确认清除
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
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
