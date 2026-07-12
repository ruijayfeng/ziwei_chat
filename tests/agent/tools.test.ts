import { describe, expect, test } from "vitest";

import {
  createAgentTools,
  createInMemoryToolStores,
} from "../../src/lib/agent/tools";
import type { CreateChartOutput } from "../../src/lib/domain/chart";

describe("agent tools", () => {
  test("chart tools create, load, and summarize charts with structured results", async () => {
    const stores = createInMemoryToolStores();
    const tools = createAgentTools({ stores });

    const created = await tools.createChart({
      profileId: "profile-1",
      name: "Primary chart",
      gender: "male",
      birthDate: "1990-05-17",
      birthTime: "12:00",
      calendarType: "solar",
      isPrimary: true,
    });

    expect(created.ok).toBe(true);
    if (!created.ok) throw new Error(created.error.message);

    const current = await tools.getCurrentChart({ profileId: "profile-1" });
    expect(current).toMatchObject({
      ok: true,
      data: {
        chartId: created.data.chartId,
        displayName: "Primary chart",
      },
    });

    const summary = await tools.summarizeChartFacts({
      chartId: created.data.chartId,
      topics: ["career"],
    });
    expect(summary).toMatchObject({
      ok: true,
      data: {
        chartId: created.data.chartId,
      },
    });
    expect(summary.ok && summary.data.facts[0]).toMatchObject({
      topic: "career",
      palace: "官禄",
    });
    expect(stores.toolEvents.map((event) => event.toolName)).toEqual([
      "createChart",
      "getCurrentChart",
      "summarizeChartFacts",
    ]);
  });

  test("domain tools return structured palace, star, pattern, and luck-cycle data", async () => {
    const stores = createInMemoryToolStores();
    const tools = createAgentTools({ stores });
    const created = await tools.createChart({
      profileId: "profile-1",
      name: "Primary chart",
      gender: "male",
      birthDate: "1990-05-17",
      birthTime: "12:00",
      calendarType: "solar",
      isPrimary: true,
    });
    if (!created.ok) throw new Error(created.error.message);

    const palace = await tools.getPalaceAnalysis({
      chartId: created.data.chartId,
      palace: "官禄",
      topic: "career",
    });
    const stars = await tools.getStarAnalysis({
      chartId: created.data.chartId,
      stars: ["天同"],
      palace: "官禄",
      topic: "career",
    });
    const patterns = await tools.getPatternAnalysis({
      chartId: created.data.chartId,
      topic: "personality",
    });
    const luck = await tools.getLuckCycle({
      chartId: created.data.chartId,
      date: "2026-07-03",
      range: "current",
      topic: "career",
    });

    expect(palace.ok && palace.data).toMatchObject({
      palace: "官禄",
      topic: "career",
    });
    expect(stars.ok && stars.data.stars[0]).toMatchObject({
      name: "天同",
      palace: "官禄",
    });
    expect(patterns.ok && patterns.data.detectedPatterns.length).toBeGreaterThan(0);
    expect(luck.ok && luck.data).toMatchObject({
      range: "current",
      relevantPalaces: expect.arrayContaining(["官禄"]),
    });
  });

  test("knowledge and memory tools use storage interfaces and preserve source metadata", async () => {
    const stores = createInMemoryToolStores({
      skills: [
        {
          skillId: "career",
          version: "1.0.0",
          requiredFacts: ["career palace"],
          analysisSteps: ["read career palace"],
          responseRules: ["cite chart basis"],
          safetyNotes: ["avoid irreversible career commands"],
        },
      ],
      knowledgeSources: [
        {
          chunkId: "career-1",
          title: "Career palace basics",
          source: "curated-internal",
          school: "default",
          confidence: "high",
          excerpt: "Career analysis should inspect 官禄 and current timing.",
          retrievalMode: "local",
          topic: "career",
          terms: ["官禄"],
        },
      ],
    });
    const tools = createAgentTools({ stores });

    await expect(tools.loadSkill({ skillId: "career" })).resolves.toMatchObject({
      ok: true,
      data: {
        skillId: "career",
        requiredFacts: ["career palace"],
      },
    });
    await expect(
      tools.searchKnowledge({
        query: "career",
        topic: "career",
        chartTerms: ["官禄"],
        limit: 3,
        retrievalMode: "local",
      }),
    ).resolves.toMatchObject({
      ok: true,
      data: [
        {
          chunkId: "career-1",
          source: "curated-internal",
          retrievalMode: "local",
        },
      ],
    });
    await expect(
      tools.saveConversationSummary({
        profileId: "profile-1",
        conversationId: "conversation-1",
        chartId: "chart-1",
        summary: "Asked about career direction.",
        topics: ["career"],
      }),
    ).resolves.toMatchObject({
      ok: true,
      data: {
        summaryId: expect.any(String),
      },
    });
    await expect(
      tools.saveUserMemory({
        profileId: "profile-1",
        kind: "preference",
        value: "Prefers plain Chinese explanations.",
        sourceConversationId: "conversation-1",
        userVisible: true,
      }),
    ).resolves.toMatchObject({
      ok: true,
      data: {
        memoryId: expect.any(String),
      },
    });
  });

  test("missing chart errors are structured and recoverable", async () => {
    const tools = createAgentTools({ stores: createInMemoryToolStores() });

    await expect(
      tools.getCurrentChart({ profileId: "profile-missing" }),
    ).resolves.toEqual({
      ok: false,
      error: {
        code: "NO_ACTIVE_CHART",
        message: "No active chart exists for this profile.",
        recoverable: true,
      },
    });
  });

  test("restores a primary chart through the persistence boundary after an in-memory reset", async () => {
    const persisted = new Map<string, CreateChartOutput>();
    const chartPersistence = {
      async savePrimaryChart(input: { profileId: string }, chart: CreateChartOutput) {
        persisted.set(input.profileId, chart);
      },
      async getPrimaryChart(profileId: string) {
        return persisted.get(profileId) ?? null;
      },
    };
    const profileId = "profile-persisted";
    const firstTools = createAgentTools({ stores: createInMemoryToolStores(), chartPersistence });

    const created = await firstTools.createChart({
      profileId,
      name: "Primary chart",
      gender: "male",
      birthDate: "1990-05-17",
      birthTime: "12:00",
      calendarType: "solar",
      isPrimary: true,
    });
    if (!created.ok) throw new Error(created.error.message);

    const restored = await createAgentTools({
      stores: createInMemoryToolStores(),
      chartPersistence,
    }).getCurrentChart({ profileId });

    expect(restored).toMatchObject({ ok: true, data: { chartId: created.data.chartId } });
  });
});
