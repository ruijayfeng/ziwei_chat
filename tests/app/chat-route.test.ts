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

  test("does not present a deterministic template as a completed chart analysis when no LLM is configured", async () => {
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
    expect(text).toContain("请先在设置中配置回答模型");
    expect(text).not.toContain("命盘依据：");

    const evidence = readEvidenceHeader(response);
    expect(evidence).toMatchObject({
      toolsUsed: [
        "createChart",
        "getCurrentChart",
        "summarizeChartFacts",
        "createAnalysisPlan",
        "getPalaceAnalysis",
        "getLuckCycle",
        "loadSkill",
        "searchKnowledge",
        "runResponseCritic",
      ],
      generation: {
        mode: "model_required",
      },
    });
    expect(evidence.chartFacts.length).toBeGreaterThan(0);
    expect(evidence.chartFacts[0]).toMatchObject({
      topic: "career",
      palace: expect.any(String),
      rawText: expect.any(String),
    });
    expect(evidence.runs[0].steps.find((step: { id: string }) => step.id === "plan")?.detail).toContain(
      "确定性计划",
    );
    for (const stepId of ["plan", "skill", "rag", "critic"]) {
      expect(evidence.runs[0].steps.find((step: { id: string }) => step.id === stepId)?.detail).toMatch(
        /\d+(?:\.\d+)?(?:ms|s)/,
      );
    }

    expect(getChatRuntimeSnapshot()).toEqual({ messages: [], toolEvents: [], persistedToolEvents: [] });
  });

  test("never substitutes a deterministic chart answer when a configured model request fails", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => new Response("upstream unavailable", { status: 503 }));
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

    const events = parseStreamEvents(await response.text());
    const answer = events.filter((event) => event.event === "token").map((event) => event.data).join("");
    const finalEvidence = events
      .filter((event) => event.event === "evidence")
      .at(-1)?.data as {
        generation?: { mode?: string };
        runs: Array<{ steps: Array<{ id: string; detail: string }> }>;
      } | undefined;

    expect(answer).toBe("");
    expect(answer).not.toContain("你最近更适合先观察机会");
    expect(events).toContainEqual({
      event: "error",
      data: { message: "本次 LLM 分析未完成，请检查设置中的模型配置或网络连接后重试。", canRetry: true },
    });
    expect(finalEvidence?.generation?.mode).toBe("model_failed");
    expect(finalEvidence?.runs[0].steps.find((step: { id: string }) => step.id === "plan")?.detail).toContain(
      "模型规划失败，已使用确定性计划",
    );
    expect(getChatRuntimeSnapshot()).toEqual({ messages: [], toolEvents: [], persistedToolEvents: [] });
  });

  test("surfaces the revision provider error in final evidence", async () => {
    let callCount = 0;
    const fetchMock = vi.fn<typeof fetch>(async () => {
      callCount += 1;
      if (callCount === 1) {
        return new Response(JSON.stringify({ choices: [{ message: { content: "{}" } }] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }

      if (callCount === 2) {
        return new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: [
                    "\u7ed3\u8bba\uff1a\u4e00\u5b9a\u3002",
                    "",
                    "\u547d\u76d8\u4f9d\u636e\uff1a\u5b98\u7984\u5bab\u6709\u5929\u540c\u3002",
                    "",
                    "\u73b0\u5b9e\u89e3\u91ca\uff1a\u5148\u628a\u9009\u62e9\u62c6\u6210\u51e0\u6b65\u3002",
                    "",
                    "\u5efa\u8bae\uff1a\u5148\u505a\u4e00\u6b21\u5c0f\u8303\u56f4\u9a8c\u8bc1\u3002",
                    "",
                    "\u8ffd\u95ee\uff1a\u4f60\u66f4\u60f3\u5148\u770b\u4e8b\u4e1a\u8fd8\u662f\u5173\u7cfb\uff1f",
                  ].join("\n"),
                },
              },
            ],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }

      return new Response("revision unavailable", { status: 503 });
    });
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

    const events = parseStreamEvents(await response.text());
    const finalEvidence = events
      .filter((event) => event.event === "evidence")
      .at(-1)?.data as { generation?: { detail?: string } } | undefined;

    expect(callCount).toBe(3);
    expect(finalEvidence?.generation?.detail).toContain("model request failed with status 503");
  });

  test("restores the active chart for a follow-up request in the same anonymous workspace", async () => {
    const chartInput = {
      profileId,
      name: "Primary chart",
      gender: "male" as const,
      birthDate: "1990-05-17",
      birthTime: "12:00",
      calendarType: "solar" as const,
      isPrimary: true,
    };

    await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        body: JSON.stringify({
          profileId,
          conversationId,
          chartInput,
          messages: [{ role: "user", content: "请解释一下我的命盘重点。" }],
        }),
      }),
    );

    const followUp = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        body: JSON.stringify({
          profileId,
          conversationId,
          chartInput,
          messages: [
            { role: "user", content: "请解释一下我的命盘重点。" },
            { role: "assistant", content: "已完成命盘解释。" },
            { role: "user", content: "我今年财运" },
          ],
        }),
      }),
    );

    const answer = await followUp.text();
    expect(answer).toContain("请先在设置中配置回答模型");
    expect(answer).not.toContain("请先创建一张命盘");
    const evidence = readEvidenceHeader(followUp);
    expect(evidence.chartFacts.length).toBeGreaterThan(0);
    expect(evidence.runs[0].summary).toContain(`读取 ${evidence.chartFacts.length} 条命盘事实`);
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
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const evidence = readEvidenceHeader(response);
    expect(evidence.toolsUsed).toContain("generateModelResponse");
  });

  test("returns the structured chart error for invalid birth time", async () => {
    const response = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        body: JSON.stringify({
          profileId,
          conversationId,
          chartInput: {
            profileId,
            name: "Invalid chart",
            gender: "male",
            birthDate: "1990-05-17",
            birthTime: "25:00",
            calendarType: "solar",
            isPrimary: true,
          },
          messages: [{ role: "user", content: careerQuestion }],
        }),
      }),
    );

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "INVALID_BIRTH_TIME", recoverable: true },
    });
  });

  test("passes real iztro luck-cycle evidence into recent-fortune model context", async () => {
    const modelAnswer =
      "结论：近期适合按月观察节奏。\n\n命盘依据：\n- 工具提供了当前流月范围。\n\n现实解释：这些时间信息只作为观察方向。\n\n建议：按月复盘现实变化。\n\n追问：你最想观察工作、关系还是财务？";
    const fetchMock = vi.fn<typeof fetch>(async () =>
      new Response(
        JSON.stringify({ choices: [{ message: { content: modelAnswer } }] }),
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
          messages: [{ role: "user", content: "我最近的运势重点是什么？" }],
          modelSettings: {
            provider: "openai-compatible",
            baseUrl: "https://example.test/v1",
            apiKey: "sk-user",
            model: "test-model",
          },
        }),
      }),
    );

    await response.text();
    const requestInit = fetchMock.mock.calls.at(-1)?.[1] as RequestInit | undefined;
    const payload = JSON.parse(String(requestInit?.body)) as {
      messages: Array<{ content: string }>;
    };
    const modelContext = payload.messages.at(-1)?.content ?? "";
    const monthScopes = new Set(modelContext.match(/流月：\d{4}-\d{2}-\d{2}/g) ?? []);
    expect(monthScopes.size).toBe(3);
    expect(modelContext).not.toContain(":three_months");
  });

  test("keeps general conversation natural instead of asking for birth data", async () => {
    const modelAnswer = "当然可以。你今天想聊点什么？";
    const fetchMock = vi.fn<typeof fetch>(async () =>
      new Response(
        JSON.stringify({ choices: [{ message: { content: modelAnswer } }] }),
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
          messages: [{ role: "user", content: "你好，今天过得怎么样？" }],
          modelSettings: {
            provider: "moonshot",
            baseUrl: "https://api.moonshot.cn/v1",
            apiKey: "sk-user",
            model: "kimi-k2.6",
          },
        }),
      }),
    );

    const events = parseStreamEvents(await response.text());
    expect(events.filter((event) => event.event === "token").map((event) => event.data).join("")).toBe(
      modelAnswer,
    );

    const requestInit = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
    const payload = JSON.parse(String(requestInit?.body)) as { messages: Array<{ content: string }> };
    expect(payload.messages[1]?.content).toContain("当前命盘状态：已设置。");
    expect(payload.messages[1]?.content).toContain("当前不是命盘分析");
    expect(payload.messages[1]?.content).not.toContain("先告诉我你的出生日期");
  });

  test("keeps general conversation direct when no chart is set", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      new Response(
        JSON.stringify({ choices: [{ message: { content: "当然可以。你今天想聊点什么？" } }] }),
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
          messages: [{ role: "user", content: "你好，今天过得怎么样？" }],
          modelSettings: {
            provider: "moonshot",
            baseUrl: "https://api.moonshot.cn/v1",
            apiKey: "sk-user",
            model: "kimi-k2.6",
          },
        }),
      }),
    );

    await response.text();

    const requestInit = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
    const payload = JSON.parse(String(requestInit?.body)) as { messages: Array<{ content: string }> };
    expect(payload.messages[1]?.content).toContain("当前命盘状态：未设置。");
    expect(payload.messages[1]?.content).toContain("请自然、直接地回应用户当前消息");
  });

  test("does not recreate deleted profile data when an active model request finishes late", async () => {
    let releaseModel: (() => void) | undefined;
    const modelStarted = Promise.withResolvers<void>();
    vi.stubGlobal("fetch", vi.fn<typeof fetch>(async () => {
      modelStarted.resolve();
      await new Promise<void>((resolve) => {
        releaseModel = resolve;
      });
      return new Response(
        JSON.stringify({ choices: [{ message: { content: "late model answer" } }] }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }));

    const activeResponse = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        body: JSON.stringify({
          profileId,
          conversationId,
          messages: [{ role: "user", content: "hello" }],
          modelSettings: {
            provider: "openai-compatible",
            baseUrl: "https://example.test/v1",
            apiKey: "sk-user",
            model: "test-model",
          },
        }),
      }),
    );

    await modelStarted.promise;
    const deleted = await DELETE(
      new Request(`http://localhost/api/chat?profileId=${profileId}`, { method: "DELETE" }),
    );
    expect(deleted.status).toBe(204);

    releaseModel?.();
    await activeResponse.text();

    expect(getChatRuntimeSnapshot()).toMatchObject({
      messages: [],
      toolEvents: [],
      persistedToolEvents: [],
    });
  });

  test("keeps no profile-owned server state when database persistence is disabled", async () => {
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
    await response.text();

    expect(getChatRuntimeSnapshot()).toEqual({
      messages: [],
      toolEvents: [],
      persistedToolEvents: [],
    });
    expect(getChatRuntimeStores()).toMatchObject({
      memories: [],
      conversationSummaries: [],
      toolEvents: [],
    });
  });

  test("streams model answers as evidence and token events after final critic", async () => {
    const modelAnswer =
      "结论：模型生成的事业分析回答。\n\n命盘依据：\n- 工具已提供事业判断基础。\n\n现实解释：先观察机会，再决定行动节奏。\n\n建议：先整理岗位条件和市场反馈。\n\n追问：你现在更想换环境还是换内容?";
    const fetchMock = vi.fn<typeof fetch>(async () =>
      new Response(
        [
          `data: {"choices":[{"delta":{"content":${JSON.stringify(modelAnswer.slice(0, 12))}}}]}\n\n`,
          `data: {"choices":[{"delta":{"content":${JSON.stringify(modelAnswer.slice(12))}}}]}\n\n`,
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

    expect(response.headers.get("X-Ziwei-Stream")).toBe("events");
    const events = parseStreamEvents(await response.text());
    expect(events.filter((event) => event.event === "evidence").length).toBeGreaterThanOrEqual(2);
    expect(events.filter((event) => event.event === "token").map((event) => event.data).join("")).toBe(
      modelAnswer,
    );
    expect(events.at(-1)).toEqual({ event: "done", data: null });
    const finalEvidence = events
      .filter((event) => event.event === "evidence")
      .at(-1)?.data as { generation?: { detail?: string } } | undefined;
    expect(finalEvidence?.generation?.detail).toMatch(/首字 .*，完成 .*/);
    const requestInit = fetchMock.mock.calls.at(-1)?.[1] as RequestInit | undefined;
    const modelRequest = JSON.parse(String(requestInit?.body)) as {
      stream: boolean;
      messages: Array<{ content: string }>;
    };
    expect(modelRequest).toMatchObject({ stream: true });
    expect(modelRequest.messages.at(-1)?.content).toContain("skill 回答规则：");
    expect(modelRequest.messages.at(-1)?.content).toContain("skill 保守条件：");
    expect(modelRequest.messages.at(-1)?.content).toContain("Do not tell the user to resign immediately.");
    expect(modelRequest.messages.at(-1)?.content).toContain('Path: "Should I change jobs?"');
    expect(readEvidenceHeader(response).toolsUsed).toContain("generateModelResponse");
  });

  test("reports a retryable failure when the model answer fails the final critic", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      new Response('data: {"choices":[{"delta":{"content":"unsafe model answer"}}]}\n\ndata: [DONE]\n\n', {
        status: 200,
        headers: { "content-type": "text/event-stream" },
      }),
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

    const events = parseStreamEvents(await response.text());
    const answer = events.filter((event) => event.event === "token").map((event) => event.data).join("");
    expect(answer).toBe("");
    expect(answer).not.toContain("unsafe model answer");
    expect(events).toContainEqual({
      event: "error",
      data: { message: "本次 LLM 分析未完成，请检查设置中的模型配置或网络连接后重试。", canRetry: true },
    });
    expect(events.some((event) => event.event === "evidence" && JSON.stringify(event.data).includes("降级"))).toBe(
      false,
    );
  });

  test("revises a model answer once when the final critic rejects the first draft", async () => {
    const revisedAnswer =
      "结论：这次更适合先把选择拆成可验证的步骤。\n\n命盘依据：\n- 工具已经提供事业判断基础。\n\n现实解释：这不是直接替你做不可逆决定，而是把命盘倾向和现实条件放在一起看。\n\n建议：先列出两周内可以验证的岗位条件、学习时间和外部反馈。\n\n追问：你现在更担心方向选错，还是执行过程撑不住？";
    let modelCallIndex = 0;
    const fetchMock = vi.fn<typeof fetch>(async () => {
      const callIndex = modelCallIndex;
      modelCallIndex += 1;
      if (callIndex === 0) {
        return new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    requiredTools: [
                      "getCurrentChart",
                      "summarizeChartFacts",
                      "getPalaceAnalysis",
                      "getLuckCycle",
                      "loadSkill",
                      "searchKnowledge",
                      "runResponseCritic",
                    ],
                    requiredSkills: ["career"],
                    knowledgeQueries: ["career palace"],
                  }),
                },
              },
            ],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }

      if (callIndex === 1) {
        return new Response('data: {"choices":[{"delta":{"content":"unsafe model answer"}}]}\n\ndata: [DONE]\n\n', {
          status: 200,
          headers: { "content-type": "text/event-stream" },
        });
      }

      return new Response(
        [`data: {"choices":[{"delta":{"content":${JSON.stringify(revisedAnswer)}}}]}\n\n`, "data: [DONE]\n\n"].join(""),
        { status: 200, headers: { "content-type": "text/event-stream" } },
      );
    });
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

    const events = parseStreamEvents(await response.text());
    const answer = events.filter((event) => event.event === "token").map((event) => event.data).join("");
    expect(answer).toBe(revisedAnswer);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const revisionRequest = fetchMock.mock.calls.at(-1)?.[1] as RequestInit | undefined;
    const revisionPayload = JSON.parse(String(revisionRequest?.body)) as {
      messages: Array<{ content: string }>;
    };
    expect(revisionPayload.messages[1]?.content).toContain("封闭引用区");
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

function parseStreamEvents(text: string): Array<{ event: string; data: unknown }> {
  return text
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as { event: string; data: unknown });
}
