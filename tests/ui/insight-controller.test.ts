import { describe, expect, test, vi } from "vitest";

vi.mock("../../src/components/workspace/workspace-provider", () => ({
  useWorkspace: vi.fn(),
}));

import type { InsightAggregation, InsightReport, InsightSourceBundle } from "../../src/lib/insights/contracts";
import { initialEvidence } from "../../src/lib/ui/chat-evidence";
import { defaultModelSettingsDraft, type ModelSettingsDraft } from "../../src/lib/ui/model-settings";
import {
  currentInsightSessionSnapshot,
  insightPresentationOwned,
  initialInsightControllerState,
  insightControllerReducer,
  reportMatchesAggregation,
  runInsightLifecycle,
  type InsightControllerAction,
  type InsightLifecycleDependencies,
} from "../../src/components/insights/insights-controller";

const profileId = "00000000-0000-4000-8000-000000000001";
const fingerprint = "a".repeat(64);
const refreshedFingerprint = "b".repeat(64);

describe("insight lifecycle coordinator", () => {
  test("loads, aggregates, posts the exact request body, validates, writes cache, and commits a generated report", async () => {
    const sourceBundle = bundle();
    const aggregate = aggregation();
    const approved = report();
    const fetchImpl = vi.fn<typeof fetch>(async () => Response.json(approved));
    const writeCache = vi.fn(() => true);
    const { actions, dependencies } = lifecycleDependencies({
      loadSourceBundle: vi.fn(async () => sourceBundle),
      aggregateSources: vi.fn(async () => aggregate),
      fetchImpl,
      writeCache,
    });

    await runInsightLifecycle(lifecycleInput(), dependencies);

    expect(dependencies.loadSourceBundle).toHaveBeenCalledWith(profileId, null, fetchImpl, expect.any(AbortSignal));
    expect(dependencies.aggregateSources).toHaveBeenCalledWith(sourceBundle);
    expect(fetchImpl).toHaveBeenCalledWith("/api/insights", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: expect.any(AbortSignal),
      body: JSON.stringify({ sourceBundle: aggregate.sources, modelSettings: modelSettings() }),
    });
    expect(writeCache).toHaveBeenCalledWith(profileId, approved);
    expect(actions).toEqual([{ type: "generated", profileId, aggregation: aggregate, report: approved }]);
  });

  test("uses an exact cache hit without invoking the provider", async () => {
    const cached = report();
    const { actions, dependencies } = lifecycleDependencies({ readCache: () => ({ status: "hit", report: cached }) });

    await runInsightLifecycle(lifecycleInput(), dependencies);

    expect(dependencies.fetchImpl).not.toHaveBeenCalled();
    expect(actions).toEqual([{ type: "cache_hit", profileId, aggregation: aggregation(), report: cached }]);
  });

  test("keeps a stale report stale until this fingerprint is explicitly authorized", async () => {
    const stale = report(refreshedFingerprint);
    const { actions, dependencies } = lifecycleDependencies({ readCache: () => ({ status: "stale", report: stale }) });

    await runInsightLifecycle(lifecycleInput(), dependencies);

    expect(dependencies.fetchImpl).not.toHaveBeenCalled();
    expect(actions).toEqual([{ type: "stale", profileId, aggregation: aggregation(), report: stale }]);
  });

  test("uses stale refresh authorization only for the matching aggregation fingerprint", async () => {
    const stale = report(refreshedFingerprint);
    const { actions, dependencies } = lifecycleDependencies({
      readCache: () => ({ status: "stale", report: stale }),
      fetchImpl: vi.fn<typeof fetch>(async () => Response.json(report())),
    });

    await runInsightLifecycle(lifecycleInput({ refreshAuthorizationFingerprint: fingerprint }), dependencies);
    const next = lifecycleDependencies({
      aggregation: aggregation({ sourceFingerprint: refreshedFingerprint }),
      readCache: () => ({ status: "stale", report: stale }),
      fetchImpl: dependencies.fetchImpl,
    });
    await runInsightLifecycle(lifecycleInput({ refreshAuthorizationFingerprint: fingerprint }), next.dependencies);

    expect(dependencies.fetchImpl).toHaveBeenCalledTimes(1);
    expect(actions.map((action) => action.type)).toEqual(["generated"]);
    expect(next.actions.map((action) => action.type)).toEqual(["stale"]);
  });

  test("renders ineligible current sources even when a stale cache entry exists", async () => {
    const { actions, dependencies } = lifecycleDependencies({
      aggregation: aggregation({ conversationCount: 1, userMessageCount: 1, activityDays: ["2026-07-17"] }),
      readCache: () => ({ status: "stale", report: report(refreshedFingerprint) }),
    });

    await runInsightLifecycle(lifecycleInput(), dependencies);

    expect(dependencies.fetchImpl).not.toHaveBeenCalled();
    expect(actions[0]).toMatchObject({ type: "insufficient", profileId });
  });

  test("returns a settings-directed error without calling the provider", async () => {
    const { actions, dependencies } = lifecycleDependencies({ modelSettingsReady: () => false });

    await runInsightLifecycle(lifecycleInput(), dependencies);

    expect(dependencies.fetchImpl).not.toHaveBeenCalled();
    expect(actions).toEqual([{ type: "failed", profileId, error: { message: "请先完成模型设置，再生成新的洞见。", canRetry: false, settingsRequired: true } }]);
  });

  test("maps structured provider and insufficient errors", async () => {
    const provider = lifecycleDependencies({
      fetchImpl: vi.fn<typeof fetch>(async () => Response.json({ code: "PROVIDER_UNAVAILABLE", message: "Provider unavailable", canRetry: true }, { status: 503 })),
    });
    const insufficient = lifecycleDependencies({
      fetchImpl: vi.fn<typeof fetch>(async () => Response.json({ code: "INSUFFICIENT_HISTORY", message: "Not enough history", canRetry: false }, { status: 422 })),
    });

    await runInsightLifecycle(lifecycleInput(), provider.dependencies);
    await runInsightLifecycle(lifecycleInput(), insufficient.dependencies);

    expect(provider.actions).toEqual([{ type: "failed", profileId, error: { message: "Provider unavailable", canRetry: true } }]);
    expect(insufficient.actions[0]).toMatchObject({ type: "insufficient", profileId });
  });

  test("retries a provider failure with a new lifecycle request", async () => {
    const fetchImpl = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ code: "PROVIDER_UNAVAILABLE", message: "Provider unavailable", canRetry: true }, { status: 503 }))
      .mockResolvedValueOnce(Response.json(report()));
    const first = lifecycleDependencies({ fetchImpl });
    const retry = lifecycleDependencies({ fetchImpl });

    await runInsightLifecycle(lifecycleInput(), first.dependencies);
    await runInsightLifecycle(lifecycleInput(), retry.dependencies);

    expect(first.actions[0]).toMatchObject({ type: "failed", error: { canRetry: true } });
    expect(retry.actions[0]).toMatchObject({ type: "generated", profileId });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  test("rejects malformed and mismatched successful responses without caching them", async () => {
    const malformed = lifecycleDependencies({ fetchImpl: vi.fn<typeof fetch>(async () => Response.json({ report: "not approved" })) });
    const mismatched = lifecycleDependencies({ fetchImpl: vi.fn<typeof fetch>(async () => Response.json(report(refreshedFingerprint))) });

    await runInsightLifecycle(lifecycleInput(), malformed.dependencies);
    await runInsightLifecycle(lifecycleInput(), mismatched.dependencies);

    expect(malformed.actions[0]).toMatchObject({ type: "failed", error: { canRetry: true } });
    expect(mismatched.actions[0]).toMatchObject({ type: "failed", error: { canRetry: true } });
    expect(malformed.dependencies.writeCache).not.toHaveBeenCalled();
    expect(mismatched.dependencies.writeCache).not.toHaveBeenCalled();
  });

  test("ignores invalid cache provenance and rejects invalid API provenance", async () => {
    const currentAggregation = aggregation({ candidates: candidateSources() });
    const unknown = report();
    unknown.weeklyLetter.paragraphs[0] = { text: "Unknown", sourceIds: ["conversation-9:message-9"] };
    const cached = lifecycleDependencies({
      aggregation: currentAggregation,
      readCache: () => ({ status: "hit", report: unknown }),
    });
    const generated = lifecycleDependencies({
      aggregation: currentAggregation,
      fetchImpl: vi.fn<typeof fetch>(async () => Response.json(unknown)),
    });

    await runInsightLifecycle(lifecycleInput(), cached.dependencies);
    await runInsightLifecycle(lifecycleInput(), generated.dependencies);

    expect(cached.actions[0]).toMatchObject({ type: "generated" });
    expect(cached.dependencies.fetchImpl).toHaveBeenCalledTimes(1);
    expect(generated.actions[0]).toMatchObject({ type: "failed", error: { canRetry: true } });
    expect(generated.dependencies.writeCache).not.toHaveBeenCalled();
  });

  test("requires one known source per paragraph and two distinct known sources per pattern", () => {
    const currentAggregation = aggregation({ candidates: candidateSources() });
    expect(reportMatchesAggregation(report(), currentAggregation)).toBe(true);
    expect(reportMatchesAggregation({
      ...report(),
      patterns: [{ ...report().patterns[0]!, sourceIds: ["conversation-1:message-1", "conversation-9:message-9"] }],
    }, currentAggregation)).toBe(false);
  });

  test("continues to render an approved report when its best-effort cache write fails", async () => {
    const { actions, dependencies } = lifecycleDependencies({ writeCache: () => { throw new Error("storage denied"); } });

    await runInsightLifecycle(lifecycleInput(), dependencies);

    expect(actions[0]).toMatchObject({ type: "generated", profileId });
  });

  test("propagates AbortSignal and suppresses a response after retry, deletion, or profile replacement", async () => {
    let resolveResponse!: (response: Response) => void;
    const response = new Promise<Response>((resolve) => { resolveResponse = resolve; });
    const fetchImpl = vi.fn<typeof fetch>(() => response);
    const { actions, dependencies } = lifecycleDependencies({ fetchImpl });
    const controller = new AbortController();
    let current = true;
    const running = runInsightLifecycle(lifecycleInput({ signal: controller.signal, isCurrent: () => current }), dependencies);

    await waitFor(() => fetchImpl.mock.calls.length === 1);
    const requestInit = fetchImpl.mock.calls[0]?.[1];
    expect(requestInit?.signal).toBe(controller.signal);
    controller.abort();
    current = false;
    resolveResponse(Response.json(report()));
    await running;

    expect(actions).toEqual([]);
    expect(dependencies.writeCache).not.toHaveBeenCalled();
  });
});

describe("insight controller state and current-session snapshot", () => {
  test("starts loading and accepts only the current profile", () => {
    const loading = insightControllerReducer(initialInsightControllerState, { type: "load_started", profileId });
    const ready = insightControllerReducer(loading, { type: "cache_hit", profileId, aggregation: aggregation(), report: report() });

    expect(ready.status).toBe("ready");
    expect(insightControllerReducer(ready, { type: "load_started", profileId: "profile-replaced" })).toEqual({ status: "loading", profileId: "profile-replaced" });
    expect(insightControllerReducer(ready, { type: "generated", profileId: "profile-replaced", aggregation: aggregation(), report: report() })).toBe(ready);
  });

  test("builds a stable current-session snapshot from completed visible messages only", () => {
    const complete = { id: "user-1", role: "user" as const, content: "Question", status: "complete" as const, evidence: initialEvidence };
    const snapshot = currentInsightSessionSnapshot("conversation-current", [complete, { id: "assistant-1", role: "assistant" as const, content: "Streaming", status: "streaming" as const, evidence: initialEvidence }]);
    const evidenceChanged = currentInsightSessionSnapshot("conversation-current", [complete, { id: "assistant-1", role: "assistant" as const, content: "Streaming more", status: "streaming" as const, evidence: initialEvidence }]);
    const completed = currentInsightSessionSnapshot("conversation-current", [complete, { id: "assistant-1", role: "assistant" as const, content: "Answer", status: "complete" as const, evidence: initialEvidence }]);

    expect(snapshot).toEqual({ conversationId: "conversation-current", messages: [expect.objectContaining({ id: "user-1", content: "Question" })] });
    expect(evidenceChanged).toEqual(snapshot);
    expect(completed?.messages).toHaveLength(2);
  });

  test("hides report state unless it belongs to the current ready workspace", () => {
    const owned = { status: "ready", profileId, aggregation: aggregation(), report: report() } as const;
    expect(insightPresentationOwned(owned, { ready: true, profileId, modelSettingsLoaded: true, dataDeleting: false, activeRequestId: null })).toBe(true);
    expect(insightPresentationOwned(owned, { ready: true, profileId, modelSettingsLoaded: true, dataDeleting: true, activeRequestId: null })).toBe(false);
    expect(insightPresentationOwned(owned, { ready: true, profileId: "profile-new", modelSettingsLoaded: true, dataDeleting: false, activeRequestId: null })).toBe(false);
    expect(insightPresentationOwned(owned, { ready: true, profileId, modelSettingsLoaded: true, dataDeleting: false, activeRequestId: "streaming" })).toBe(false);
  });
});

function lifecycleInput(overrides: Partial<Parameters<typeof runInsightLifecycle>[0]> & { aggregation?: InsightAggregation } = {}) {
  const { aggregation: nextAggregation, ...inputOverrides } = overrides;
  return {
    profileId,
    currentSession: null,
    modelSettings: modelSettings(),
    refreshAuthorizationFingerprint: null,
    signal: new AbortController().signal,
    isCurrent: () => true,
    ...inputOverrides,
    aggregation: nextAggregation,
  };
}

function lifecycleDependencies(overrides: Partial<InsightLifecycleDependencies> & { aggregation?: InsightAggregation } = {}) {
  const actions: InsightControllerAction[] = [];
  const aggregate = overrides.aggregation ?? aggregation();
  const dependencies: InsightLifecycleDependencies = {
    loadSourceBundle: vi.fn(async () => bundle()),
    aggregateSources: vi.fn(async () => aggregate),
    readCache: vi.fn(() => ({ status: "miss" as const })),
    writeCache: vi.fn(() => true),
    fetchImpl: vi.fn<typeof fetch>(async () => Response.json(report())),
    modelSettingsReady: () => true,
    modelSettingsRequest: (settings) => settings,
    emit: (action) => actions.push(action),
    ...overrides,
  };
  return { actions, dependencies };
}

function modelSettings(): ModelSettingsDraft {
  return {
    ...defaultModelSettingsDraft,
    provider: "openai",
    baseUrl: "https://api.openai.com/v1",
    apiKey: "test-key",
    model: "gpt-4.1-mini",
  };
}

function bundle(): InsightSourceBundle {
  return { conversations: [{
    id: "conversation-1",
    title: "Saved",
    updatedAt: "2026-07-17T00:00:00.000Z",
    messages: [
      { id: "message-1", role: "user", content: "Question", createdAt: "2026-07-16T00:00:00.000Z" },
      { id: "message-2", role: "assistant", content: "Answer", createdAt: "2026-07-16T01:00:00.000Z" },
    ],
  }] };
}

function aggregation(overrides: Partial<InsightAggregation> = {}): InsightAggregation {
  return {
    sources: bundle(),
    sourceWindow: { from: "2026-07-15T00:00:00.000Z", to: "2026-07-17T00:00:00.000Z" },
    conversationCount: 2,
    userMessageCount: 3,
    activityDays: ["2026-07-15", "2026-07-16"],
    topicCounts: { career: 1, relationship: 0, wealth: 0, personality: 0, recent_fortune: 0 },
    candidates: candidateSources(),
    sourceFingerprint: fingerprint,
    ...overrides,
  };
}

function candidateSources(): InsightAggregation["candidates"] {
  return [
    { sourceId: "conversation-1:message-1", conversationId: "conversation-1", messageId: "message-1", excerpt: "Question", createdAt: "2026-07-16T00:00:00.000Z", topic: "career" },
    { sourceId: "conversation-1:message-2", conversationId: "conversation-1", messageId: "message-2", excerpt: "Follow-up", createdAt: "2026-07-16T01:00:00.000Z", topic: "career" },
  ];
}

function report(sourceFingerprint = fingerprint): InsightReport {
  return {
    sourceWindow: { from: "2026-07-15T00:00:00.000Z", to: "2026-07-17T00:00:00.000Z" },
    generatedAt: "2026-07-17T12:00:00.000Z",
    sourceFingerprint,
    weeklyLetter: {
      greeting: "Hello",
      paragraphs: [{ text: "Grounded reflection", sourceIds: ["conversation-1:message-1"] }],
      signoff: "Take care",
    },
    patterns: [{ id: "pattern-1", title: "Pattern", detail: "Observed", topic: "career", sourceIds: ["conversation-1:message-1", "conversation-1:message-2"] }],
    critic: { passed: true, issues: [] },
  };
}

async function waitFor(predicate: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    if (predicate()) return;
    await Promise.resolve();
  }
  throw new Error("Timed out waiting for lifecycle condition");
}
