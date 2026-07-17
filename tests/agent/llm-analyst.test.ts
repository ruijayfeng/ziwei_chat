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
  test("keeps the initial analysis within the bounded output budget", async () => {
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
    expect(body.messages?.at(-1)?.content).toContain("500 至 700 个中文字符");
    expect(body.messages?.at(-1)?.content).toContain("skill 回答规则：\n- use plain language");
    expect(body.messages?.at(-1)?.content).toContain("skill 保守条件：\n- missing career facts");
    expect(body.messages?.at(-1)?.content).toContain("skill 禁止建议：\n- Do not tell the user to resign immediately.");
    expect(body.messages?.at(-1)?.content).toContain("skill 常见问题路径：\n- Path: job change");
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
