import { describe, expect, test } from "vitest";

import {
  loadSkill,
  parseSkillMarkdown,
} from "../../src/lib/knowledge/skill-loader";
import { searchKnowledge } from "../../src/lib/knowledge/search";

describe("skill loader", () => {
  test("loads a valid MVP topic skill from Markdown front matter and sections", async () => {
    const skill = await loadSkill("career");

    expect(skill).toMatchObject({
      skillId: "career",
      version: "1.0.0",
      topic: "career",
      tools: expect.arrayContaining([
        "getCurrentChart",
        "summarizeChartFacts",
        "searchKnowledge",
      ]),
      requiredFacts: expect.arrayContaining(["career palace", "life palace"]),
      analysisSteps: expect.arrayContaining([
        "Identify career-related palace facts.",
      ]),
      responseRules: expect.arrayContaining([
        "Start with a practical conclusion.",
      ]),
      safetyNotes: expect.arrayContaining([
        "Do not tell the user to resign immediately.",
      ]),
    });
  });

  test("rejects malformed skills with a structured parse error", () => {
    expect(() =>
      parseSkillMarkdown({
        filePath: "bad.md",
        markdown: "---\nid: bad\n---\n# Bad",
      }),
    ).toThrow("Skill bad.md is missing required field: version");
  });
});

describe("local knowledge search", () => {
  test("returns source metadata from curated Markdown without embedding configuration", async () => {
    const results = await searchKnowledge({
      query: "career palace",
      topic: "career",
      chartTerms: ["官禄"],
      limit: 3,
      retrievalMode: "local",
    });

    expect(results).toEqual([
      expect.objectContaining({
        chunkId: expect.stringContaining("career-palace"),
        title: "Career palace basics",
        source: "curated-internal",
        school: "default",
        confidence: "high",
        retrievalMode: "local",
      }),
    ]);
  });
});
