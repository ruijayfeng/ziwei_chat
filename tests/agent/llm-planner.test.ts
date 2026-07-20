import { describe, expect, test, vi } from "vitest";

import { createLlmAnalysisPlan } from "../../src/lib/agent/llm-planner";
import type { AnalysisPlan, IntentRoute } from "../../src/lib/domain/analysis";

const fallbackPlan: AnalysisPlan = {
  topic: "career",
  requiredChartFacts: ["career palace"],
  requiredTools: ["getCurrentChart", "summarizeChartFacts", "searchKnowledge"],
  requiredSkills: ["career"],
  knowledgeQueries: ["career palace"],
  safetyLevel: "caution",
  expectedResponseShape: ["natural_dialogue", "grounded_interpretation", "practical_direction"],
};

const route: IntentRoute = {
  intent: "career",
  confidence: 0.82,
  requiresChart: true,
  safetyLevel: "caution",
  rationale: "career keyword",
};

describe("LLM planner", () => {
  test("uses constrained model JSON and filters unallowed tools", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  requiredTools: ["getCurrentChart", "deleteEverything", "getLuckCycle"],
                  requiredSkills: ["career"],
                  knowledgeQueries: ["官禄 天同 换工作"],
                }),
              },
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      createLlmAnalysisPlan({
        settings: {
          provider: "openai-compatible",
          enabled: true,
          baseUrl: "https://example.test/v1",
          apiKey: "sk-test",
          model: "test-model",
          embedding: {
            provider: "disabled",
            enabled: false,
            baseUrl: "",
            apiKey: "",
            model: "",
          },
        },
        userContent: "我想换工作",
        route,
        deterministicPlan: fallbackPlan,
        chartFacts: [],
      }),
    ).resolves.toMatchObject({
      source: "model",
      plan: {
        requiredTools: ["getCurrentChart", "getLuckCycle"],
        requiredSkills: ["career"],
        knowledgeQueries: ["官禄 天同 换工作"],
      },
    });
  });

  test("falls back when model settings are incomplete", async () => {
    await expect(
      createLlmAnalysisPlan({
        settings: {
          provider: "deterministic-local",
          enabled: false,
          baseUrl: "",
          apiKey: "",
          model: "",
          embedding: {
            provider: "disabled",
            enabled: false,
            baseUrl: "",
            apiKey: "",
            model: "",
          },
        },
        userContent: "我想换工作",
        route,
        deterministicPlan: fallbackPlan,
        chartFacts: [],
      }),
    ).resolves.toEqual({
      plan: fallbackPlan,
      source: "deterministic",
      errorCode: null,
    });
  });

  test("falls back to the deterministic plan when the planner model hangs", async () => {
    vi.useFakeTimers();

    try {
      const fetchImplementation = vi.fn<typeof fetch>(async () => new Promise<Response>(() => {}));
      const result = createLlmAnalysisPlan({
        settings: {
          provider: "openai-compatible",
          enabled: true,
          baseUrl: "https://example.test/v1",
          apiKey: "sk-test",
          model: "test-model",
          embedding: {
            provider: "disabled",
            enabled: false,
            baseUrl: "",
            apiKey: "",
            model: "",
          },
        },
        userContent: "我想换工作",
        route,
        deterministicPlan: fallbackPlan,
        chartFacts: [],
        timeoutMs: 25,
        fetchImplementation,
      });

      await vi.advanceTimersByTimeAsync(25);
      await expect(result).resolves.toEqual({
        plan: fallbackPlan,
        source: "fallback",
        errorCode: "MODEL_TIMEOUT",
      });
    } finally {
      vi.useRealTimers();
    }
  });

  test("reports fallback when planner JSON omits the required arrays", async () => {
    const fetchImplementation = vi.fn<typeof fetch>(async () =>
      new Response(JSON.stringify({ choices: [{ message: { content: "{}" } }] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    await expect(
      createLlmAnalysisPlan({
        settings: {
          provider: "openai-compatible",
          enabled: true,
          baseUrl: "https://example.test/v1",
          apiKey: "sk-test",
          model: "test-model",
          embedding: {
            provider: "disabled",
            enabled: false,
            baseUrl: "",
            apiKey: "",
            model: "",
          },
        },
        userContent: "我想换工作",
        route,
        deterministicPlan: fallbackPlan,
        chartFacts: [],
        fetchImplementation,
      }),
    ).resolves.toEqual({
      plan: fallbackPlan,
      source: "fallback",
      errorCode: "INVALID_PLANNER_OUTPUT",
    });
  });
});
