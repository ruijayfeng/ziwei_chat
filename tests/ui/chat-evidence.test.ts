import { describe, expect, test } from "vitest";

import {
  evidenceFromResponse,
  evidenceKnowledgeSourceLabel,
  initialEvidence,
} from "../../src/lib/ui/chat-evidence";

describe("chat evidence UI helpers", () => {
  test("uses the empty evidence state when the response has no evidence header", () => {
    const response = new Response("ok");

    expect(evidenceFromResponse(response)).toEqual(initialEvidence);
  });

  test("decodes structured evidence from the chat response header", () => {
    const evidence = {
      toolsUsed: ["getCurrentChart", "summarizeChartFacts", "runResponseCritic"],
      chartFacts: [
        {
          id: "chart-1:career:官禄",
          topic: "career",
          palace: "官禄",
          stars: ["紫微"],
          transforms: [],
          patterns: ["命宫主星"],
          rawText: "官禄宫位主星为 紫微。",
          confidence: "high",
        },
      ],
      knowledgeSources: [
        {
          chunkId: "career-palace",
          title: "事业宫基础",
          source: "curated",
          sourcePath: "",
          sourceUrl: "",
          license: "",
          school: "default",
          confidence: "medium",
          excerpt: "事业分析先看官禄宫。",
          retrievalMode: "local",
        },
      ],
      critic: { status: "passed", issues: [] },
    };
    const response = new Response("ok", {
      headers: {
        "X-Ziwei-Evidence": encodeURIComponent(JSON.stringify(evidence)),
      },
    });

    expect(evidenceFromResponse(response)).toEqual(evidence);
  });

  test("formats knowledge source metadata for ordinary readers", () => {
    expect(
      evidenceKnowledgeSourceLabel({
        chunkId: "career",
        title: "事业宫基础",
        source: "Renhuai123/ziwei-doushu",
        sourcePath: "lib/classics/data/gusuifu.ts",
        sourceUrl: "https://github.com/Renhuai123/ziwei-doushu",
        license: "MIT",
        school: "default",
        confidence: "medium",
        excerpt: "官禄宫用于观察事业。",
        retrievalMode: "local",
      }),
    ).toBe("开源资料 · MIT · 本地检索");
  });
});
