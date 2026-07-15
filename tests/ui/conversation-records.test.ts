import { describe, expect, test } from "vitest";

import {
  currentSessionConversation,
  loadConversationList,
} from "../../src/lib/ui/conversation-records";
import { initialEvidence } from "../../src/lib/ui/chat-evidence";

describe("conversation records UI adapter", () => {
  test("treats unavailable persistence as an honest fallback state", async () => {
    const result = await loadConversationList("profile-1", async () => new Response(null, { status: 503 }));
    expect(result).toEqual({ conversations: [], unavailable: true });
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
});
