/**
 * [INPUT]: Depends on chart services, chart domain contracts, and storage-style interfaces
 * [OUTPUT]: Provides structured agent tool functions and in-memory stores for tests/local MVP wiring
 * [POS]: Tool runner boundary used by the future AI SDK route and agent core
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

import { randomUUID } from "node:crypto";

import type {
  ChartFact,
  ChartSummary,
  ChartTopic,
  CreateChartInput,
  CreateChartOutput,
} from "../domain/chart";
import type { ChartPersistence } from "../db/chart-persistence";
import { createChart as createChartWithIztro } from "../chart/create-chart";
import { summarizeChart } from "../chart/summarize-chart";
import { toolError, toolOk, type ToolResult } from "./tool-result";

type GetCurrentChartInput = {
  profileId: string;
  conversationId?: string;
};

type SummarizeChartFactsInput = {
  chartId: string;
  topics: ChartTopic[];
};

type PalaceAnalysisInput = {
  chartId: string;
  palace: string;
  topic: string;
};

type StarAnalysisInput = {
  chartId: string;
  stars: string[];
  palace?: string;
  topic: string;
};

type PatternAnalysisInput = {
  chartId: string;
  topic: string;
};

type LuckCycleInput = {
  chartId: string;
  date: string;
  range: "current" | "three_months" | "year";
  topic: string;
};

export type SkillOutput = {
  skillId: string;
  version: string;
  requiredFacts: string[];
  analysisSteps: string[];
  responseRules: string[];
  safetyNotes: string[];
};

export type KnowledgeSource = {
  chunkId: string;
  title: string;
  source: string;
  school: string;
  confidence: "high" | "medium" | "low";
  excerpt: string;
  retrievalMode: "local" | "vector" | "hybrid";
};

type StoredKnowledgeSource = KnowledgeSource & {
  topic: string;
  terms: string[];
};

type SearchKnowledgeInput = {
  query: string;
  topic: string;
  chartTerms: string[];
  limit: number;
  retrievalMode?: "local" | "vector" | "hybrid";
};

type SaveConversationSummaryInput = {
  profileId: string;
  conversationId: string;
  chartId: string;
  summary: string;
  topics: string[];
};

type SaveUserMemoryInput = {
  profileId: string;
  kind: "preference" | "recurring_topic" | "feedback";
  value: string;
  sourceConversationId: string;
  userVisible: true;
};

type ToolEvent = {
  toolName: string;
  profileId?: string;
  conversationId?: string;
  chartId?: string;
  input: unknown;
  output: unknown;
  success: boolean;
  latencyMs: number;
};

type StoredChart = CreateChartOutput & {
  profileId: string;
  isPrimary: boolean;
};

export type InMemoryToolStores = {
  charts: Map<string, StoredChart>;
  primaryChartByProfileId: Map<string, string>;
  skills: SkillOutput[];
  knowledgeSources: StoredKnowledgeSource[];
  conversationSummaries: Array<
    SaveConversationSummaryInput & { summaryId: string }
  >;
  memories: Array<SaveUserMemoryInput & { memoryId: string }>;
  toolEvents: ToolEvent[];
};

type CreateStoresInput = {
  skills?: SkillOutput[];
  knowledgeSources?: StoredKnowledgeSource[];
};

type CreateAgentToolsInput = {
  stores?: InMemoryToolStores;
  chartPersistence?: ChartPersistence | null;
};

export function createInMemoryToolStores(
  input: CreateStoresInput = {},
): InMemoryToolStores {
  return {
    charts: new Map(),
    primaryChartByProfileId: new Map(),
    skills: input.skills ?? [],
    knowledgeSources: input.knowledgeSources ?? [],
    conversationSummaries: [],
    memories: [],
    toolEvents: [],
  };
}

export function createAgentTools({
  stores = createInMemoryToolStores(),
  chartPersistence = null,
}: CreateAgentToolsInput = {}) {
  return {
    createChart: withToolEvent(stores, "createChart", async (input: CreateChartInput) => {
      const result = createChartWithIztro(input);
      if (!result.ok) {
        return result;
      }

      stores.charts.set(result.data.chartId, {
        ...result.data,
        profileId: input.profileId,
        isPrimary: input.isPrimary,
      });
      if (input.isPrimary) {
        stores.primaryChartByProfileId.set(input.profileId, result.data.chartId);
        if (chartPersistence) {
          try {
            await chartPersistence.savePrimaryChart(input, result.data);
          } catch {
            return toolError("PERSISTENCE_FAILED", "The primary chart could not be saved.");
          }
        }
      }

      return result;
    }),

    getCurrentChart: withToolEvent(
      stores,
      "getCurrentChart",
      async (input: GetCurrentChartInput): Promise<ToolResult<CreateChartOutput>> => {
        const chartId = stores.primaryChartByProfileId.get(input.profileId);
        const chart = chartId ? stores.charts.get(chartId) : undefined;
        if (chart) {
          return toolOk(toChartOutput(chart));
        }

        if (chartPersistence) {
          const restored = await chartPersistence.getPrimaryChart(input.profileId);
          if (restored) {
            stores.charts.set(restored.chartId, {
              ...restored,
              profileId: input.profileId,
              isPrimary: true,
            });
            stores.primaryChartByProfileId.set(input.profileId, restored.chartId);
            return toolOk(restored);
          }
        }

        return toolError("NO_ACTIVE_CHART", "No active chart exists for this profile.");
      },
    ),

    summarizeChartFacts: withToolEvent(
      stores,
      "summarizeChartFacts",
      async (input: SummarizeChartFactsInput): Promise<ToolResult<ChartSummary>> => {
        const chart = stores.charts.get(input.chartId);
        if (!chart) {
          return toolError("CHART_NOT_FOUND", "Chart was not found.");
        }

        return toolOk(
          summarizeChart({
            chartId: chart.chartId,
            chartJson: chart.chartJson,
            topics: input.topics,
          }),
        );
      },
    ),

    getPalaceAnalysis: withToolEvent(
      stores,
      "getPalaceAnalysis",
      async (input: PalaceAnalysisInput) => {
        const summary = summarizeStoredChart(stores, input.chartId, [
          normalizeTopic(input.topic),
        ]);
        if (!summary.ok) return summary;

        const facts = summary.data.facts.filter(
          (fact) => fact.palace === input.palace,
        );
        if (facts.length === 0) {
          return toolError("PALACE_NOT_FOUND", "Requested palace was not found.");
        }

        return toolOk({
          palace: input.palace,
          topic: input.topic,
          facts,
          interpretationKeys: unique([
            ...facts.flatMap((fact) => fact.stars),
            ...facts.flatMap((fact) => fact.transforms),
            ...facts.flatMap((fact) => fact.patterns),
          ]),
        });
      },
    ),

    getStarAnalysis: withToolEvent(
      stores,
      "getStarAnalysis",
      async (input: StarAnalysisInput) => {
        const summary = summarizeStoredChart(stores, input.chartId, [
          normalizeTopic(input.topic),
        ]);
        if (!summary.ok) return summary;

        return toolOk({
          stars: input.stars.map((star) => ({
            name: star,
            palace: input.palace ?? findPalaceForStar(summary.data.facts, star),
            positiveTendencies: [`${star} can indicate usable strengths in ${input.topic}.`],
            cautionTendencies: [`${star} should not be interpreted alone.`],
            topicNotes: [`Use ${star} with palace facts and retrieved knowledge.`],
          })),
        });
      },
    ),

    getPatternAnalysis: withToolEvent(
      stores,
      "getPatternAnalysis",
      async (input: PatternAnalysisInput) => {
        const summary = summarizeStoredChart(stores, input.chartId, [
          normalizeTopic(input.topic),
        ]);
        if (!summary.ok) return summary;

        const detectedPatterns = summary.data.keyPatterns.map((pattern) => ({
          name: pattern,
          evidence: summary.data.facts.filter((fact) =>
            fact.patterns.includes(pattern),
          ),
          strength: "moderate" as const,
          topicRelevance: input.topic,
        }));

        return toolOk({ detectedPatterns });
      },
    ),

    getLuckCycle: withToolEvent(stores, "getLuckCycle", async (input: LuckCycleInput) => {
      const topic = normalizeTopic(input.topic);
      const summary = summarizeStoredChart(stores, input.chartId, [topic]);
      if (!summary.ok) return summary;

      return toolOk({
        range: input.range,
        activePeriods: [`${input.date}:${input.range}`],
        relevantPalaces: summary.data.keyPalaces,
        facts: summary.data.facts,
      });
    }),

    loadSkill: withToolEvent(stores, "loadSkill", async (input: { skillId: string }) => {
      const skill = stores.skills.find((item) => item.skillId === input.skillId);
      if (!skill) {
        return toolError("SKILL_NOT_FOUND", "Requested skill was not found.");
      }

      return toolOk(skill);
    }),

    searchKnowledge: withToolEvent(
      stores,
      "searchKnowledge",
      async (input: SearchKnowledgeInput): Promise<ToolResult<KnowledgeSource[]>> => {
        const mode = input.retrievalMode ?? "local";
        const results = stores.knowledgeSources
          .filter((source) => source.topic === input.topic)
          .map((source) => ({
            source,
            score: scoreKnowledgeSource(source, input.query, input.chartTerms),
          }))
          .filter((item) => item.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, input.limit)
          .map(({ source }) => ({
            chunkId: source.chunkId,
            title: source.title,
            source: source.source,
            school: source.school,
            confidence: source.confidence,
            excerpt: source.excerpt,
            retrievalMode: mode,
          }));

        if (results.length === 0) {
          return toolError(
            "LOW_CONFIDENCE_RESULTS",
            "Knowledge search returned no confident local results.",
          );
        }

        return toolOk(results);
      },
    ),

    saveConversationSummary: withToolEvent(
      stores,
      "saveConversationSummary",
      async (input: SaveConversationSummaryInput) => {
        const summaryId = randomUUID();
        stores.conversationSummaries.push({ ...input, summaryId });

        return toolOk({ summaryId });
      },
    ),

    saveUserMemory: withToolEvent(
      stores,
      "saveUserMemory",
      async (input: SaveUserMemoryInput) => {
        if (input.userVisible !== true) {
          return toolError(
            "MEMORY_POLICY_REJECTED",
            "Durable memory must be user visible.",
          );
        }

        const memoryId = randomUUID();
        stores.memories.push({ ...input, memoryId });

        return toolOk({ memoryId });
      },
    ),
  };
}

function withToolEvent<TInput, TOutput>(
  stores: InMemoryToolStores,
  toolName: string,
  handler: (input: TInput) => Promise<ToolResult<TOutput>>,
) {
  return async (input: TInput) => {
    const startedAt = Date.now();
    const output = await handler(input);
    stores.toolEvents.push({
      toolName,
      ...readToolEventOwnership(input),
      input,
      output,
      success: output.ok,
      latencyMs: Date.now() - startedAt,
    });

    return output;
  };
}

function readToolEventOwnership(input: unknown) {
  if (!isRecord(input)) {
    return {};
  }

  return {
    profileId: typeof input.profileId === "string" ? input.profileId : undefined,
    conversationId:
      typeof input.conversationId === "string" ? input.conversationId : undefined,
    chartId: typeof input.chartId === "string" ? input.chartId : undefined,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function summarizeStoredChart(
  stores: InMemoryToolStores,
  chartId: string,
  topics: ChartTopic[],
): ToolResult<ChartSummary> {
  const chart = stores.charts.get(chartId);
  if (!chart) {
    return toolError("CHART_NOT_FOUND", "Chart was not found.");
  }

  return toolOk(
    summarizeChart({
      chartId,
      chartJson: chart.chartJson,
      topics,
    }),
  );
}

function toChartOutput(chart: StoredChart): CreateChartOutput {
  return {
    chartId: chart.chartId,
    displayName: chart.displayName,
    chartJson: chart.chartJson,
    summary: chart.summary,
  };
}

function normalizeTopic(topic: string): ChartTopic {
  if (
    topic === "career" ||
    topic === "relationship" ||
    topic === "wealth" ||
    topic === "personality" ||
    topic === "recent_fortune" ||
    topic === "general"
  ) {
    return topic;
  }

  return "general";
}

function findPalaceForStar(facts: ChartFact[], star: string) {
  return facts.find((fact) => fact.stars.includes(star))?.palace;
}

function scoreKnowledgeSource(
  source: StoredKnowledgeSource,
  query: string,
  chartTerms: string[],
) {
  let score = 0;
  const lowerQuery = query.toLowerCase();

  if (source.title.toLowerCase().includes(lowerQuery)) score += 2;
  if (source.excerpt.toLowerCase().includes(lowerQuery)) score += 1;

  for (const term of chartTerms) {
    if (source.terms.includes(term) || source.excerpt.includes(term)) {
      score += 3;
    }
  }

  return score;
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}
