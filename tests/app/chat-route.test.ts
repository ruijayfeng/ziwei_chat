import { describe, expect, test, beforeEach } from "vitest";

import { DELETE, POST } from "../../src/app/api/chat/route";
import {
  getChatRuntimeStores,
  getChatRuntimeSnapshot,
  resetChatRuntime,
} from "../../src/lib/agent/chat-runtime";

const careerQuestion = "我最近想换工作，适合动吗？";
const profileId = "00000000-0000-4000-8000-000000000001";
const conversationId = "00000000-0000-4000-8000-000000000002";
const otherProfileId = "00000000-0000-4000-8000-000000000003";
const otherConversationId = "00000000-0000-4000-8000-000000000004";

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
          messages: [{ role: "user", content: careerQuestion }],
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
          profileId,
          conversationId,
          chartInput: {
            profileId,
            name: "Primary chart",
            gender: "male",
            birthDate: "1990-05-17",
            birthTime: "12:00",
            calendarType: "solar",
            isPrimary: true,
          },
          messages: [{ role: "user", content: careerQuestion }],
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
    expect(snapshot.persistedToolEvents.map((event) => event.conversationId)).toEqual([
      conversationId,
      conversationId,
      conversationId,
    ]);
  });

  test("deletes profile chart and conversation runtime data", async () => {
    await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        body: JSON.stringify({
          profileId,
          conversationId,
          chartInput: {
            profileId,
            name: "Primary chart",
            gender: "male",
            birthDate: "1990-05-17",
            birthTime: "12:00",
            calendarType: "solar",
            isPrimary: true,
          },
          messages: [{ role: "user", content: careerQuestion }],
        }),
      }),
    );
    const stores = getChatRuntimeStores();
    stores.conversationSummaries.push(
      {
        profileId,
        conversationId,
        chartId: "chart-1",
        summary: "career question",
        topics: ["career"],
        summaryId: "summary-1",
      },
      {
        profileId: otherProfileId,
        conversationId: otherConversationId,
        chartId: "chart-2",
        summary: "other profile",
        topics: ["wealth"],
        summaryId: "summary-2",
      },
    );
    stores.memories.push(
      {
        profileId,
        kind: "preference",
        value: "plain language",
        sourceConversationId: conversationId,
        userVisible: true,
        memoryId: "memory-1",
      },
      {
        profileId: otherProfileId,
        kind: "preference",
        value: "keep this",
        sourceConversationId: otherConversationId,
        userVisible: true,
        memoryId: "memory-2",
      },
    );

    const deleted = await DELETE(
      new Request(`http://localhost/api/chat?profileId=${profileId}`, {
        method: "DELETE",
      }),
    );
    expect(deleted.status).toBe(204);
    expect(getChatRuntimeSnapshot()).toMatchObject({
      messages: [],
      toolEvents: [],
      persistedToolEvents: [],
    });
    expect(stores.conversationSummaries).toEqual([
      expect.objectContaining({ profileId: otherProfileId }),
    ]);
    expect(stores.memories).toEqual([
      expect.objectContaining({ profileId: otherProfileId }),
    ]);

    const response = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        body: JSON.stringify({
          profileId,
          conversationId,
          messages: [{ role: "user", content: careerQuestion }],
        }),
      }),
    );

    await expect(response.text()).resolves.toContain("请先创建一张命盘");
  });
});
