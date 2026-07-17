"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import Link from "next/link";

import type { InsightAggregation, InsightReport, InsightSourceBundle } from "../../lib/insights/contracts";
import { aggregateInsightSources, insightEligibility } from "../../lib/insights/source";
import { parseInsightReport, readInsightCache, writeInsightCache, type InsightCacheRead } from "../../lib/ui/insight-cache";
import { loadInsightSourceBundle, type CurrentInsightSession } from "../../lib/ui/insight-sources";
import { modelSettingsRequestFromDraft, modelSettingsStatus, type ModelSettingsDraft } from "../../lib/ui/model-settings";
import type { ChatSessionMessage } from "../../lib/ui/chat-session";
import { useWorkspace } from "../workspace/workspace-provider";
import { InsightsEmptyState } from "./insights-empty-state";
import { PatternList } from "./pattern-list";
import { WeeklyLetter } from "./weekly-letter";

export type InsightControllerError = { message: string; canRetry: boolean; settingsRequired?: boolean };
export type InsightControllerState =
  | { status: "loading"; profileId: string }
  | { status: "insufficient"; profileId: string; aggregation: InsightAggregation }
  | { status: "ready"; profileId: string; aggregation: InsightAggregation; report: InsightReport }
  | { status: "stale"; profileId: string; aggregation: InsightAggregation; report: InsightReport }
  | { status: "error"; profileId: string; error: InsightControllerError };

export type InsightControllerAction =
  | { type: "load_started"; profileId: string }
  | { type: "insufficient"; profileId: string; aggregation: InsightAggregation }
  | { type: "cache_hit"; profileId: string; aggregation: InsightAggregation; report: InsightReport }
  | { type: "stale"; profileId: string; aggregation: InsightAggregation; report: InsightReport }
  | { type: "generated"; profileId: string; aggregation: InsightAggregation; report: InsightReport }
  | { type: "failed"; profileId: string; error: InsightControllerError };

export const initialInsightControllerState: InsightControllerState = { status: "loading", profileId: "" };

export function insightControllerReducer(state: InsightControllerState, action: InsightControllerAction): InsightControllerState {
  if (action.type !== "load_started" && state.profileId && state.profileId !== action.profileId) return state;
  if (action.type === "load_started") return { status: "loading", profileId: action.profileId };
  if (action.type === "insufficient") return { status: "insufficient", profileId: action.profileId, aggregation: action.aggregation };
  if (action.type === "cache_hit" || action.type === "generated") return { status: "ready", profileId: action.profileId, aggregation: action.aggregation, report: action.report };
  if (action.type === "stale") return { status: "stale", profileId: action.profileId, aggregation: action.aggregation, report: action.report };
  return { status: "error", profileId: action.profileId, error: action.error };
}

export function resolveInsightCacheState(aggregation: InsightAggregation, cache: InsightCacheRead):
  | { status: "insufficient" }
  | { status: "generate" }
  | { status: "ready"; report: InsightReport }
  | { status: "stale"; report: InsightReport } {
  if (!insightEligibility(aggregation).eligible) return { status: "insufficient" };
  if (cache.status === "hit") return { status: "ready", report: cache.report };
  if (cache.status === "stale") return { status: "stale", report: cache.report };
  return { status: "generate" };
}

type FetchImplementation = typeof fetch;

export type InsightLifecycleDependencies = {
  loadSourceBundle: (profileId: string, currentSession: CurrentInsightSession | null, fetchImpl: FetchImplementation, signal: AbortSignal) => Promise<InsightSourceBundle>;
  aggregateSources: (sourceBundle: InsightSourceBundle) => Promise<InsightAggregation>;
  readCache: (profileId: string, sourceFingerprint: string) => InsightCacheRead;
  writeCache: (profileId: string, report: InsightReport) => boolean;
  fetchImpl: FetchImplementation;
  modelSettingsReady: (settings: ModelSettingsDraft) => boolean;
  modelSettingsRequest: (settings: ModelSettingsDraft) => unknown;
  emit: (action: InsightControllerAction) => void;
};

export type InsightLifecycleInput = {
  profileId: string;
  currentSession: CurrentInsightSession | null;
  modelSettings: ModelSettingsDraft;
  refreshAuthorizationFingerprint: string | null;
  signal: AbortSignal;
  isCurrent: () => boolean;
};

const insightLifecycleDependencies: Omit<InsightLifecycleDependencies, "emit"> = {
  loadSourceBundle: loadInsightSourceBundle,
  aggregateSources: aggregateInsightSources,
  readCache: readInsightCache,
  writeCache: writeInsightCache,
  fetchImpl: fetch,
  modelSettingsReady: (settings) => modelSettingsStatus(settings).ready,
  modelSettingsRequest: modelSettingsRequestFromDraft,
};

export async function runInsightLifecycle(input: InsightLifecycleInput, dependencies: InsightLifecycleDependencies): Promise<void> {
  const { profileId, currentSession, modelSettings, refreshAuthorizationFingerprint, signal, isCurrent } = input;
  const emit = (action: InsightControllerAction) => { if (isCurrent()) dependencies.emit(action); };
  try {
    const sourceBundle = await dependencies.loadSourceBundle(profileId, currentSession, dependencies.fetchImpl, signal);
    if (!isCurrent()) return;
    const aggregation = await dependencies.aggregateSources(sourceBundle);
    if (!isCurrent()) return;
    const resolution = resolveInsightCacheState(aggregation, dependencies.readCache(profileId, aggregation.sourceFingerprint));
    if (resolution.status === "insufficient") return emit({ type: "insufficient", profileId, aggregation });
    if (resolution.status === "ready") return emit({ type: "cache_hit", profileId, aggregation, report: resolution.report });
    if (resolution.status === "stale" && refreshAuthorizationFingerprint !== aggregation.sourceFingerprint) {
      return emit({ type: "stale", profileId, aggregation, report: resolution.report });
    }
    if (!dependencies.modelSettingsReady(modelSettings)) {
      return emit({ type: "failed", profileId, error: { message: "请先完成模型设置，再生成新的洞见。", canRetry: false, settingsRequired: true } });
    }
    const response = await dependencies.fetchImpl("/api/insights", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal,
      body: JSON.stringify({ sourceBundle: aggregation.sources, modelSettings: dependencies.modelSettingsRequest(modelSettings) }),
    });
    const payload = await readJson(response);
    if (!isCurrent()) return;
    if (response.ok) {
      const report = parseInsightReport(payload);
      if (!report || report.sourceFingerprint !== aggregation.sourceFingerprint) {
        return emit({ type: "failed", profileId, error: { message: "洞见响应未通过完整性检查，请重试。", canRetry: true } });
      }
      try {
        dependencies.writeCache(profileId, report);
      } catch {
        // Cache is best-effort; an approved report remains safe to render.
      }
      return emit({ type: "generated", profileId, aggregation, report });
    }
    const error = parseInsightApiError(payload);
    if (error.code === "INSUFFICIENT_HISTORY") return emit({ type: "insufficient", profileId, aggregation });
    return emit({ type: "failed", profileId, error: error.code === "MODEL_SETTINGS_REQUIRED"
      ? { message: error.message, canRetry: false, settingsRequired: true }
      : { message: error.message, canRetry: error.canRetry } });
  } catch (error) {
    if (!isCurrent()) return;
    dependencies.emit({ type: "failed", profileId, error: { message: error instanceof Error ? error.message : "洞见读取失败，请重试。", canRetry: true } });
  }
}

export function currentInsightSessionSnapshot(
  conversationId: string,
  messages: ChatSessionMessage[],
): CurrentInsightSession | null {
  if (!conversationId) return null;
  const completed = messages.filter((message) =>
    (message.role === "user" || message.role === "assistant")
    && message.status === "complete"
    && Boolean(message.content.trim()),
  ).map(({ id, role, content }) => ({ id, role, content: content.trim() }));
  return completed.length ? { conversationId, messages: completed } : null;
}

function currentInsightSessionSnapshotFromKey(
  conversationId: string,
  snapshotKey: string,
) {
  if (!conversationId) return null;
  const messages = JSON.parse(snapshotKey) as Array<Pick<ChatSessionMessage, "id" | "role" | "content">>;
  return messages.length ? { conversationId, messages } : null;
}

export function InsightsController() {
  const { ready, profileId, conversationId, chatSession, modelSettings, modelSettingsLoaded, dataDeleting } = useWorkspace();
  const [state, dispatch] = useReducer(insightControllerReducer, initialInsightControllerState);
  const [refreshAuthorizationFingerprint, setRefreshAuthorizationFingerprint] = useState<string | null>(null);
  const [retryRevision, setRetryRevision] = useState(0);
  const requestRevision = useRef(0);
  const completedSessionKey = useMemo(() => JSON.stringify(chatSession.messages
    .filter((message) => (message.role === "user" || message.role === "assistant") && message.status === "complete" && Boolean(message.content.trim()))
    .map(({ id, role, content }) => ({ id, role, content: content.trim() }))), [chatSession.messages]);
  const currentSession = useMemo(
    () => currentInsightSessionSnapshotFromKey(conversationId, completedSessionKey),
    [completedSessionKey, conversationId],
  );
  const staleFingerprint = state.status === "stale" ? state.aggregation.sourceFingerprint : null;

  const refresh = useCallback(() => {
    if (staleFingerprint) setRefreshAuthorizationFingerprint(staleFingerprint);
    setRetryRevision((revision) => revision + 1);
  }, [staleFingerprint]);

  useEffect(() => {
    if (!ready || !profileId || !modelSettingsLoaded || dataDeleting || chatSession.activeRequestId) return;
    const revision = ++requestRevision.current;
    const controller = new AbortController();
    const isCurrent = () => !controller.signal.aborted && requestRevision.current === revision;
    dispatch({ type: "load_started", profileId });

    void runInsightLifecycle({
      profileId,
      currentSession,
      modelSettings,
      refreshAuthorizationFingerprint,
      signal: controller.signal,
      isCurrent,
    }, { ...insightLifecycleDependencies, emit: dispatch });

    return () => controller.abort();
  }, [chatSession.activeRequestId, currentSession, dataDeleting, modelSettings, modelSettingsLoaded, profileId, ready, refreshAuthorizationFingerprint, retryRevision]);

  if (state.status === "loading") return <p role="status" aria-live="polite" className="text-sm text-muted-foreground">正在核对可用对话记录。</p>;
  if (state.status === "insufficient") return <InsightsEmptyState eligibility={insightEligibility(state.aggregation)} />;
  if (state.status === "error") return <InsightError error={state.error} onRetry={refresh} />;
  return <div className="flex flex-col gap-8">
    {state.status === "stale" && <StaleReport onRefresh={refresh} />}
    <WeeklyLetter report={state.report} aggregation={state.aggregation} />
    <ReportMetadata report={state.report} />
    <PatternList report={state.report} aggregation={state.aggregation} />
  </div>;
}

function StaleReport({ onRefresh }: { onRefresh: () => void }) {
  return <div role="status" aria-live="polite" className="flex flex-wrap items-center justify-between gap-3 border-y border-border py-3 text-sm text-muted-foreground">
    <p>这份周信基于较早的对话记录，尚未反映当前来源。</p>
    <button type="button" onClick={onRefresh} className="font-medium text-primary hover:text-primary/80">刷新洞见</button>
  </div>;
}

function ReportMetadata({ report }: { report: InsightReport }) {
  return <p className="text-xs text-muted-foreground">来源窗口 <time dateTime={report.sourceWindow.from}>{formatTime(report.sourceWindow.from)}</time> 至 <time dateTime={report.sourceWindow.to}>{formatTime(report.sourceWindow.to)}</time>，生成于 <time dateTime={report.generatedAt}>{formatTime(report.generatedAt)}</time>。</p>;
}

function InsightError({ error, onRetry }: { error: InsightControllerError; onRetry: () => void }) {
  return <section role="alert" className="border-y border-border py-8">
    <h2 className="font-serif text-xl text-foreground">洞见暂时无法生成</h2>
    <p className="mt-3 text-sm leading-7 text-muted-foreground">{error.message}</p>
    {error.settingsRequired ? <Link href="/settings" className="mt-5 inline-flex border-b border-primary text-sm font-medium text-primary">前往设置</Link>
      : error.canRetry && <button type="button" onClick={onRetry} className="mt-5 border-b border-primary text-sm font-medium text-primary">重试</button>}
  </section>;
}

async function readJson(response: Response): Promise<unknown> {
  try { return await response.json(); } catch { return null; }
}

function parseInsightApiError(value: unknown) {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    const error = value as Record<string, unknown>;
    if (typeof error.code === "string" && typeof error.message === "string" && typeof error.canRetry === "boolean") {
      return { code: error.code, message: error.message, canRetry: error.canRetry };
    }
  }
  return { code: "UNKNOWN", message: "洞见服务暂时不可用，请重试。", canRetry: true };
}

function formatTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(date);
}
