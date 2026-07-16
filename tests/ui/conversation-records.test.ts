import { describe, expect, test } from "vitest";

import {
  conversationTimelineItem,
  currentSessionConversation,
  loadConversationList,
  loadConversationMessages,
} from "../../src/lib/ui/conversation-records";
import { initialEvidence } from "../../src/lib/ui/chat-evidence";

describe("conversation records UI adapter", () => {
  test("treats unavailable persistence as an honest fallback state", async () => {
    const result = await loadConversationList("profile-1", async () => new Response(null, { status: 503 }));
    expect(result).toEqual({ conversations: [], unavailable: true });
  });

  test("rejects unavailable conversation details with a safe error", async () => {
    await expect(
      loadConversationMessages("profile-1", "conversation-1", async () => new Response(null, { status: 503 })),
    ).rejects.toThrow("\u5bf9\u8bdd\u5185\u5bb9\u8bfb\u53d6\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5\u3002");
  });

  test("maps only real non-empty current-session messages", () => {
    const result = currentSessionConversation("conversation-1", [
      { id: "user-1", role: "user", content: "事业问题", status: "complete", evidence: initialEvidence },
      { id: "assistant-1", role: "assistant", content: "真实回答", status: "complete", evidence: initialEvidence },
      { id: "assistant-2", role: "assistant", content: "", status: "failed", evidence: initialEvidence },
    ]);

    expect(result?.conversation.title).toBe("事业问题");
    expect(result?.messages.map((message) => message.content)).toEqual(["事业问题", "真实回答"]);
  });
  test("builds a timeline item only from real conversation messages", () => {
    const item = conversationTimelineItem(
      { id: "conversation-1", title: "\u4e8b\u4e1a\u65b9\u5411", lastMessageAt: "2026-07-16T12:30:00.000Z" },
      [
        { id: "u1", conversationId: "conversation-1", role: "user", content: "\u6211\u8be5\u6362\u5de5\u4f5c\u5417\uff1f", createdAt: "2026-07-16T12:00:00.000Z" },
        { id: "a1", conversationId: "conversation-1", role: "assistant", content: "\u5148\u770b\u5b98\u7984\u5bab\u3002", createdAt: "2026-07-16T12:30:00.000Z" },
      ],
    );

    expect(item).toMatchObject({
      id: "conversation-1",
      title: "\u4e8b\u4e1a\u65b9\u5411",
      kind: "career",
      preview: "\u5148\u770b\u5b98\u7984\u5bab\u3002",
    });
    expect(item.messages).toHaveLength(2);
  });

  test("uses a neutral kind when the first prompt has no supported topic", () => {
    const item = conversationTimelineItem(
      { id: "conversation-2", title: "\u968f\u4fbf\u804a\u804a", lastMessageAt: "" },
      [{ id: "u2", conversationId: "conversation-2", role: "user", content: "\u4f60\u597d", createdAt: "" }],
    );

    expect(item.kind).toBe("conversation");
  });
});
