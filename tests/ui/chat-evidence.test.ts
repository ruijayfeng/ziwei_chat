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

  test("decodes structured evidence and creates a legacy timeline run", () => {
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
          rawText: "官禄宫位主星为紫微。",
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

    const decoded = evidenceFromResponse(response);
    expect(decoded).toMatchObject(evidence);
    expect(decoded.runs).toEqual([
      expect.objectContaining({
        title: "本次分析",
        status: "completed",
        steps: expect.arrayContaining([
          expect.objectContaining({ label: "理解问题", status: "completed" }),
          expect.objectContaining({ label: "读取命盘", status: "completed" }),
          expect.objectContaining({ label: "检索知识", status: "completed" }),
          expect.objectContaining({ label: "critic 检查", status: "completed" }),
        ]),
      }),
    ]);
  });

  test("keeps explicit evidence timeline runs from the response header", () => {
    const evidence = {
      toolsUsed: ["getCurrentChart"],
      chartFacts: [],
      knowledgeSources: [],
      critic: { status: "not_run", issues: [] },
      runs: [
        {
          runId: "run-1",
          title: "事业分析",
          summary: "正在读取命盘",
          status: "running",
          startedAt: "2026-07-07T00:00:00.000Z",
          completedAt: "",
          steps: [
            {
              id: "chart",
              label: "读取命盘",
              detail: "读取官禄宫",
              status: "running",
            },
          ],
        },
      ],
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
