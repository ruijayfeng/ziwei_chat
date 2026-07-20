/**
 * [INPUT]: Depends on iztro chart services, chart persistence, domain contracts, and storage-style interfaces
 * [OUTPUT]: Provides structured chart/domain tools, real horoscope scopes, recovery, and request-local telemetry
 * [POS]: Deterministic tool runner boundary used by the chat route, agent core, and evaluations
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
import type { SkillProhibitionId } from "../knowledge/skill-loader";
import type { ChartPersistence } from "../db/chart-persistence";
import { createChart as createChartWithIztro } from "../chart/create-chart";
import { summarizeChart, summarizePalace } from "../chart/summarize-chart";
import { toolError, toolOk, type ToolResult } from "./tool-result";
import { analysisTopicForIntent } from "./analysis-topic";

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
  topic: string;
  version: string;
  tools: string[];
  requiredFacts: string[];
  prohibitionIds: SkillProhibitionId[];
  analysisSteps: string[];
  responseRules: string[];
  conservativeConditions: string[];
  forbiddenAdvice: string[];
  commonQuestionPaths: string[];
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
  input?: CreateChartInput;
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
  persistenceTimeoutMs?: number;
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
  persistenceTimeoutMs = 5_000,
}: CreateAgentToolsInput = {}) {
  const registerChart = (input: CreateChartInput, chart: CreateChartOutput) => {
    stores.charts.set(chart.chartId, {
      ...chart,
      profileId: input.profileId,
      isPrimary: input.isPrimary,
      input,
    });
    if (input.isPrimary) stores.primaryChartByProfileId.set(input.profileId, chart.chartId);
  };

  return {
    hydrateChart: withToolEvent(stores, "hydrateChart", async (input: CreateChartInput) => {
      const result = createChartWithIztro(input);
      if (!result.ok) return result;
      registerChart(input, result.data);
      return result;
    }),

    createChart: withToolEvent(stores, "createChart", async (input: CreateChartInput) => {
      const result = createChartWithIztro(input);
      if (!result.ok) {
        return result;
      }

      let savedChart = result.data;
      if (input.isPrimary) {
        if (chartPersistence) {
          try {
            savedChart = await withTimeout(
              chartPersistence.savePrimaryChart(input, result.data),
              persistenceTimeoutMs,
            ) ?? result.data;
          } catch {
            return toolError("PERSISTENCE_FAILED", "The primary chart could not be saved.");
          }
        }
      }

      registerChart(input, savedChart);
      return toolOk(savedChart);
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
          let restored: CreateChartOutput | null;
          let restoredInput: CreateChartInput | undefined;
          try {
            if (chartPersistence.getPrimaryChartRecord) {
              const record = await withTimeout(
                chartPersistence.getPrimaryChartRecord(input.profileId),
                persistenceTimeoutMs,
              );
              restored = record?.output ?? null;
              restoredInput = record?.input;
            } else {
              restored = await withTimeout(
                chartPersistence.getPrimaryChart(input.profileId),
                persistenceTimeoutMs,
              );
            }
          } catch {
            return toolError("PERSISTENCE_FAILED", "The primary chart could not be restored.");
          }
          if (restored) {
            if (restoredInput) {
              const rebuilt = createChartWithIztro(restoredInput);
              if (!rebuilt.ok) {
                return toolError("PERSISTENCE_FAILED", "The primary chart could not be rebuilt.");
              }
              restored = {
                ...restored,
                chartJson: rebuilt.data.chartJson,
              };
            }
            stores.charts.set(restored.chartId, {
              ...restored,
              profileId: input.profileId,
              isPrimary: true,
              input: restoredInput,
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
        const chart = stores.charts.get(input.chartId);
        if (!chart) {
          return toolError("CHART_NOT_FOUND", "Chart was not found.");
        }
        const fact = summarizePalace({
          chartId: chart.chartId,
          chartJson: chart.chartJson,
          palace: input.palace,
        });
        if (!fact) {
          return toolError("PALACE_NOT_FOUND", "Requested palace was not found.");
        }
        const facts = [fact];

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
      const chart = stores.charts.get(input.chartId);
      if (!chart || !hasHoroscope(chart.chartJson)) {
        return toolError(
          "LUCK_CYCLE_UNSUPPORTED",
          "The restored chart does not expose deterministic horoscope data.",
        );
      }

      try {
        const scopes = readHoroscopeScopes(chart.chartJson, input.date, input.range);
        return toolOk({
          range: input.range,
          activePeriods: scopes.periods,
          relevantPalaces: unique([...summary.data.keyPalaces, ...scopes.palaces]),
          facts: summary.data.facts,
        });
      } catch {
        return toolError(
          "LUCK_CYCLE_UNSUPPORTED",
          "The requested horoscope range could not be calculated by iztro.",
        );
      }
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
        const topic = analysisTopicForIntent(input.topic);
        const results = stores.knowledgeSources
          .filter((source) => source.topic === topic)
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

async function withTimeout<T>(operation: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error("persistence timeout")), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
}

type HoroscopeScope = {
  index: number;
  name: string;
  heavenlyStem: string;
  earthlyBranch: string;
};

type HoroscopeResult = {
  solarDate: string;
  decadal: HoroscopeScope;
  yearly: HoroscopeScope;
  monthly: HoroscopeScope;
};

type HoroscopeChart = {
  palaces: Array<{ name: string }>;
  horoscope: (date: string) => HoroscopeResult;
};

function hasHoroscope(value: unknown): value is HoroscopeChart {
  if (!isRecord(value) || typeof value.horoscope !== "function") return false;
  return Array.isArray(value.palaces) && value.palaces.every(
    (palace) => isRecord(palace) && typeof palace.name === "string",
  );
}

function readHoroscopeScopes(
  chart: HoroscopeChart,
  date: string,
  range: LuckCycleInput["range"],
) {
  const targetDates = range === "three_months"
    ? [0, 1, 2].map((offset) => addUtcMonths(date, offset))
    : [date];
  const horoscopes = targetDates.map((targetDate) => chart.horoscope(targetDate));
  const first = horoscopes[0];
  if (!first) throw new Error("Missing horoscope output.");

  const periods = range === "year"
    ? [formatHoroscopePeriod("流年", first.yearly, first.solarDate, chart)]
    : range === "three_months"
      ? horoscopes.map((item) =>
          formatHoroscopePeriod("流月", item.monthly, item.solarDate, chart),
        )
      : [
          formatHoroscopePeriod("大限", first.decadal, first.solarDate, chart),
          formatHoroscopePeriod("流年", first.yearly, first.solarDate, chart),
          formatHoroscopePeriod("流月", first.monthly, first.solarDate, chart),
        ];
  const scopes = range === "year"
    ? [first.yearly]
    : range === "three_months"
      ? horoscopes.map((item) => item.monthly)
      : [first.decadal, first.yearly, first.monthly];

  return {
    periods,
    palaces: unique(scopes.map((scope) => chart.palaces[scope.index]?.name).filter(Boolean)),
  };
}

function formatHoroscopePeriod(
  label: string,
  scope: HoroscopeScope,
  solarDate: string,
  chart: HoroscopeChart,
) {
  const palace = chart.palaces[scope.index]?.name;
  if (!palace) throw new Error("Horoscope scope points outside the chart.");
  return `${label}：${normalizeSolarDate(solarDate)} ${scope.heavenlyStem}${scope.earthlyBranch} · 本命落宫：${palace}`;
}

function normalizeSolarDate(date: string) {
  const match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(date);
  if (!match) throw new Error("Horoscope returned an invalid solar date.");
  return `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
}

function addUtcMonths(date: string, offset: number) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) throw new Error("Luck-cycle date must be YYYY-MM-DD.");
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1 + offset;
  const day = Number(match[3]);
  const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const target = new Date(Date.UTC(year, monthIndex, Math.min(day, lastDay)));
  return `${target.getUTCFullYear()}-${String(target.getUTCMonth() + 1).padStart(2, "0")}-${String(target.getUTCDate()).padStart(2, "0")}`;
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
  return analysisTopicForIntent(topic);
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
