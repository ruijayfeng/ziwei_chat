import { describe, expect, test } from "vitest";

import {
  localConversationArchiveFromStorage,
  localConversationArchiveStorageKey,
  localConversationArchiveValue,
  updateLocalConversationArchive,
} from "../../src/lib/ui/local-conversation-session";
import { initialEvidence } from "../../src/lib/ui/chat-evidence";

describe("local conversation archive", () => {
  test("persists only completed visible messages and retains previous conversations", () => {
    const first = updateLocalConversationArchive([], "conversation-1", [
      { id: "user-1", role: "user", content: "我想聊聊工作", status: "complete", evidence: initialEvidence },
      { id: "assistant-1", role: "assistant", content: "我们从现在的节奏开始看。", status: "complete", evidence: initialEvidence },
      { id: "assistant-pending", role: "assistant", content: "正在", status: "streaming", evidence: initialEvidence },
    ], "2026-07-20T12:00:00.000Z");
    const archive = updateLocalConversationArchive(first, "conversation-2", [
      { id: "user-2", role: "user", content: "还有一个问题", status: "complete", evidence: initialEvidence },
    ], "2026-07-20T13:00:00.000Z");

    expect(archive.map((item) => item.conversationId)).toEqual(["conversation-2", "conversation-1"]);
    expect(archive[1]?.messages.map((message) => message.id)).toEqual(["user-1", "assistant-1"]);
    expect(localConversationArchiveFromStorage(localConversationArchiveValue(archive))).toEqual(archive);
  });

  test("uses a profile-scoped storage key and rejects malformed saved data", () => {
    expect(localConversationArchiveStorageKey("profile-1")).toBe("ziwei-chat-conversations:profile-1");
    expect(localConversationArchiveFromStorage('{"conversations":"invalid"}')).toEqual([]);
  });
});
