"use client";

/**
 * [INPUT]: Depends on chart onboarding, topic entry, chat panel, evidence drawer, shadcn Sheet/AlertDialog, and /api/chat
 * [OUTPUT]: Provides the coordinated MVP Ziwei Chat application shell
 * [POS]: Client state boundary for anonymous profile, primary chart draft, chat streaming, error handling, and evidence display
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

import { useEffect, useState } from "react";
import { Menu, PanelRightOpen, Trash2 } from "lucide-react";

import type { ChartSummary, CreateChartInput } from "@/lib/domain/chart";
import { chatStreamHeader, readChatStreamEvents } from "@/lib/agent/evidence-events";
import {
  evidenceFromPayload,
  evidenceFromResponse,
  initialEvidence,
  mergeEvidenceRun,
  type EvidenceRun,
  type EvidenceState,
} from "@/lib/ui/chat-evidence";
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
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { AppSidebar } from "./app-sidebar";
import { ChartWorkspace } from "./chart-workspace";
import { ChatPanel, type ChatMessage } from "./chat-panel";
import { EvidenceDrawer } from "./evidence-drawer";
import { RecordsWorkspace } from "./records-workspace";
import { SettingsWorkspace } from "./settings-workspace";
import { TopicsWorkspace } from "./topics-workspace";
import { greetingForChart, type WorkspaceView } from "@/lib/ui/workspace-navigation";
import { chartInputForChatRequest } from "@/lib/ui/chat-request";
import {
  chartSessionFromStorage,
  chartSessionStorageKey,
  chartSessionStorageValue,
  chartVisualModelFromStorage,
} from "@/lib/ui/chart-session";
import { activateChartVisualModel, buildChartVisualModel, type ChartVisualModel } from "@/lib/ui/chart-visual";
import type { ChartDiscMotionPhase } from "./chart-disc-motion";

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
  const [chartVisualModel, setChartVisualModel] = useState<ChartVisualModel | null>(null);
  const [chartMotionPhase, setChartMotionPhase] = useState<ChartDiscMotionPhase>("empty");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [lastFailedContent, setLastFailedContent] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<ChatErrorState | null>(null);
  const [evidence, setEvidence] = useState(initialEvidence);
  const [chartSynced, setChartSynced] = useState(false);
  const [modelSettings, setModelSettings] = useState<ModelSettingsDraft>(defaultModelSettingsDraft);
  const [modelSettingsLoaded, setModelSettingsLoaded] = useState(false);
  const [activeView, setActiveView] = useState<WorkspaceView>("chat");

  useEffect(() => {
    const task = window.setTimeout(() => {
      setModelSettings(modelSettingsDraftFromStorage(window.localStorage.getItem(modelSettingsStorageKey)));
      setModelSettingsLoaded(true);
    }, 0);

    return () => window.clearTimeout(task);
  }, []);

  useEffect(() => {
    if (!modelSettingsLoaded) return;
    window.localStorage.setItem(modelSettingsStorageKey, modelSettingsStorageValue(modelSettings));
  }, [modelSettings, modelSettingsLoaded]);

  useEffect(() => {
    const restored = chartSessionFromStorage(
      window.localStorage.getItem(chartSessionStorageKey(profileId)),
      profileId,
    );
    let active = true;
    const task = window.setTimeout(() => {
      if (restored) {
        setChartInput(restored);
        setChartVisualModel(chartVisualModelFromStorage(
          window.localStorage.getItem(chartSessionStorageKey(profileId)),
          profileId,
        ));
        setChartMotionPhase("ready");
        return;
      }

      void fetch(`/api/chart?profileId=${encodeURIComponent(profileId)}`)
        .then(async (response) => {
          if (!response.ok || !active) return;
          const payload = (await response.json()) as {
            chart: CreateChartInput;
            chartId: string;
            displayName: string;
            summary: ChartSummary;
          };
          const primaryChart = { ...payload.chart, profileId, isPrimary: true };
          if (!active) return;
          setChartInput(primaryChart);
          const visualModel = buildChartVisualModel(payload);
          window.localStorage.setItem(chartSessionStorageKey(profileId), chartSessionStorageValue(primaryChart, visualModel));
          setChartVisualModel(visualModel);
          setChartMotionPhase("ready");
        })
        .catch(() => {
          // A missing or unavailable persisted chart leaves the onboarding state empty.
        });
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(task);
    };
  }, [profileId]);

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
    if (chartVisualModel) setChartMotionPhase("analyzing");
    const evidenceRunId = createClientUuid();
    setEvidence((current) => mergeEvidenceRun(current, createPendingEvidenceRun(evidenceRunId, content)));

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId,
          conversationId,
          chartInput: chartInputForChatRequest(chartInput),
          evidenceRunId,
          messages: nextMessages,
          modelSettings: modelSettingsRequestFromDraft(modelSettings),
        }),
      });
      const responseError = chatErrorFromResponse(response);
      if (responseError) {
        setEvidence((current) => failEvidenceRun(current, evidenceRunId));
        if (chartVisualModel) setChartMotionPhase("failed");
        setError(responseError);
        setLastFailedContent(content);
        return;
      }

      const nextEvidence = evidenceFromResponse(response);
      setEvidence((current) => mergeEvidenceState(current, nextEvidence));
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";
      let eventBuffer = "";
      let streamError: ChatErrorState | null = null;
      const usesEventStream = response.headers.get("X-Ziwei-Stream") === chatStreamHeader;

      setMessages((current) => [...current, { role: "assistant", content: "" }]);

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          if (usesEventStream) {
            eventBuffer += chunk;
            const parsed = readChatStreamEvents(eventBuffer);
            eventBuffer = parsed.rest;
            for (const event of parsed.events) {
              if (event.event === "evidence") {
                const payloadEvidence = evidenceFromPayload(event.data);
                setEvidence((current) => mergeEvidenceState(current, payloadEvidence));
                setChartMotionPhase(chartMotionPhaseFromEvidence(payloadEvidence, Boolean(chartVisualModel)));
                if (payloadEvidence.chartFacts.length > 0) {
                  setChartVisualModel((current) => current ? activateChartVisualModel(current, payloadEvidence.chartFacts.map((fact) => fact.palace)) : current);
                }
              }
              if (event.event === "token") {
                assistantContent += event.data;
              }
              if (event.event === "error") {
                streamError = {
                  kind: "server",
                  message: event.data.message,
                  canRetry: event.data.canRetry,
                };
              }
            }
          } else {
            assistantContent += chunk;
          }
          setMessages((current) =>
            current.map((message, index) =>
              index === current.length - 1
                ? { ...message, content: assistantContent }
                : message,
            ),
          );
        }
      }

      if (streamError) {
        setMessages((current) => current.slice(0, -1));
        setEvidence((current) => failEvidenceRun(current, evidenceRunId));
        if (chartVisualModel) setChartMotionPhase("failed");
        setError(streamError);
        setLastFailedContent(content);
        return;
      }

      if (isEmptyAssistantResponse(assistantContent)) {
        setMessages((current) => current.slice(0, -1));
        setEvidence((current) => failEvidenceRun(current, evidenceRunId));
        if (chartVisualModel) setChartMotionPhase("failed");
        setError(emptyAssistantResponseError());
        setLastFailedContent(content);
        return;
      }

      if (chartInput) {
        setChartSynced(true);
      }
      if (chartVisualModel) setChartMotionPhase("complete");
      setLastFailedContent(null);
    } catch (caught) {
      setEvidence((current) => failEvidenceRun(current, evidenceRunId));
      if (chartVisualModel) setChartMotionPhase("failed");
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
    window.localStorage.removeItem(chartSessionStorageKey(profileId));
    setChartInput(null);
    setChartVisualModel(null);
    setChartMotionPhase("empty");
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
      window.localStorage.removeItem(chartSessionStorageKey(profileId));
    }
    setChartInput(null);
    setChartVisualModel(null);
    setChartMotionPhase("empty");
    setChartSynced(false);
    setMessages([]);
    setDraft("");
    setLastFailedContent(null);
    setError(null);
    setEvidence(initialEvidence);
    setModelSettings(defaultModelSettingsDraft);
    setActiveView("chat");
  }

  async function handleChartReady(nextChart: CreateChartInput) {
    setChartSynced(false);
    setError(null);
    setChartMotionPhase("calculating");
    try {
      const response = await fetch("/api/chart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId, chart: nextChart }),
      });
      if (!response.ok) throw new Error("chart request failed");
      const payload = (await response.json()) as { chartId: string; displayName: string; summary: ChartSummary };
      const primaryChart = { ...nextChart, profileId, isPrimary: true };
      setChartInput(primaryChart);
      const visualModel = buildChartVisualModel(payload);
      window.localStorage.setItem(chartSessionStorageKey(profileId), chartSessionStorageValue(primaryChart, visualModel));
      setChartVisualModel(visualModel);
      setChartMotionPhase("ready");
    } catch {
      setChartVisualModel(null);
      setChartMotionPhase("failed");
      setError({ kind: "server", message: "命盘生成未完成，请检查出生资料后重试。", canRetry: false });
    }
  }

  function selectTopic(prompt: string) {
    setActiveView("chat");
    setDraft(prompt);
  }

  const localDataActions = <ClearDataDialog onConfirm={deleteLocalData} />;
  const evidencePanel = <EvidenceDrawer evidence={evidence} modelSettings={modelSettings} localDataActions={localDataActions} />;
  const mainWorkspace = (() => {
    switch (activeView) {
      case "chart":
        return <ChartWorkspace chartInput={chartInput} chartMotionPhase={chartMotionPhase} chartSynced={chartSynced} chartVisualModel={chartVisualModel} onChartReady={(chart) => void handleChartReady(chart)} onResetChart={resetChartDraft} profileId={profileId} />;
      case "topics":
        return <TopicsWorkspace onSelect={selectTopic} />;
      case "records":
        return <RecordsWorkspace messages={messages} />;
      case "settings":
        return <SettingsWorkspace loaded={modelSettingsLoaded} localDataActions={localDataActions} onChange={setModelSettings} value={modelSettings} />;
      default:
        return <ChatPanel chartMotionPhase={chartMotionPhase} chartVisualModel={chartVisualModel} draft={draft} error={error} greeting={greetingForChart(chartInput)} isStreaming={isStreaming} messages={messages} onDraftChange={setDraft} onRetry={retryLastMessage} onSubmit={() => void sendMessage()} onTopicSelect={selectTopic} />;
    }
  })();

  return (
    <main className="flex h-[100dvh] min-h-[100dvh] flex-col overflow-hidden bg-background text-foreground">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-3 lg:hidden">
        <p className="font-semibold">紫微知道</p>
        <div className="flex items-center gap-2">
          <Sheet>
            <SheetTrigger
              render={
                <Button aria-label="打开导航与命盘资料" className="lg:hidden" size="sm" title="导航与命盘资料" type="button" variant="outline" />
              }
            >
              <Menu data-icon="inline-start" />
            </SheetTrigger>
            <SheetContent className="w-[340px] max-w-[calc(100vw-24px)] p-0" side="left">
              <SheetHeader className="border-b border-border">
                <SheetTitle>紫微知道</SheetTitle>
                <SheetDescription>命盘资料、主题与本地设置。</SheetDescription>
              </SheetHeader>
              <div className="h-[calc(100dvh-88px)]"><AppSidebar activeView={activeView} chartInput={chartInput} chartMotionPhase={chartMotionPhase} chartSynced={chartSynced} chartVisualModel={chartVisualModel} onEditChart={() => setActiveView("chart")} onSelectView={setActiveView} /></div>
            </SheetContent>
          </Sheet>

          <Sheet>
            <SheetTrigger
              render={
                <Button aria-label="打开分析依据" className="xl:hidden" size="sm" title="分析依据" type="button" variant="outline" />
              }
            >
              <PanelRightOpen data-icon="inline-start" />
            </SheetTrigger>
            <SheetContent className="w-[360px] max-w-[calc(100vw-24px)] p-0" side="right">
              <SheetHeader className="border-b border-border">
                <SheetTitle>分析依据</SheetTitle>
                <SheetDescription>分析过程、命盘事实与运行状态。</SheetDescription>
              </SheetHeader>
              <div className="min-h-0 overflow-y-auto p-3">
                <EvidenceDrawer compact evidence={evidence} localDataActions={localDataActions} modelSettings={modelSettings} />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <section className="workspace-grid grid min-h-0 flex-1">
        <aside className="hidden min-h-0 border-r border-border bg-card lg:flex lg:flex-col"><AppSidebar activeView={activeView} chartInput={chartInput} chartMotionPhase={chartMotionPhase} chartSynced={chartSynced} chartVisualModel={chartVisualModel} onEditChart={() => setActiveView("chart")} onSelectView={setActiveView} /></aside>
        <div className="min-h-0 overflow-y-auto">{mainWorkspace}</div>
        <aside className="hidden min-h-0 border-l border-border bg-card xl:flex xl:flex-col">{evidencePanel}</aside>
      </section>
    </main>
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

function createPendingEvidenceRun(runId: string, content: string): EvidenceRun {
  return {
    runId,
    title: "本次分析",
    summary: content.length > 36 ? `${content.slice(0, 36)}...` : content,
    status: "running",
    startedAt: new Date().toISOString(),
    completedAt: "",
    steps: [
      {
        id: "intent",
        label: "理解问题",
        detail: "识别主题与安全边界",
        status: "running",
      },
      {
        id: "chart",
        label: "读取命盘",
        detail: "等待服务端读取命盘事实",
        status: "pending",
      },
      {
        id: "plan",
        label: "生成计划",
        detail: "等待 Agent 规划工具和知识检索",
        status: "pending",
      },
      {
        id: "rag",
        label: "检索知识",
        detail: "等待 RAG 返回知识来源",
        status: "pending",
      },
      {
        id: "model",
        label: "模型分析",
        detail: "等待模型分析和流式输出",
        status: "pending",
      },
      {
        id: "critic",
        label: "critic 检查",
        detail: "等待事实与安全检查",
        status: "pending",
      },
    ],
  };
}

function failEvidenceRun(current: EvidenceState, runId: string): EvidenceState {
  return {
    ...current,
    runs: current.runs.map((run) =>
      run.runId === runId ? { ...run, status: "failed", completedAt: new Date().toISOString() } : run,
    ),
  };
}

function mergeEvidenceState(current: EvidenceState, next: EvidenceState): EvidenceState {
  const merged: EvidenceState = {
    toolsUsed: next.toolsUsed.length > 0 ? next.toolsUsed : current.toolsUsed,
    chartFacts: next.chartFacts.length > 0 ? next.chartFacts : current.chartFacts,
    knowledgeSources: next.knowledgeSources.length > 0 ? next.knowledgeSources : current.knowledgeSources,
    generation: next.generation.mode !== "not_applicable" ? next.generation : current.generation,
    // "not_run" means "no critic update in this snapshot" — the server never sends not_run to intentionally reset
    critic: next.critic.status !== "not_run" ? next.critic : current.critic,
    runs: current.runs,
  };
  return next.runs.reduce((acc, run) => mergeEvidenceRun(acc, run), merged);
}

function chartMotionPhaseFromEvidence(evidence: EvidenceState, hasChart: boolean): ChartDiscMotionPhase {
  if (!hasChart) return "empty";
  const run = evidence.runs.at(-1);
  if (run?.status === "failed" || evidence.generation.mode === "model_failed") return "failed";
  if (run?.steps.some((step) => step.id === "critic" && step.status === "running")) return "critic";
  if (run?.status === "running") return "analyzing";
  if (run?.status === "completed" || evidence.critic.status === "passed") return "complete";
  return "ready";
}
