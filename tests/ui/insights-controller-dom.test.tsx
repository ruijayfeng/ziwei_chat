// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

const workspace = vi.hoisted(() => ({ current: null as Record<string, unknown> | null }));

vi.mock("../../src/components/workspace/workspace-provider", () => ({
  useWorkspace: () => workspace.current,
}));

import { InsightsController } from "../../src/components/insights/insights-controller";
import type { InsightReport } from "../../src/lib/insights/contracts";
import { aggregateInsightSources } from "../../src/lib/insights/source";
import { initialChatSessionState } from "../../src/lib/ui/chat-session";
import { defaultModelSettingsDraft } from "../../src/lib/ui/model-settings";

const profileId = "00000000-0000-4000-8000-000000000001";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

describe("InsightsController mounted lifecycle", () => {
  test("retries a provider failure and renders the approved sourced report", async () => {
    workspace.current = workspaceValue();
    let generationCalls = 0;
    const signals: AbortSignal[] = [];
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      signals.push(init?.signal as AbortSignal);
      const url = String(input);
      if (url.startsWith("/api/conversations?") && !url.includes("conversationId=")) {
        return Response.json({ conversations: summaries() });
      }
      if (url.includes("conversationId=")) return conversationDetail(url);
      generationCalls += 1;
      if (generationCalls === 1) {
        return Response.json({ code: "MODEL_PROVIDER_FAILED", message: "模型暂时不可用", canRetry: true }, { status: 502 });
      }
      const request = JSON.parse(String(init?.body)) as { sourceBundle: Parameters<typeof aggregateInsightSources>[0] };
      const aggregation = await aggregateInsightSources(request.sourceBundle);
      return Response.json(reportFor(aggregation.sourceFingerprint));
    }));

    render(<InsightsController />);
    expect((await screen.findByRole("alert")).textContent).toContain("模型暂时不可用");

    fireEvent.click(screen.getByRole("button", { name: "重试" }));

    expect(await screen.findByRole("heading", { name: "给你的本周信" })).toBeTruthy();
    expect(screen.getAllByText("来源依据").length).toBeGreaterThan(0);
    expect(generationCalls).toBe(2);
    expect(signals.every((signal) => signal instanceof AbortSignal)).toBe(true);
  });

  test("aborts and hides an owned report on stream start, profile replacement, deletion, and unmount", async () => {
    workspace.current = workspaceValue();
    const requestSignals: AbortSignal[] = [];
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      requestSignals.push(init?.signal as AbortSignal);
      const url = String(input);
      if (url.startsWith("/api/conversations?") && !url.includes("conversationId=")) return Response.json({ conversations: summaries() });
      if (url.includes("conversationId=")) return conversationDetail(url);
      const request = JSON.parse(String(init?.body)) as { sourceBundle: Parameters<typeof aggregateInsightSources>[0] };
      const aggregation = await aggregateInsightSources(request.sourceBundle);
      return Response.json(reportFor(aggregation.sourceFingerprint));
    }));

    const view = render(<InsightsController />);
    expect(await screen.findByRole("heading", { name: "给你的本周信" })).toBeTruthy();

    workspace.current = workspaceValue({ chatSession: { ...initialChatSessionState, activeRequestId: "request-1" } });
    view.rerender(<InsightsController />);
    expect(screen.queryByRole("heading", { name: "给你的本周信" })).toBeNull();
    expect(screen.getByRole("status")).toBeTruthy();

    workspace.current = workspaceValue({ profileId: "00000000-0000-4000-8000-000000000002" });
    view.rerender(<InsightsController />);
    expect(screen.queryByRole("heading", { name: "给你的本周信" })).toBeNull();

    workspace.current = workspaceValue({ dataDeleting: true });
    view.rerender(<InsightsController />);
    expect(screen.queryByRole("heading", { name: "给你的本周信" })).toBeNull();

    view.unmount();
    await waitFor(() => expect(requestSignals.some((signal) => signal.aborted)).toBe(true));
  });
});

function workspaceValue(overrides: Record<string, unknown> = {}) {
  return {
    ready: true,
    profileId,
    conversationId: "conversation-current",
    chatSession: initialChatSessionState,
    modelSettings: {
      ...defaultModelSettingsDraft,
      provider: "openai",
      baseUrl: "https://api.openai.com/v1",
      apiKey: "test-key",
      model: "gpt-4.1-mini",
    },
    modelSettingsLoaded: true,
    dataDeleting: false,
    ...overrides,
  };
}

function summaries() {
  return [
    { id: "conversation-1", title: "事业方向", lastMessageAt: "2026-07-16T02:00:00.000Z" },
    { id: "conversation-2", title: "关系复盘", lastMessageAt: "2026-07-17T02:00:00.000Z" },
  ];
}

function conversationDetail(url: string) {
  const id = new URL(url, "https://ziwei.local").searchParams.get("conversationId")!;
  const messages = id === "conversation-1"
    ? [
        { id: "user-1", conversationId: id, role: "user", content: "工作要怎么调整", createdAt: "2026-07-16T01:00:00.000Z" },
        { id: "user-2", conversationId: id, role: "user", content: "事业节奏是什么", createdAt: "2026-07-16T02:00:00.000Z" },
      ]
    : [{ id: "user-3", conversationId: id, role: "user", content: "关系里该注意什么", createdAt: "2026-07-17T01:00:00.000Z" }];
  return Response.json({ messages });
}

function reportFor(sourceFingerprint: string): InsightReport {
  return {
    sourceWindow: { from: "2026-07-16T01:00:00.000Z", to: "2026-07-17T01:00:00.000Z" },
    generatedAt: "2026-07-17T12:00:00.000Z",
    sourceFingerprint,
    weeklyLetter: {
      greeting: "给你的本周信",
      paragraphs: [{ text: "你反复在观察工作节奏。", sourceIds: ["conversation-1:user-1"] }],
      signoff: "慢慢来。",
    },
    patterns: [{
      id: "work-rhythm",
      title: "工作节奏",
      detail: "两次记录都提到了调整。",
      topic: "career",
      sourceIds: ["conversation-1:user-1", "conversation-1:user-2"],
    }],
    critic: { passed: true, issues: [] },
  };
}
