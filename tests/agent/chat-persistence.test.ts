import { describe, expect, test } from "vitest";

import {
  createInMemoryChatPersistence,
  type ChatPersistence,
} from "../../src/lib/agent/chat-persistence";

describe("chat persistence", () => {
  test("persists messages and tool events through one interface", async () => {
    const persistence = createInMemoryChatPersistence();

    await persistence.saveMessage({
      conversationId: "conversation-1",
      profileId: "profile-1",
      role: "user",
      content: "我最近想换工作",
    });
    await persistence.saveToolEvent({
      conversationId: "conversation-1",
      toolName: "summarizeChartFacts",
      input: { chartId: "chart-1" },
      output: { ok: true },
      success: true,
      latencyMs: 12,
    });

    expect(persistence.snapshot).toBeDefined();
    expect(persistence.snapshot?.()).toMatchObject({
      messages: [
        {
          conversationId: "conversation-1",
          profileId: "profile-1",
          role: "user",
          content: "我最近想换工作",
        },
      ],
      toolEvents: [
        {
          conversationId: "conversation-1",
          toolName: "summarizeChartFacts",
          success: true,
          latencyMs: 12,
        },
      ],
    });
  });

  test("route-level code can depend on the persistence contract without knowing storage details", async () => {
    const calls: string[] = [];
    const persistence: ChatPersistence = {
      async saveMessage() {
        calls.push("message");
      },
      async saveToolEvent() {
        calls.push("tool");
      },
    };

    await persistence.saveMessage({
      conversationId: "conversation-1",
      profileId: "profile-1",
      role: "assistant",
      content: "结论：可以看。",
    });
    await persistence.saveToolEvent({
      conversationId: "conversation-1",
      toolName: "runResponseCritic",
      input: {},
      output: {},
      success: true,
      latencyMs: 0,
    });

    expect(calls).toEqual(["message", "tool"]);
  });
});
