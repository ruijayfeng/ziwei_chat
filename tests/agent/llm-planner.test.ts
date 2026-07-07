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
  expectedResponseShape: ["conclusion", "chart_basis", "plain_explanation", "suggestion", "follow_up"],
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
      requiredTools: ["getCurrentChart", "getLuckCycle"],
      requiredSkills: ["career"],
      knowledgeQueries: ["官禄 天同 换工作"],
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
    ).resolves.toEqual(fallbackPlan);
  });
});
