"use client";

/**
 * [INPUT]: Depends on browser localStorage, /api/chart, /api/chat, typed chat transport/session, and model settings helpers
 * [OUTPUT]: Provides anonymous profile, current chart, model settings, per-message chat/evidence, and deletion actions
 * [POS]: Persistent client state boundary mounted above all workspace routes
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from "react";

import type { CreateChartInput } from "@/lib/domain/chart";
import type { ChartDisplayModel } from "@/lib/domain/chart-display";
import { ChatClientError, sendChatRequest } from "@/lib/ui/chat-client";
import { initialEvidence, type EvidenceState } from "@/lib/ui/chat-evidence";
import { classifyChatError, type ChatErrorState } from "@/lib/ui/chat-errors";
import {
  chatRequestMessages,
  chatSessionReducer,
  initialChatSessionState,
  type ChatSessionState,
} from "@/lib/ui/chat-session";
import {
  chartDisplayModelFromStorage,
  chartSessionFromStorage,
  chartSessionStorageKey,
  chartSessionStorageValue,
  isChartDisplayModel,
} from "@/lib/ui/chart-session";
import {
  defaultModelSettingsDraft,
  modelSettingsDraftFromStorage,
  modelSettingsRequestFromDraft,
  modelSettingsStorageKey,
  modelSettingsStorageValue,
  type ModelSettingsDraft,
} from "@/lib/ui/model-settings";

type ChartApiPayload = {
  chart?: CreateChartInput;
  chartId: string;
  displayName: string;
  display: ChartDisplayModel;
};

type WorkspaceContextValue = {
  ready: boolean;
  profileId: string;
  conversationId: string;
  chartInput: CreateChartInput | null;
  chartDisplay: ChartDisplayModel | null;
  chartLoading: boolean;
  chartRestoreSettled: boolean;
  chartSynced: boolean;
  chartError: string | null;
  saveChart: (chart: CreateChartInput) => Promise<boolean>;
  resetLocalChart: () => void;
  modelSettings: ModelSettingsDraft;
  modelSettingsLoaded: boolean;
  setModelSettings: React.Dispatch<React.SetStateAction<ModelSettingsDraft>>;
  chatSession: ChatSessionState;
  sendMessage: (content: string) => Promise<void>;
  retryLastMessage: () => Promise<void>;
  resetChat: () => void;
  selectedEvidenceMessageId: string | null;
  setSelectedEvidenceMessageId: (messageId: string | null) => void;
  selectedEvidence: EvidenceState;
  deleteAnonymousData: () => Promise<boolean>;
  dataDeleting: boolean;
  dataDeletionError: string | null;
  inspectorOpen: boolean;
  setInspectorOpen: (open: boolean) => void;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [profileId, setProfileId] = useState("");
  const [conversationId, setConversationId] = useState("");
  const [chartInput, setChartInput] = useState<CreateChartInput | null>(null);
  const [chartDisplay, setChartDisplay] = useState<ChartDisplayModel | null>(null);
  const [chartLoading, setChartLoading] = useState(false);
  const [settledProfileId, setSettledProfileId] = useState("");
  const [chartSynced, setChartSynced] = useState(false);
  const [chartError, setChartError] = useState<string | null>(null);
  const [modelSettings, setModelSettings] = useState<ModelSettingsDraft>(defaultModelSettingsDraft);
  const [modelSettingsLoaded, setModelSettingsLoaded] = useState(false);
  const [chatSession, dispatchChat] = useReducer(chatSessionReducer, initialChatSessionState);
  const [selectedEvidenceMessageId, setSelectedEvidenceMessageId] = useState<string | null>(null);
  const [dataDeleting, setDataDeleting] = useState(false);
  const [dataDeletionError, setDataDeletionError] = useState<string | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const chatAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const bootstrapTimer = window.setTimeout(() => {
      const storedProfileId = window.localStorage.getItem("ziwei-chat-profile-id");
      const nextProfileId = isUuid(storedProfileId) ? storedProfileId : crypto.randomUUID();
      window.localStorage.setItem("ziwei-chat-profile-id", nextProfileId);
      setProfileId(nextProfileId);
      setConversationId(crypto.randomUUID());
      setModelSettings(modelSettingsDraftFromStorage(window.localStorage.getItem(modelSettingsStorageKey)));
      setModelSettingsLoaded(true);
      setReady(true);
    }, 0);

    return () => window.clearTimeout(bootstrapTimer);
  }, []);

  useEffect(() => {
    if (!modelSettingsLoaded) return;
    window.localStorage.setItem(modelSettingsStorageKey, modelSettingsStorageValue(modelSettings));
  }, [modelSettings, modelSettingsLoaded]);

  useEffect(() => {
    if (!profileId) return;
    let cancelled = false;
    const restoreTimer = window.setTimeout(() => {
      setChartError(null);
      setChartInput(null);
      setChartDisplay(null);
      setChartSynced(false);
      const storageKey = chartSessionStorageKey(profileId);
      const storedValue = window.localStorage.getItem(storageKey);
      const storedChart = chartSessionFromStorage(storedValue, profileId);
      const storedDisplay = chartDisplayModelFromStorage(storedValue, profileId);

      if (storedChart) setChartInput(storedChart);
      if (storedChart && storedDisplay) {
        setChartDisplay(storedDisplay);
        setChartSynced(true);
        setChartLoading(false);
        setSettledProfileId(profileId);
        return;
      }

      setChartLoading(true);
      void fetch(`/api/chart?profileId=${encodeURIComponent(profileId)}`)
        .then(async (response) => {
          if (response.status === 404) return null;
          if (!response.ok) throw new Error("命盘恢复暂时不可用，请稍后重试。");
          return (await response.json()) as ChartApiPayload;
        })
        .then((payload) => {
          if (cancelled || !payload || !payload.chart) return;
          if (!isChartDisplayModel(payload.display)) throw new Error("命盘展示数据不完整，请重试。");
          const primaryChart = { ...payload.chart, profileId, isPrimary: true };
          setChartInput(primaryChart);
          setChartDisplay(payload.display);
          setChartSynced(true);
          window.localStorage.setItem(
            storageKey,
            chartSessionStorageValue(primaryChart, null, payload.display),
          );
        })
        .catch((error: unknown) => {
          if (!cancelled) setChartError(error instanceof Error ? error.message : "命盘恢复失败。");
        })
        .finally(() => {
          if (!cancelled) {
            setChartLoading(false);
            setSettledProfileId(profileId);
          }
        });
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(restoreTimer);
    };
  }, [profileId]);

  useEffect(() => () => chatAbortRef.current?.abort(), []);

  const saveChart = useCallback(async (nextChart: CreateChartInput) => {
    setChartLoading(true);
    setChartError(null);
    try {
      const response = await fetch("/api/chart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId, chart: nextChart }),
      });
      if (!response.ok) throw new Error("命盘保存失败，请检查出生信息后重试。");
      const payload = (await response.json()) as ChartApiPayload;
      if (!isChartDisplayModel(payload.display)) throw new Error("命盘展示数据不完整，请重试。");
      const primaryChart = { ...nextChart, profileId, isPrimary: true };
      setChartInput(primaryChart);
      setChartDisplay(payload.display);
      setChartSynced(true);
      setSettledProfileId(profileId);
      window.localStorage.setItem(
        chartSessionStorageKey(profileId),
        chartSessionStorageValue(primaryChart, null, payload.display),
      );
      return true;
    } catch (error) {
      setChartError(error instanceof Error ? error.message : "命盘保存失败。");
      setChartSynced(false);
      return false;
    } finally {
      setChartLoading(false);
    }
  }, [profileId]);

  const resetLocalChart = useCallback(() => {
    if (!profileId) return;
    window.localStorage.removeItem(chartSessionStorageKey(profileId));
    setChartInput(null);
    setChartDisplay(null);
    setChartSynced(false);
    setChartError(null);
  }, [profileId]);

  const sendMessage = useCallback(async (rawContent: string) => {
    const content = rawContent.trim();
    if (!content || !profileId || !conversationId || chatAbortRef.current) return;

    const requestId = crypto.randomUUID();
    const evidenceRunId = crypto.randomUUID();
    const assistantMessageId = crypto.randomUUID();
    const action = {
      type: "turn_started" as const,
      requestId,
      content,
      evidenceRunId,
      userMessageId: crypto.randomUUID(),
      assistantMessageId,
    };
    const nextSession = chatSessionReducer(chatSession, action);
    if (nextSession === chatSession) return;

    const controller = new AbortController();
    chatAbortRef.current = controller;
    setSelectedEvidenceMessageId(assistantMessageId);
    dispatchChat(action);

    try {
      await sendChatRequest({
        profileId,
        conversationId,
        messages: chatRequestMessages(nextSession),
        chartInput: chartInput ?? undefined,
        modelSettings: modelSettingsRequestFromDraft(modelSettings),
        evidenceRunId,
        signal: controller.signal,
      }, {
        onEvidence: (evidence) => dispatchChat({ type: "evidence_received", requestId, evidence }),
        onToken: (token) => dispatchChat({ type: "token_received", requestId, token }),
      });
      dispatchChat({ type: "turn_completed", requestId });
      if (chartInput) setChartSynced(true);
    } catch (error) {
      dispatchChat({ type: "turn_failed", requestId, error: toChatError(error) });
    } finally {
      if (chatAbortRef.current === controller) chatAbortRef.current = null;
    }
  }, [chartInput, chatSession, conversationId, modelSettings, profileId]);

  const retryLastMessage = useCallback(async () => {
    if (chatSession.lastFailedContent) await sendMessage(chatSession.lastFailedContent);
  }, [chatSession.lastFailedContent, sendMessage]);

  const resetChat = useCallback(() => {
    chatAbortRef.current?.abort();
    chatAbortRef.current = null;
    dispatchChat({ type: "session_reset" });
    setConversationId(crypto.randomUUID());
    setSelectedEvidenceMessageId(null);
  }, []);

  const deleteAnonymousData = useCallback(async () => {
    if (!profileId || dataDeleting) return false;
    setDataDeleting(true);
    setDataDeletionError(null);
    try {
      const response = await fetch(`/api/chat?profileId=${encodeURIComponent(profileId)}`, { method: "DELETE" });
      if (!response.ok) throw new Error("匿名资料未能完整删除，请稍后重试。");

      chatAbortRef.current?.abort();
      chatAbortRef.current = null;
      window.localStorage.removeItem("ziwei-chat-profile-id");
      window.localStorage.removeItem(modelSettingsStorageKey);
      window.localStorage.removeItem(chartSessionStorageKey(profileId));
      const nextProfileId = crypto.randomUUID();
      window.localStorage.setItem("ziwei-chat-profile-id", nextProfileId);
      setProfileId(nextProfileId);
      setConversationId(crypto.randomUUID());
      setChartInput(null);
      setChartDisplay(null);
      setChartSynced(false);
      setChartError(null);
      setModelSettings(defaultModelSettingsDraft);
      dispatchChat({ type: "session_reset" });
      setSelectedEvidenceMessageId(null);
      return true;
    } catch (error) {
      setDataDeletionError(error instanceof Error ? error.message : "匿名资料删除失败。");
      return false;
    } finally {
      setDataDeleting(false);
    }
  }, [dataDeleting, profileId]);

  const selectedEvidence = useMemo(() => {
    const selected = selectedEvidenceMessageId
      ? chatSession.messages.find((message) => message.id === selectedEvidenceMessageId)
      : null;
    const latestAssistant = [...chatSession.messages].reverse().find((message) => message.role === "assistant");
    return selected?.evidence ?? latestAssistant?.evidence ?? initialEvidence;
  }, [chatSession.messages, selectedEvidenceMessageId]);

  const chartRestoreSettled = profileId !== "" && settledProfileId === profileId;

  const value = useMemo<WorkspaceContextValue>(() => ({
    ready,
    profileId,
    conversationId,
    chartInput,
    chartDisplay,
    chartLoading,
    chartRestoreSettled,
    chartSynced,
    chartError,
    saveChart,
    resetLocalChart,
    modelSettings,
    modelSettingsLoaded,
    setModelSettings,
    chatSession,
    sendMessage,
    retryLastMessage,
    resetChat,
    selectedEvidenceMessageId,
    setSelectedEvidenceMessageId,
    selectedEvidence,
    deleteAnonymousData,
    dataDeleting,
    dataDeletionError,
    inspectorOpen,
    setInspectorOpen,
  }), [
    ready,
    profileId,
    conversationId,
    chartInput,
    chartDisplay,
    chartLoading,
    chartRestoreSettled,
    chartSynced,
    chartError,
    saveChart,
    resetLocalChart,
    modelSettings,
    modelSettingsLoaded,
    chatSession,
    sendMessage,
    retryLastMessage,
    resetChat,
    selectedEvidenceMessageId,
    selectedEvidence,
    deleteAnonymousData,
    dataDeleting,
    dataDeletionError,
    inspectorOpen,
  ]);

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return value;
}

function isUuid(value: string | null): value is string {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));
}

function toChatError(error: unknown): ChatErrorState {
  if (error instanceof ChatClientError) {
    return { kind: error.kind, message: error.message, canRetry: error.canRetry };
  }
  return classifyChatError(error);
}
