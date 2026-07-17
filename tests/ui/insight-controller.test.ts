import { describe, expect, test, vi } from "vitest";

vi.mock("../../src/components/workspace/workspace-provider", () => ({
  useWorkspace: vi.fn(),
}));

import type { InsightAggregation, InsightReport } from "../../src/lib/insights/contracts";
import {
  initialInsightControllerState,
  insightControllerReducer,
  resolveInsightCacheState,
} from "../../src/components/insights/insights-controller";

const profileId = "00000000-0000-4000-8000-000000000001";
const fingerprint = "a".repeat(64);

describe("insight controller state", () => {
  test("starts loading and resets when the profile changes", () => {
    const loading = insightControllerReducer(initialInsightControllerState, { type: "load_started", profileId });
    const ready = insightControllerReducer(loading, { type: "cache_hit", profileId, aggregation: aggregation(), report: report() });

    expect(ready.status).toBe("ready");
    expect(insightControllerReducer(ready, { type: "load_started", profileId: "profile-replaced" })).toEqual({
      status: "loading",
      profileId: "profile-replaced",
    });
  });

  test("generates eligible cache misses with the current aggregation", () => {
    const result = resolveInsightCacheState(aggregation(), { status: "miss" });

    expect(result).toEqual({ status: "generate" });
  });

  test("renders an exact cache hit as ready without generation", () => {
    expect(resolveInsightCacheState(aggregation(), { status: "hit", report: report() })).toEqual({
      status: "ready",
      report: report(),
    });
  });

  test("renders a different-fingerprint cache entry as stale", () => {
    const stale = report("b".repeat(64));
    expect(resolveInsightCacheState(aggregation(), { status: "stale", report: stale })).toEqual({
      status: "stale",
      report: stale,
    });
  });

  test("renders ineligible sources even when a stale report exists", () => {
    const stale = report("b".repeat(64));
    expect(resolveInsightCacheState(aggregation({ conversationCount: 1, userMessageCount: 1, activityDays: ["2026-07-17"] }), { status: "stale", report: stale })).toMatchObject({
      status: "insufficient",
    });
  });

  test("records retryable provider failures and returns to loading on retry", () => {
    const failed = insightControllerReducer(initialInsightControllerState, {
      type: "failed",
      profileId,
      error: { message: "Provider unavailable", canRetry: true },
    });

    expect(failed).toEqual({ status: "error", profileId, error: { message: "Provider unavailable", canRetry: true } });
    expect(insightControllerReducer(failed, { type: "load_started", profileId })).toEqual({ status: "loading", profileId });
  });

  test("rejects a successful response that fails strict report validation", () => {
    const result = insightControllerReducer(initialInsightControllerState, {
      type: "failed",
      profileId,
      error: { message: "Invalid insight response", canRetry: true },
    });

    expect(result.status).toBe("error");
    expect(result.status === "error" && result.error.canRetry).toBe(true);
  });

  test("exposes missing model settings as a settings-directed error", () => {
    const result = insightControllerReducer(initialInsightControllerState, {
      type: "failed",
      profileId,
      error: { message: "Model settings required", canRetry: false, settingsRequired: true },
    });

    expect(result).toEqual({
      status: "error",
      profileId,
      error: { message: "Model settings required", canRetry: false, settingsRequired: true },
    });
  });

  test("does not let an aborted stale request replace the current profile state", () => {
    const current = insightControllerReducer(initialInsightControllerState, { type: "load_started", profileId: "profile-new" });
    const stale = insightControllerReducer(current, { type: "cache_hit", profileId, aggregation: aggregation(), report: report() });

    expect(stale).toBe(current);
  });

  test("does not let a deletion or profile replacement response commit", () => {
    const current = insightControllerReducer(initialInsightControllerState, { type: "load_started", profileId: "profile-replacement" });
    const deleted = insightControllerReducer(current, {
      type: "generated",
      profileId,
      aggregation: aggregation(),
      report: report(),
    });

    expect(deleted).toBe(current);
  });
});

function aggregation(overrides: Partial<InsightAggregation> = {}): InsightAggregation {
  return {
    sources: { conversations: [] },
    sourceWindow: { from: "2026-07-15T00:00:00.000Z", to: "2026-07-17T00:00:00.000Z" },
    conversationCount: 2,
    userMessageCount: 3,
    activityDays: ["2026-07-15", "2026-07-16"],
    topicCounts: { career: 1, relationship: 0, wealth: 0, personality: 0, recent_fortune: 0 },
    candidates: [],
    sourceFingerprint: fingerprint,
    ...overrides,
  };
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
    patterns: [{ id: "pattern-1", title: "Pattern", detail: "Observed", topic: "career", sourceIds: ["conversation-1:message-1", "conversation-2:message-2"] }],
    critic: { passed: true, issues: [] },
  };
}
