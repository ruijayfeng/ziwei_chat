import { describe, expect, test, vi } from "vitest";

import { generateLlmAnalysis, reviseLlmAnalysis } from "../../src/lib/agent/llm-analyst";

const settings = {
  provider: "openai-compatible" as const,
  enabled: true,
  baseUrl: "https://example.test/v1",
  apiKey: "sk-test",
  model: "test-model",
  embedding: {
    provider: "disabled" as const,
    enabled: false,
    baseUrl: "",
    apiKey: "",
    model: "",
  },
};

describe("LLM analyst revision", () => {
  test("uses the Zhiwei persona and grounded natural-dialogue analysis prompt", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      new Response(JSON.stringify({ choices: [{ message: { content: "answer" } }] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await generateLlmAnalysis({
      settings,
      userContent: "career question",
      deterministicDraft: "grounded draft",
      chartFacts: ["career fact"],
      skillSteps: ["inspect career facts"],
      skillResponseRules: ["use plain language"],
      skillConservativeConditions: ["missing career facts"],
      skillForbiddenAdvice: ["Do not tell the user to resign immediately."],
      skillCommonQuestionPaths: ["Path: job change"],
      knowledgeSources: ["career source"],
      criticStatus: "passed",
      criticIssues: [],
      onToken: undefined,
    });

    const requestInit = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
    const body = JSON.parse(String(requestInit?.body)) as {
      max_tokens?: number;
      messages?: Array<{ content?: string }>;
    };
    expect(body.max_tokens).toBe(1_200);
    expect(body.messages?.[0]?.content).toContain("你叫「知微」");
    expect(body.messages?.at(-1)?.content).toContain("当前模式：analysis");
    expect(body.messages?.at(-1)?.content).toContain("<chart_facts>\ncareer fact\n</chart_facts>");
    expect(body.messages?.at(-1)?.content).toContain("use plain language");
    expect(body.messages?.at(-1)?.content).toContain("missing career facts");
    expect(body.messages?.at(-1)?.content).toContain("Do not tell the user to resign immediately.");
    expect(body.messages?.at(-1)?.content).not.toContain("500 至 700 个中文字符");
    expect(body.messages?.at(-1)?.content).not.toContain("完整保留结论、命盘依据、现实解释、建议和一个追问");
    vi.unstubAllGlobals();
  });

  test("scopes ordinary conversation without forcing a chart report", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      new Response(JSON.stringify({ choices: [{ message: { content: "answer" } }] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await generateLlmAnalysis({
      settings,
      userContent: "今天好累。",
      deterministicDraft: "",
      chartFacts: [],
      skillSteps: [],
      skillResponseRules: [],
      skillConservativeConditions: [],
      skillForbiddenAdvice: [],
      skillCommonQuestionPaths: [],
      knowledgeSources: [],
      criticStatus: "passed",
      criticIssues: [],
      responseMode: "conversation",
      conversationContext: "用户刚结束一段忙碌的工作。",
      hasChart: true,
    });

    const requestInit = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
    const body = JSON.parse(String(requestInit?.body)) as { messages?: Array<{ content?: string }> };
    expect(body.messages?.[0]?.content).toContain("你叫「知微」");
    expect(body.messages?.at(-1)?.content).toContain("当前模式：conversation");
    expect(body.messages?.at(-1)?.content).toContain("不把聊天、倾诉或产品问答强行解释为命盘分析");
    expect(body.messages?.at(-1)?.content).not.toContain("结论 / 命盘依据 / 现实解释 / 建议 / 追问");
    vi.unstubAllGlobals();
  });

  test("uses the shorter revision request budget", async () => {
    vi.useFakeTimers();
    let revision: ReturnType<typeof reviseLlmAnalysis> | undefined;

    try {
      vi.stubGlobal("fetch", vi.fn<typeof fetch>(async () => new Promise<Response>(() => {})));
      revision = reviseLlmAnalysis({
        settings,
        userContent: "career question",
        deterministicDraft: "grounded draft",
        chartFacts: ["career fact"],
        skillSteps: ["inspect career facts"],
        skillResponseRules: [],
        skillConservativeConditions: [],
        skillForbiddenAdvice: [],
        skillCommonQuestionPaths: [],
        knowledgeSources: ["career source"],
        criticStatus: "passed",
        criticIssues: [],
        failedContent: "failed answer",
        finalCriticIssues: ["unknown chart fact"],
      });

      await vi.advanceTimersByTimeAsync(20_001);

      expect(vi.getTimerCount()).toBe(0);
      await expect(revision).resolves.toMatchObject({
        ok: false,
        errorCode: "MODEL_TIMEOUT",
      });
    } finally {
      await vi.runAllTimersAsync();
      if (revision) await revision;
      vi.unstubAllGlobals();
      vi.useRealTimers();
    }
  });
});
