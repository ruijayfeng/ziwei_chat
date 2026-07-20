import { describe, expect, test } from "vitest";

import {
  conversationDetailLoadErrorMessage,
  conversationDetailView,
  conversationRecap,
  conversationRecordsReducer,
  conversationTimelineItem,
  createConversationRecordsState,
  currentSessionConversation,
  loadConversationList,
  loadConversationMessages,
  nextConversationRequest,
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

  test("rejects malformed conversation payloads instead of treating them as empty history", async () => {
    await expect(
      loadConversationList("profile-1", async () => Response.json({ conversations: "invalid" })),
    ).rejects.toThrow("对话记录响应格式无效，请稍后重试。");
    await expect(
      loadConversationList("profile-1", async () => Response.json({ conversations: [{ id: "missing-title" }] })),
    ).rejects.toThrow("对话记录响应格式无效，请稍后重试。");
  });

  test("rejects malformed message payloads instead of leaving details loading forever", async () => {
    await expect(
      loadConversationMessages("profile-1", "conversation-1", async () => Response.json({ messages: null })),
    ).rejects.toThrow("对话内容响应格式无效，请稍后重试。");
    await expect(
      loadConversationMessages("profile-1", "conversation-1", async () => Response.json({ messages: [{ id: "bad" }] })),
    ).rejects.toThrow("对话内容响应格式无效，请稍后重试。");
  });

  test("keeps valid empty details distinct from loading", async () => {
    const messages = await loadConversationMessages(
      "profile-1",
      "conversation-1",
      async () => Response.json({ messages: [] }),
    );

    expect(messages).toEqual([]);
    expect(conversationDetailView({ phase: "ready", messages })).toEqual({ phase: "empty" });
    expect(conversationDetailView({ phase: "loading" })).toEqual({ phase: "loading" });
  });

  test("cancels the previous detail request before starting a replacement", () => {
    const previous = new AbortController();

    const next = nextConversationRequest(previous);

    expect(previous.signal.aborted).toBe(true);
    expect(next.signal.aborted).toBe(false);
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
      title: "\u6211\u8be5\u6362\u5de5\u4f5c\u5417\uff1f",
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

  test("uses only the AI conclusion paragraph as the record recap", () => {
    expect(conversationRecap([
      "## 结论",
      "你目前更适合稳住节奏，先观察机会。",
      "",
      "## 命盘依据",
      "- 官禄宫主星为天同。",
      "",
      "## 建议",
      "不要急于换工作。",
    ].join("\n"))).toBe("你目前更适合稳住节奏，先观察机会。");
  });

  test("keeps concurrent detail results isolated across selections and profiles", () => {
    const aMessages = [{ id: "a1", conversationId: "a", role: "assistant" as const, content: "A answer", createdAt: "" }];
    const bMessages = [{ id: "b1", conversationId: "b", role: "assistant" as const, content: "B answer", createdAt: "" }];
    let state = createConversationRecordsState("profile-1");

    state = conversationRecordsReducer(state, { type: "detail_loading", profileId: "profile-1", conversationId: "a" });
    state = conversationRecordsReducer(state, { type: "select", profileId: "profile-1", conversationId: "b" });
    state = conversationRecordsReducer(state, { type: "detail_loading", profileId: "profile-1", conversationId: "b" });
    state = conversationRecordsReducer(state, { type: "detail_resolved", profileId: "profile-1", conversationId: "a", messages: aMessages });

    expect(state.selectedId).toBe("b");
    expect(state.details.a).toEqual({ phase: "ready", messages: aMessages });
    expect(state.details.b).toEqual({ phase: "loading", messages: undefined });

    state = conversationRecordsReducer(state, { type: "reset", profileId: "profile-2" });
    state = conversationRecordsReducer(state, { type: "detail_resolved", profileId: "profile-1", conversationId: "b", messages: bMessages });
    expect(state).toEqual(createConversationRecordsState("profile-2"));

    state = conversationRecordsReducer(state, { type: "detail_resolved", profileId: "profile-2", conversationId: "b", messages: bMessages });
    state = conversationRecordsReducer(state, { type: "detail_failed", profileId: "profile-2", conversationId: "b" });
    expect(state.details.b).toEqual({ phase: "error", message: conversationDetailLoadErrorMessage, messages: bMessages });

    state = conversationRecordsReducer(state, { type: "detail_retry", profileId: "profile-2", conversationId: "b" });
    expect(state.details.b).toEqual({ phase: "idle", messages: bMessages });
  });
});
