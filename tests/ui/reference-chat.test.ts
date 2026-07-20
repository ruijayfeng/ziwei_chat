import { describe, expect, test } from "vitest";

import { initialEvidence } from "../../src/lib/ui/chat-evidence";
import { initialChatSessionState, type ChatSessionState } from "../../src/lib/ui/chat-session";
import {
  referenceChatMessages,
  referenceChatPhase,
  referenceChatThinking,
} from "../../src/lib/ui/reference-chat";

const thinkingState: ChatSessionState = {
  messages: [
    {
      id: "u1",
      role: "user",
      content: "事业",
      status: "complete",
      evidence: initialEvidence,
    },
    {
      id: "a1",
      role: "assistant",
      content: "",
      status: "thinking",
      evidence: initialEvidence,
    },
  ],
  activeRequestId: "request-1",
  activeContent: "事业",
  lastFailedContent: null,
  error: null,
};

describe("reference chat presentation adapter", () => {
  test("derives idle and active phases from real session messages", () => {
    expect(referenceChatPhase(initialChatSessionState)).toBe("idle");
    expect(referenceChatPhase(thinkingState)).toBe("active");
  });

  test("does not expose internal system messages to the reference UI", () => {
    const state: ChatSessionState = {
      ...initialChatSessionState,
      messages: [
        {
          id: "s1",
          role: "system",
          content: "internal context",
          status: "complete",
          evidence: initialEvidence,
        },
      ],
    };

    expect(referenceChatMessages(state)).toEqual([]);
    expect(referenceChatPhase(state)).toBe("idle");
  });

  test("keeps the reference thinking indicator separate from empty assistant bubbles", () => {
    expect(referenceChatMessages(thinkingState)).toEqual([
      {
        id: "u1",
        role: "user",
        content: "事业",
        streaming: false,
        failed: false,
      },
    ]);
    expect(referenceChatThinking(thinkingState)).toBe(true);
  });

  test("maps streaming and failed assistant turns into the reference message model", () => {
    const streamingState: ChatSessionState = {
      ...thinkingState,
      messages: [
        thinkingState.messages[0],
        {
          ...thinkingState.messages[1],
          content: "正在分析",
          status: "streaming",
        },
      ],
    };
    const failedState: ChatSessionState = {
      ...thinkingState,
      activeRequestId: null,
      messages: [
        thinkingState.messages[0],
        {
          ...thinkingState.messages[1],
          status: "failed",
          error: {
            kind: "server",
            message: "分析没有完成，请重试。",
            canRetry: true,
          },
        },
      ],
    };

    expect(referenceChatMessages(streamingState)[1]).toMatchObject({
      id: "a1",
      role: "assistant",
      content: "正在分析",
      streaming: true,
      failed: false,
    });
    expect(referenceChatMessages(failedState)[1]).toMatchObject({
      content: "分析没有完成，请重试。",
      streaming: false,
      failed: true,
    });
  });
});
