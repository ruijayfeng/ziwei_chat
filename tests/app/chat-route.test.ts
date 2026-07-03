import { describe, expect, test, beforeEach } from "vitest";

import { POST } from "../../src/app/api/chat/route";
import {
  getChatRuntimeSnapshot,
  resetChatRuntime,
} from "../../src/lib/agent/chat-runtime";

describe("POST /api/chat", () => {
  beforeEach(() => {
    resetChatRuntime();
  });

  test("asks for chart creation when a serious chart question has no active chart", async () => {
    const response = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        body: JSON.stringify({
          profileId: "profile-missing",
          messages: [{ role: "user", content: "我最近想换工作，适合动吗？" }],
        }),
      }),
    );

    await expect(response.text()).resolves.toContain("请先创建一张命盘");
  });

  test("streams a grounded answer and persists messages plus tool events", async () => {
    const response = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        body: JSON.stringify({
          profileId: "profile-1",
          conversationId: "conversation-1",
          chartInput: {
            profileId: "profile-1",
            name: "Primary chart",
            gender: "male",
            birthDate: "1990-05-17",
            birthTime: "12:00",
            calendarType: "solar",
            isPrimary: true,
          },
          messages: [{ role: "user", content: "我最近想换工作，适合动吗？" }],
        }),
      }),
    );

    const text = await response.text();
    expect(text).toContain("结论");
    expect(text).toContain("命盘依据");
    expect(text).toContain("追问");

    const snapshot = getChatRuntimeSnapshot();
    expect(snapshot.messages.map((message) => message.role)).toEqual([
      "user",
      "assistant",
    ]);
    expect(snapshot.toolEvents.map((event) => event.toolName)).toEqual([
        "createChart",
        "getCurrentChart",
        "summarizeChartFacts",
        "loadSkill",
        "searchKnowledge",
        "runResponseCritic",
    ]);
  });
});
