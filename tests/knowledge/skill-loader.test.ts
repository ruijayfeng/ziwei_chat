import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, test } from "vitest";

import {
  loadSkill,
  parseSkillMarkdown,
} from "../../src/lib/knowledge/skill-loader";
import { loadKnowledgeChunks, searchKnowledge } from "../../src/lib/knowledge/search";
import { parseKnowledgeMarkdown } from "../../src/lib/knowledge/search";
import { analysisTopicForIntent } from "../../src/lib/agent/analysis-topic";

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

  test("rejects unknown machine-enforced prohibition ids", () => {
    expect(() =>
      parseSkillMarkdown({
        filePath: "bad-prohibition.md",
        markdown: "---\nid: career\nversion: 1.0.0\ntopic: career\nrequiredFacts: []\nprohibitionIds: [unknown_rule]\ntools: []\n---\n",
      }),
    ).toThrow("Skill bad-prohibition.md has an invalid prohibition id.");
  });

  test("all beta skills define analysis order, conservative boundaries, and common question paths", async () => {
    const contracts = {
      career: {
        facts: ["career palace", "life palace", "wealth palace", "current luck cycle"],
        tools: ["getCurrentChart", "summarizeChartFacts", "getPalaceAnalysis", "getLuckCycle", "loadSkill", "searchKnowledge", "runResponseCritic"],
        firstStep: "先确认官禄宫事实",
        condition: "resign",
        prohibition: "resign immediately",
        prohibitionIds: ["immediate_career_exit", "career_outcome_certainty", "legal_or_retaliation_instruction", "timing_certainty"],
      },
      relationship: {
        facts: ["relationship palace", "life palace"],
        tools: ["getCurrentChart", "summarizeChartFacts", "getPalaceAnalysis", "loadSkill", "searchKnowledge", "runResponseCritic"],
        firstStep: "先确认夫妻宫事实",
        condition: "coercion",
        prohibition: "surveillance",
        prohibitionIds: ["relationship_manipulation", "relationship_fatalism", "unsafe_relationship_advice", "relationship_outcome_certainty"],
      },
      wealth: {
        facts: ["wealth palace", "career palace", "current luck cycle"],
        tools: ["getCurrentChart", "summarizeChartFacts", "getPalaceAnalysis", "getLuckCycle", "loadSkill", "searchKnowledge", "runResponseCritic"],
        firstStep: "先确认财帛宫事实",
        condition: "investing",
        prohibition: "buy, sell, borrow",
        prohibitionIds: ["financial_action_instruction", "financial_outcome_certainty", "professional_financial_boundary", "exact_income_prediction"],
      },
      personality: {
        facts: ["life palace", "body palace", "major stars"],
        tools: ["getCurrentChart", "summarizeChartFacts", "getPalaceAnalysis", "getStarAnalysis", "loadSkill", "searchKnowledge", "runResponseCritic"],
        firstStep: "先确认命宫和身宫事实",
        condition: "diagnosis",
        prohibition: "diagnose personality disorders",
        prohibitionIds: ["clinical_diagnosis", "fixed_personality_label", "fixed_personality_certainty", "harmful_behavior_excuse"],
      },
      recent_fortune: {
        facts: ["life palace", "current luck cycle"],
        tools: ["getCurrentChart", "summarizeChartFacts", "getLuckCycle", "loadSkill", "searchKnowledge", "runResponseCritic"],
        firstStep: "先确认用户问的是哪一个近期主题",
        condition: "irreversible decisions",
        prohibition: "predict accidents",
        prohibitionIds: ["fear_prediction", "disaster_or_windfall_prediction", "regulated_instruction", "unsupported_lucky_date"],
      },
      chart_explanation: {
        facts: ["life palace", "major stars", "key palaces"],
        tools: ["getCurrentChart", "summarizeChartFacts", "getPalaceAnalysis", "getStarAnalysis", "loadSkill", "searchKnowledge", "runResponseCritic"],
        firstStep: "先确认用户问的是哪个命盘事实或术语",
        condition: "chart facts are missing",
        prohibition: "Do not provide predictions in this workflow",
        prohibitionIds: ["single_factor_determinism", "undisclosed_school_mixing", "invented_chart_fact", "chart_explanation_prediction"],
      },
    } as const;

    for (const [skillId, contract] of Object.entries(contracts) as Array<
      [keyof typeof contracts, (typeof contracts)[keyof typeof contracts]]
    >) {
      const skill = await loadSkill(skillId);

      expect(skill.skillId, `${skillId} id`).toBe(skillId);
      expect(skill.topic, `${skillId} topic`).toBe(skillId);
      expect(skill.requiredFacts, `${skillId} required facts`).toEqual(contract.facts);
      expect(skill.tools, `${skillId} tools`).toEqual(contract.tools);
      expect(skill.prohibitionIds, `${skillId} prohibition ids`).toEqual(contract.prohibitionIds);
      expect(new Set(skill.prohibitionIds).size, `${skillId} unique prohibition ids`).toBe(skill.prohibitionIds.length);
      expect(skill.analysisSteps.length, `${skillId} analysis steps`).toBeGreaterThanOrEqual(5);
      expect(skill.responseRules.length, `${skillId} response rules`).toBeGreaterThanOrEqual(4);
      expect(skill.safetyNotes.length, `${skillId} safety notes`).toBeGreaterThanOrEqual(3);
      expect(skill.conservativeConditions.length, `${skillId} conservative conditions`).toBeGreaterThanOrEqual(3);
      expect(skill.forbiddenAdvice.length, `${skillId} forbidden advice`).toBeGreaterThanOrEqual(3);
      expect(skill.commonQuestionPaths.length, `${skillId} common question paths`).toBeGreaterThanOrEqual(3);
      expect(skill.analysisSteps[0], `${skillId} first analysis step`).toContain(contract.firstStep);
      expect(skill.conservativeConditions.join(" "), `${skillId} topic condition`).toContain(contract.condition);
      expect(skill.forbiddenAdvice.join(" "), `${skillId} topic prohibition`).toContain(contract.prohibition);
      expect(skill.forbiddenAdvice.some((rule) => /^Do not /i.test(rule)), `${skillId} explicit prohibition`).toBe(true);
      expect(
        skill.responseRules.some((rule) => /plain language|terminology|Ziwei terms/i.test(rule)),
        `${skillId} plain-language rule`,
      ).toBe(true);
      expect(
        skill.responseRules.filter((rule) => /follow-up/i.test(rule)),
        `${skillId} optional follow-up rule`,
      ).toHaveLength(1);
      expect(
        skill.responseRules.find((rule) => /follow-up/i.test(rule)),
        `${skillId} optional follow-up wording`,
      ).toMatch(/\b(only when|if needed|when needed)\b/i);
    }
  });
});

describe("local knowledge search", () => {
  test.each([
    ["empty terms", "terms: []", "terms"],
    ["blank source", 'source: ""', "source"],
    ["blank license", 'license: ""', "license"],
    ["blank school", 'school: ""', "school"],
  ])("rejects malformed knowledge metadata: %s", (_label, replacement, field) => {
    const markdown = [
      "---",
      "title: Test",
      "topic: career",
      "terms: [官禄]",
      "source: curated-internal",
      "license: internal",
      "school: default",
      "confidence: high",
      "---",
      "content",
    ].join("\n").replace(new RegExp(`^${field}:.*$`, "m"), replacement);

    expect(() => parseKnowledgeMarkdown("test.md", markdown)).toThrow(`Knowledge test.md is missing required field: ${field}`);
  });

  test.each(["curated", "curated-internal"])("rejects an imported file that declares itself %s", (source) => {
    const markdown = [
      "---",
      "title: Imported",
      "topic: general",
      "terms: [命宫]",
      `source: ${source}`,
      "sourcePath: content/fake.md",
      "sourceUrl: https://example.test",
      "license: internal",
      "school: default",
      "confidence: medium",
      "---",
      "content",
    ].join("\n");

    expect(() => parseKnowledgeMarkdown("imported/ziwei-doushu/fake.md", markdown)).toThrow(
      "Imported knowledge imported/ziwei-doushu/fake.md cannot declare curated provenance.",
    );
  });
  test("returns attributed high-confidence local coverage for every active topic contract", async () => {
    const contracts = [
      { id: "career", query: "career palace", terms: ["官禄"] },
      { id: "relationship", query: "relationship palace", terms: ["夫妻"] },
      { id: "wealth", query: "wealth palace", terms: ["财帛"] },
      { id: "personality", query: "life palace", terms: ["命宫"] },
      { id: "recent_fortune", query: "recent fortune timing", terms: ["运限"] },
      { id: "chart_explanation", query: "chart explanation", terms: ["命宫", "宫位", "星曜"] },
    ];
    const expectedChunks: Record<string, string[]> = {
      career: ["career-palace"],
      relationship: ["relationship-palace"],
      wealth: ["wealth-palace"],
      personality: ["personality-life-palace"],
      recent_fortune: ["recent-fortune-timing"],
      chart_explanation: ["renhuai-chart-structure", "renhuai-palace-complete-basics", "renhuai-star-palace-examples"],
    };

    for (const contract of contracts) {
      const results = await searchKnowledge({
        query: contract.query,
        topic: analysisTopicForIntent(contract.id),
        chartTerms: contract.terms,
        limit: 5,
        retrievalMode: "local",
      });
      expect(results.length, contract.id).toBeGreaterThanOrEqual(2);
      expect(results.some((result) => result.confidence === "high"), contract.id).toBe(true);
      expect(results.map((result) => result.chunkId), contract.id).toEqual(expect.arrayContaining(expectedChunks[contract.id]));
      for (const result of results) {
        expect(result.source, `${contract.id} source`).not.toBe("");
        expect(result.license, `${contract.id} license`).not.toBe("");
        expect(result.school, `${contract.id} school`).not.toBe("");
        expect(result.retrievalMode).toBe("local");
      }
    }
  });

  test("keeps runtime metadata complete and imported chunks visibly non-curated", async () => {
    for (const chunk of await loadKnowledgeChunks(process.cwd())) {
      expect(chunk.terms.length, `${chunk.chunkId} terms`).toBeGreaterThan(0);
      expect(chunk.source.trim(), `${chunk.chunkId} source`).not.toBe("");
      expect(chunk.license.trim(), `${chunk.chunkId} license`).not.toBe("");
      expect(chunk.school.trim(), `${chunk.chunkId} school`).not.toBe("");
      if (chunk.sourcePath.includes("lib/") || chunk.sourcePath.includes("lib\\")) {
        expect(chunk.source, `${chunk.chunkId} imported source`).not.toBe("curated-internal");
      }
    }
  });

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

  test("retrieves multiple curated sources for each beta topic, including selected Renhuai123 material", async () => {
    const topics = [
      { topic: "career", query: "career palace", terms: ["官禄", "事业"] },
      { topic: "relationship", query: "relationship palace", terms: ["夫妻", "感情"] },
      { topic: "wealth", query: "wealth palace", terms: ["财帛", "财富"] },
      { topic: "personality", query: "life palace", terms: ["命宫", "主星"] },
      { topic: "recent_fortune", query: "recent fortune timing", terms: ["运限", "四化"] },
      { topic: "general", query: "chart explanation", terms: ["命宫", "十二宫"] },
    ];

    for (const item of topics) {
      const results = await searchKnowledge({
        query: item.query,
        topic: item.topic,
        chartTerms: item.terms,
        limit: 5,
        retrievalMode: "local",
      });
      const usableResults = results.filter((result) => result.confidence !== "low");

      expect(usableResults.length, item.topic).toBeGreaterThanOrEqual(2);
      expect(
        usableResults.some((result) => result.source === "Renhuai123/ziwei-doushu"),
        item.topic,
      ).toBe(true);
    }
  });

  test("covers palace, major star, sihua, and pattern basics with high-confidence Renhuai123 extracts", async () => {
    const coverageChecks = [
      {
        label: "twelve palaces",
        query: "chart explanation",
        topic: "general",
        terms: ["兄弟", "子女", "疾厄", "迁移", "交友", "田宅", "福德", "父母"],
      },
      {
        label: "fourteen major stars",
        query: "major stars",
        topic: "general",
        terms: ["紫微", "天机", "太阳", "武曲", "天同", "廉贞", "天府", "太阴", "贪狼", "巨门", "天相", "天梁", "七杀", "破军"],
      },
      {
        label: "sihua applications",
        query: "recent fortune timing",
        topic: "recent_fortune",
        terms: ["化禄", "化权", "化科", "化忌", "大限", "流年"],
      },
      {
        label: "common patterns",
        query: "chart explanation",
        topic: "general",
        terms: ["杀破狼", "机月同梁", "府相朝垣", "火贪", "铃贪", "科权双会"],
      },
    ];

    for (const item of coverageChecks) {
      const results = await searchKnowledge({
        query: item.query,
        topic: item.topic,
        chartTerms: item.terms,
        limit: 8,
        retrievalMode: "local",
      });

      expect(
        results.some(
          (result) =>
            result.source === "Renhuai123/ziwei-doushu" &&
            result.confidence === "high",
        ),
        item.label,
      ).toBe(true);
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

  test("does not return high-confidence chunks that do not match the query or chart terms", async () => {
    const root = await mkdtemp(join(tmpdir(), "ziwei-relevance-knowledge-"));
    const knowledgeDir = join(root, "content", "knowledge");
    await mkdir(knowledgeDir, { recursive: true });
    await writeFile(
      join(knowledgeDir, "general-unrelated.md"),
      [
        "---",
        "title: Unrelated high confidence",
        "topic: general",
        "terms:",
        "  - 天马",
        "school: default",
        "confidence: high",
        "source: curated-internal",
        "sourcePath: content/knowledge/general-unrelated.md",
        "sourceUrl: ",
        "license: internal",
        "---",
        "",
        "这条内容只讨论天马和外出变化，不应该在无关查询里出现。",
      ].join("\n"),
      "utf8",
    );
    await writeFile(
      join(knowledgeDir, "general-related.md"),
      [
        "---",
        "title: Parent palace",
        "topic: general",
        "terms:",
        "  - 父母",
        "school: default",
        "confidence: medium",
        "source: curated-internal",
        "sourcePath: content/knowledge/general-related.md",
        "sourceUrl: ",
        "license: internal",
        "---",
        "",
        "父母宫用于观察长辈、文书和早期支持。",
      ].join("\n"),
      "utf8",
    );

    const results = await searchKnowledge({
      query: "chart explanation",
      topic: "general",
      chartTerms: ["父母"],
      limit: 5,
      retrievalMode: "local",
      contentRoot: root,
    });

    expect(results.map((result) => result.chunkId)).toEqual(["general-related"]);
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
