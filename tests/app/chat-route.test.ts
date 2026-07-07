import { beforeEach, describe, expect, test, vi } from "vitest";

import { DELETE, POST } from "../../src/app/api/chat/route";
import {
  getChatRuntimeSnapshot,
  getChatRuntimeStores,
  resetChatRuntime,
} from "../../src/lib/agent/chat-runtime";
import { resetRateLimitStore } from "../../src/lib/http/rate-limit";

const careerQuestion = "我最近想换工作，适合动吗？";
const profileId = "00000000-0000-4000-8000-000000000001";
const conversationId = "00000000-0000-4000-8000-000000000002";
const otherProfileId = "00000000-0000-4000-8000-000000000003";
const otherConversationId = "00000000-0000-4000-8000-000000000004";

describe("POST /api/chat", () => {
  beforeEach(() => {
    vi.stubEnv("CHAT_RATE_LIMIT_MAX", "");
    vi.stubEnv("CHAT_RATE_LIMIT_WINDOW_MS", "");
    resetChatRuntime();
    resetRateLimitStore();
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

  test("rate limits repeated chat requests from the same client", async () => {
    vi.stubEnv("CHAT_RATE_LIMIT_MAX", "2");
    vi.stubEnv("CHAT_RATE_LIMIT_WINDOW_MS", "60000");

    const requestBody = {
      profileId,
      conversationId,
      messages: [{ role: "user", content: "hello" }],
    };
    const headers = { "x-forwarded-for": "203.0.113.10" };

    await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
      }),
    );
    await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
      }),
    );

    const limited = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
      }),
    );

    expect(limited.status).toBe(429);
    expect(limited.headers.get("Retry-After")).toBe("60");
    await expect(limited.text()).resolves.toBe("rate limit exceeded");
  });

  test("rate limits repeated profile deletion requests from the same client", async () => {
    vi.stubEnv("CHAT_RATE_LIMIT_MAX", "1");
    vi.stubEnv("CHAT_RATE_LIMIT_WINDOW_MS", "60000");
    const headers = { "x-forwarded-for": "203.0.113.11" };

    await DELETE(
      new Request(`http://localhost/api/chat?profileId=${profileId}`, {
        method: "DELETE",
        headers,
      }),
    );

    const limited = await DELETE(
      new Request(`http://localhost/api/chat?profileId=${profileId}`, {
        method: "DELETE",
        headers,
      }),
    );

    expect(limited.status).toBe(429);
    expect(limited.headers.get("Retry-After")).toBe("60");
    await expect(limited.text()).resolves.toBe("rate limit exceeded");
  });

  test("streams a readable grounded answer and exposes evidence metadata", async () => {
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
    expect(text).toContain("结论：");
    expect(text).toContain("命盘依据：");
    expect(text).toContain("追问：");
    expect(text).not.toMatch(/缁撹|鍛界洏|杩介棶|锛�/);

    const evidence = readEvidenceHeader(response);
    expect(evidence).toMatchObject({
      toolsUsed: [
        "createChart",
        "getCurrentChart",
        "summarizeChartFacts",
        "getPalaceAnalysis",
        "getLuckCycle",
        "loadSkill",
        "searchKnowledge",
        "runResponseCritic",
      ],
      critic: {
        status: "passed",
        issues: [],
      },
    });
    expect(evidence.chartFacts.length).toBeGreaterThan(0);
    expect(evidence.chartFacts[0]).toMatchObject({
      topic: "career",
      palace: expect.any(String),
      rawText: expect.any(String),
    });

    const snapshot = getChatRuntimeSnapshot();
    expect(snapshot.messages.map((message) => message.role)).toEqual([
      "user",
      "assistant",
    ]);
    expect(snapshot.toolEvents.map((event) => event.toolName)).toEqual([
      "createChart",
      "getCurrentChart",
      "summarizeChartFacts",
      "getPalaceAnalysis",
      "getLuckCycle",
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

  test("uses page-supplied OpenAI-compatible model settings after tools and critic run", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content:
                  "结论：模型生成的事业分析回答。\n\n命盘依据：\n- 官禄宫提供当前事业判断基础。\n\n现实解释：这更像是先观察机会，再决定行动节奏。\n\n建议：先整理岗位条件和市场反馈。\n\n追问：你现在更想换环境，还是换工作内容？",
              },
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

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
          modelSettings: {
            provider: "deepseek",
            baseUrl: "https://api.deepseek.com/v1",
            apiKey: "sk-user",
            model: "deepseek-chat",
          },
        }),
      }),
    );

    await expect(response.text()).resolves.toContain("模型生成的事业分析回答");
    expect(fetchMock).toHaveBeenCalledOnce();

    const evidence = readEvidenceHeader(response);
    expect(evidence.toolsUsed).toContain("generateModelResponse");
  });

  test("forwards OpenAI-compatible model stream tokens through the chat response", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      new Response(
        [
          'data: {"choices":[{"delta":{"content":"stream "}}]}\n\n',
          'data: {"choices":[{"delta":{"content":"from "}}]}\n\n',
          'data: {"choices":[{"delta":{"content":"model"}}]}\n\n',
          "data: [DONE]\n\n",
        ].join(""),
        { status: 200, headers: { "content-type": "text/event-stream" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

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
          modelSettings: {
            provider: "openai-compatible",
            baseUrl: "https://example.test/v1",
            apiKey: "sk-user",
            model: "test-model",
          },
        }),
      }),
    );

    await expect(response.text()).resolves.toBe("stream from model");
    const requestInit = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
    expect(JSON.parse(String(requestInit?.body))).toMatchObject({ stream: true });
    expect(readEvidenceHeader(response).toolsUsed).toContain("generateModelResponse");
  });

  test("returns a response body that can be fully consumed by Web Response readers", async () => {
    const response = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        body: JSON.stringify({
          profileId,
          conversationId,
          messages: [{ role: "user", content: "hello" }],
        }),
      }),
    );

    expect(response.headers.get("Content-Type")).toBe("text/plain; charset=utf-8");

    const reader = response.body?.getReader();
    expect(reader).toBeDefined();

    let chunks = 0;
    while (reader) {
      const { done } = await reader.read();
      if (done) break;
      chunks += 1;
    }

    expect(chunks).toBeGreaterThan(0);
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

function readEvidenceHeader(response: Response) {
  const encoded = response.headers.get("X-Ziwei-Evidence");
  if (!encoded) {
    throw new Error("Missing X-Ziwei-Evidence header");
  }

  return JSON.parse(decodeURIComponent(encoded));
}
