import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { createInMemoryToolStores } from "../../src/lib/agent/tools";

const persistenceFakes = vi.hoisted(() => ({
  saveMessage: vi.fn(),
  saveToolEvent: vi.fn(),
}));

vi.mock("../../src/lib/db/chat-persistence", () => ({
  createPostgresChatPersistence: () => ({
    saveMessage: persistenceFakes.saveMessage,
    saveToolEvent: persistenceFakes.saveToolEvent,
    async deleteProfileData() {},
  }),
}));

vi.mock("../../src/lib/db/chart-persistence", () => ({
  createPostgresChartPersistence: () => ({}),
}));

vi.mock("../../src/lib/db/client", () => ({
  getDatabaseClient: () => ({}),
}));

describe("route telemetry persistence", () => {
  beforeEach(() => {
    vi.stubEnv("DATABASE_URL", "postgres://configured-for-test");
    persistenceFakes.saveMessage.mockReset();
    persistenceFakes.saveMessage.mockResolvedValue(undefined);
    persistenceFakes.saveToolEvent.mockReset();
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  test("does not keep the agent route waiting for a slow telemetry write", async () => {
    persistenceFakes.saveToolEvent.mockImplementation(
      async () => new Promise<void>(() => {}),
    );
    const { recordRouteToolEventToStores } = await import(
      "../../src/lib/agent/chat-runtime"
    );
    const stores = createInMemoryToolStores();

    const result = Promise.race([
      recordRouteToolEventToStores(
        stores,
        "00000000-0000-4000-8000-000000000001",
        "00000000-0000-4000-8000-000000000002",
        "searchKnowledge",
        { query: "事业" },
        [],
        true,
      ).then(() => "completed"),
      new Promise<string>((resolve) => setTimeout(() => resolve("blocked"), 25)),
    ]);

    await expect(result).resolves.toBe("completed");
    expect(stores.toolEvents).toHaveLength(1);
  });

  test("bounds message persistence so a stalled database cannot block done", async () => {
    vi.useFakeTimers();
    try {
      persistenceFakes.saveMessage.mockImplementation(
        async () => new Promise<void>(() => {}),
      );
      const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
      const { persistChatMessage } = await import("../../src/lib/agent/chat-runtime");
      const persistence = persistChatMessage(
        {
          conversationId: "00000000-0000-4000-8000-000000000002",
          profileId: "00000000-0000-4000-8000-000000000001",
          role: "assistant",
          content: "answer",
        },
        25,
      );

      await vi.advanceTimersByTimeAsync(25);

      await expect(persistence).resolves.toBeUndefined();
      expect(warning).toHaveBeenCalledWith("Chat message persistence failed", {
        code: "CHAT_MESSAGE_PERSISTENCE_TIMEOUT",
        role: "assistant",
      });
    } finally {
      vi.useRealTimers();
    }
  });

  test("keeps the agent route alive when telemetry persistence rejects", async () => {
    persistenceFakes.saveToolEvent.mockRejectedValue(new Error("database unavailable"));
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { recordRouteToolEventToStores } = await import(
      "../../src/lib/agent/chat-runtime"
    );
    const stores = createInMemoryToolStores();

    await expect(
      recordRouteToolEventToStores(
        stores,
        "00000000-0000-4000-8000-000000000001",
        "00000000-0000-4000-8000-000000000002",
        "loadSkill",
        { skillId: "chart_explanation" },
        null,
        false,
      ),
    ).resolves.toBeUndefined();

    expect(stores.toolEvents).toHaveLength(1);
    expect(warning).toHaveBeenCalledWith("Agent telemetry persistence failed", {
      code: "TOOL_EVENT_PERSISTENCE_FAILED",
      toolName: "loadSkill",
    });
  });

  test("keeps the measured stage latency in the request evidence store", async () => {
    persistenceFakes.saveToolEvent.mockResolvedValue(undefined);
    const { recordRouteToolEventToStores } = await import(
      "../../src/lib/agent/chat-runtime"
    );
    const stores = createInMemoryToolStores();

    await recordRouteToolEventToStores(
      stores,
      "00000000-0000-4000-8000-000000000001",
      "00000000-0000-4000-8000-000000000002",
      "createAnalysisPlan",
      {},
      {},
      true,
      734,
    );

    expect(stores.toolEvents[0]?.latencyMs).toBe(734);
  });
});
