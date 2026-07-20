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

  test("lists conversations and messages only for the owning profile in newest-first order", async () => {
    const persistence = createInMemoryChatPersistence();
    await persistence.saveMessage({ conversationId: "conversation-a", profileId: "profile-a", role: "user", content: "第一段事业问题" });
    await persistence.saveMessage({ conversationId: "conversation-b", profileId: "profile-b", role: "user", content: "别人的问题" });
    await persistence.saveMessage({ conversationId: "conversation-c", profileId: "profile-a", role: "user", content: "较新的感情问题" });
    await persistence.saveMessage({ conversationId: "conversation-c", profileId: "profile-a", role: "assistant", content: "真实回答" });

    await expect(persistence.listConversations?.("profile-a")).resolves.toEqual([
      expect.objectContaining({ id: "conversation-c", title: "较新的感情问题" }),
      expect.objectContaining({ id: "conversation-a", title: "第一段事业问题" }),
    ]);
    await expect(persistence.listMessages?.("profile-a", "conversation-c")).resolves.toEqual([
      expect.objectContaining({ role: "user", content: "较新的感情问题" }),
      expect.objectContaining({ role: "assistant", content: "真实回答" }),
    ]);
    await expect(persistence.listMessages?.("profile-b", "conversation-c")).resolves.toEqual([]);
  });

  test("does not accept writes for a profile after its data is deleted", async () => {
    const persistence = createInMemoryChatPersistence();
    const message = {
      conversationId: "conversation-deleted",
      profileId: "profile-deleted",
      role: "user" as const,
      content: "must not return",
    };

    await persistence.saveMessage(message);
    await persistence.deleteProfileData?.(message.profileId);
    await persistence.saveMessage({ ...message, role: "assistant", content: "late answer" });
    await persistence.saveToolEvent({
      profileId: message.profileId,
      conversationId: message.conversationId,
      toolName: "lateTool",
      input: {},
      output: {},
      success: true,
      latencyMs: 1,
    });

    expect(persistence.snapshot?.()).toEqual({ messages: [], toolEvents: [] });
    await expect(persistence.listConversations?.(message.profileId)).resolves.toEqual([]);
  });
});
