/**
 * [INPUT]: Depends on agent tool contracts and Ziwei chart persistence requirements
 * [OUTPUT]: Provides chart input, output, summary, fact, and structured error types
 * [POS]: Shared domain contract for chart services, tools, persistence, and evaluation fixtures
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

export type Gender = "male" | "female";

export type CalendarType = "solar" | "lunar";

export type ChartTopic =
  | "career"
  | "relationship"
  | "wealth"
  | "personality"
  | "recent_fortune"
  | "general";

export type ChartFact = {
  id: string;
  topic: ChartTopic | string;
  palace: string;
  stars: string[];
  transforms: string[];
  patterns: string[];
  rawText: string;
  confidence: "high" | "medium" | "low";
};

export type ChartSummary = {
  chartId: string;
  keyPalaces: string[];
  keyStars: string[];
  keyPatterns: string[];
  facts: ChartFact[];
};

export type CreateChartInput = {
  profileId: string;
  name: string;
  gender: Gender;
  birthDate: string;
  birthTime: string;
  calendarType: CalendarType;
  birthPlace?: string;
  isPrimary: boolean;
};

export type CreateChartOutput = {
  chartId: string;
  displayName: string;
  chartJson: unknown;
  summary: ChartSummary;
};

export type ChartErrorCode =
  | "INVALID_BIRTH_DATE"
  | "INVALID_BIRTH_TIME"
  | "CHART_ENGINE_FAILED"
  | "FACT_EXTRACTION_FAILED";

export type ChartServiceResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: {
        code: ChartErrorCode;
        message: string;
        recoverable: boolean;
      };
    };
