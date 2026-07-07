import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

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
        "先确认官禄宫事实，并给出实际工作倾向。",
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

  test("all beta skills define analysis order, conservative boundaries, and common question paths", async () => {
    const skillIds = [
      "career",
      "relationship",
      "wealth",
      "personality",
      "recent_fortune",
      "chart_explanation",
    ] as const;

    for (const skillId of skillIds) {
      const skill = await loadSkill(skillId);

      expect(skill.analysisSteps.length, `${skillId} analysis steps`).toBeGreaterThanOrEqual(5);
      expect(skill.responseRules.length, `${skillId} response rules`).toBeGreaterThanOrEqual(4);
      expect(skill.safetyNotes.length, `${skillId} safety notes`).toBeGreaterThanOrEqual(3);
      expect(skill.body, `${skillId} primary facts`).toContain("## Primary Facts");
      expect(skill.body, `${skillId} auxiliary signals`).toContain("## Auxiliary Signals");
      expect(skill.body, `${skillId} conservative conditions`).toContain(
        "## Conservative Conditions",
      );
      expect(skill.body, `${skillId} forbidden advice`).toContain("## Forbidden Advice");
      expect(skill.body, `${skillId} common question paths`).toContain(
        "## Common Question Paths",
      );
      expect(
        skill.body
          .split("\n")
          .filter((line) => line.startsWith("- Path: ")).length,
        `${skillId} common question path count`,
      ).toBeGreaterThanOrEqual(3);
    }
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

    expect(results[0]).toEqual(
      expect.objectContaining({
        chunkId: expect.stringContaining("career-palace"),
        title: "事业宫基础",
        source: "curated-internal",
        school: "default",
        confidence: "high",
        retrievalMode: "local",
      }),
    );
    expect(results.length).toBeGreaterThan(0);
  });

  test("retrieves at least one knowledge source for each beta topic", async () => {
    const topics = [
      { topic: "career", query: "career palace", terms: ["官禄"] },
      { topic: "relationship", query: "relationship palace", terms: ["夫妻"] },
      { topic: "wealth", query: "wealth palace", terms: ["财帛"] },
      { topic: "personality", query: "life palace", terms: ["命宫"] },
      { topic: "recent_fortune", query: "recent fortune timing", terms: ["运限"] },
    ];

    for (const item of topics) {
      const results = await searchKnowledge({
        query: item.query,
        topic: item.topic,
        chartTerms: item.terms,
        limit: 3,
        retrievalMode: "local",
      });

      expect(results.length, item.topic).toBeGreaterThan(0);
      expect(results[0]).toMatchObject({
        source: expect.any(String),
        license: expect.any(String),
        retrievalMode: "local",
      });
    }
  });

  test("can retrieve topic-classified imported knowledge with source path and license", async () => {
    const root = await mkdtemp(join(tmpdir(), "ziwei-topic-knowledge-"));
    const importedDir = join(root, "content", "knowledge", "imported", "ziwei-doushu");
    await mkdir(importedDir, { recursive: true });
    await writeFile(
      join(importedDir, "ziwei-doushu-classic-career.md"),
      [
        "---",
        "title: 官禄宫摘录",
        "topic: career",
        "terms:",
        "  - 官禄",
        "  - 事业",
        "school: default",
        "confidence: medium",
        "source: Renhuai123/ziwei-doushu",
        "sourcePath: lib/classics/data/example.ts",
        "sourceUrl: https://github.com/Renhuai123/ziwei-doushu",
        "license: MIT",
        "---",
        "",
        "官禄宫可观察事业责任、职位期待与工作节奏，回答时需要保守表达。",
      ].join("\n"),
      "utf8",
    );

    const results = await searchKnowledge({
      query: "career palace",
      topic: "career",
      chartTerms: ["官禄"],
      limit: 1,
      retrievalMode: "local",
      contentRoot: root,
    });

    expect(results).toEqual([
      expect.objectContaining({
        chunkId: "ziwei-doushu-classic-career",
        source: "Renhuai123/ziwei-doushu",
        sourcePath: "lib/classics/data/example.ts",
        license: "MIT",
      }),
    ]);
  });

  test("ranks higher-confidence curated knowledge ahead of low-confidence imported text", async () => {
    const root = await mkdtemp(join(tmpdir(), "ziwei-quality-knowledge-"));
    const knowledgeDir = join(root, "content", "knowledge");
    const importedDir = join(knowledgeDir, "imported", "ziwei-doushu");
    await mkdir(importedDir, { recursive: true });
    await writeFile(
      join(knowledgeDir, "career-curated.md"),
      [
        "---",
        "title: Career cautious rule",
        "topic: career",
        "terms:",
        "  - 官禄",
        "school: default",
        "confidence: high",
        "source: curated-internal",
        "sourcePath: content/knowledge/career-curated.md",
        "sourceUrl: ",
        "license: internal",
        "---",
        "",
        "官禄宫用于观察事业责任和工作节奏，回答时必须保守表达。",
      ].join("\n"),
      "utf8",
    );
    await writeFile(
      join(importedDir, "career-low.md"),
      [
        "---",
        "title: Career absolute classic",
        "topic: career",
        "terms:",
        "  - 官禄",
        "school: default",
        "confidence: low",
        "source: Renhuai123/ziwei-doushu",
        "sourcePath: lib/classics/data/example.ts",
        "sourceUrl: https://github.com/Renhuai123/ziwei-doushu",
        "license: MIT",
        "---",
        "",
        "官禄宫一见此格便主事业必成，此类绝对说法只可作为降权材料。",
      ].join("\n"),
      "utf8",
    );

    const results = await searchKnowledge({
      query: "career palace",
      topic: "career",
      chartTerms: ["官禄"],
      limit: 2,
      retrievalMode: "local",
      contentRoot: root,
    });

    expect(results.map((result) => result.chunkId)).toEqual([
      "career-curated",
      "career-low",
    ]);
  });

  test("loads imported knowledge chunks from nested directories", async () => {
    const root = await mkdtemp(join(tmpdir(), "ziwei-knowledge-"));
    const importedDir = join(root, "content", "knowledge", "imported", "ziwei-doushu");
    await mkdir(importedDir, { recursive: true });
    await writeFile(
      join(importedDir, "ziwei-doushu-pattern-jun-chen-qing-hui.md"),
      [
        "---",
        "title: 格局：君臣庆会",
        "topic: general",
        "terms:",
        "  - 君臣庆会",
        "  - 命宫",
        "school: default",
        "confidence: medium",
        "source: Renhuai123/ziwei-doushu",
        "sourcePath: lib/ziwei/patterns.ts",
        "sourceUrl: https://github.com/Renhuai123/ziwei-doushu",
        "license: MIT",
        "---",
        "",
        "紫微入命，左辅右弼同会，主贵人不绝。",
      ].join("\n"),
      "utf8",
    );

    const results = await searchKnowledge({
      query: "general",
      topic: "general",
      chartTerms: ["君臣庆会"],
      limit: 1,
      retrievalMode: "local",
      contentRoot: root,
    });

    expect(results).toEqual([
      expect.objectContaining({
        chunkId: "ziwei-doushu-pattern-jun-chen-qing-hui",
        title: "格局：君臣庆会",
        source: "Renhuai123/ziwei-doushu",
        sourcePath: "lib/ziwei/patterns.ts",
        license: "MIT",
      }),
    ]);
  });
});
