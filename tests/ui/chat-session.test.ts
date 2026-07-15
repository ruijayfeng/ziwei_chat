import { describe, expect, test } from "vitest";

import { initialEvidence } from "../../src/lib/ui/chat-evidence";
import {
  chatSessionReducer,
  initialChatSessionState,
  type ChatSessionState,
} from "../../src/lib/ui/chat-session";

describe("chat session reducer", () => {
  test("binds evidence to one assistant message without carrying it into the next run", () => {
    let state = startTurn(initialChatSessionState, "request-1", "事业", "user-1", "assistant-1");
    const firstEvidence = { ...initialEvidence, toolsUsed: ["getCurrentChart"] };
    state = chatSessionReducer(state, { type: "evidence_received", requestId: "request-1", evidence: firstEvidence });
    state = chatSessionReducer(state, { type: "token_received", requestId: "request-1", token: "第一答" });
    state = chatSessionReducer(state, { type: "turn_completed", requestId: "request-1" });

    state = startTurn(state, "request-2", "感情", "user-2", "assistant-2");

    expect(state.messages.find((message) => message.id === "assistant-1")?.evidence).toEqual(firstEvidence);
    expect(state.messages.find((message) => message.id === "assistant-2")?.evidence).toEqual(initialEvidence);
    expect(state.messages.find((message) => message.id === "assistant-2")?.status).toBe("thinking");
  });

  test("keeps stable retry content without duplicating the failed user message", () => {
    let state = startTurn(initialChatSessionState, "request-1", "看看事业", "user-1", "assistant-1");
    state = chatSessionReducer(state, {
      type: "turn_failed",
      requestId: "request-1",
      error: { kind: "server", message: "失败", canRetry: true },
    });

    expect(state.lastFailedContent).toBe("看看事业");
    state = startTurn(state, "request-2", state.lastFailedContent ?? "", "user-2", "assistant-2");

    expect(state.messages.filter((message) => message.role === "user")).toHaveLength(1);
    expect(state.messages.filter((message) => message.role === "assistant")).toHaveLength(2);
    expect(state.lastFailedContent).toBeNull();
  });

  test("allows only one in-flight request and completes only non-empty answers", () => {
    const active = startTurn(initialChatSessionState, "request-1", "事业", "user-1", "assistant-1");
    const ignored = startTurn(active, "request-2", "感情", "user-2", "assistant-2");
    expect(ignored).toBe(active);

    const emptyComplete = chatSessionReducer(active, { type: "turn_completed", requestId: "request-1" });
    expect(emptyComplete.messages.at(-1)?.status).toBe("failed");
    expect(emptyComplete.error?.kind).toBe("empty_response");
  });
});

function startTurn(
  state: ChatSessionState,
  requestId: string,
  content: string,
  userMessageId: string,
  assistantMessageId: string,
) {
  return chatSessionReducer(state, {
    type: "turn_started",
    requestId,
    content,
    evidenceRunId: `evidence-${requestId}`,
    userMessageId,
    assistantMessageId,
  });
}
