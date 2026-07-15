# Agent Tool Contracts

> Version: 2026-07-03

## Contract Rules

- Tools return structured data, not final prose.
- Chart facts from tools override model guesses.
- Every tool response includes `ok`, `data`, and `error`.
- Tool errors are recoverable unless persistence fails.

```ts
type ToolResult<T> =
  | { ok: true; data: T; meta?: Record<string, unknown> }
  | { ok: false; error: { code: string; message: string; recoverable: boolean } };
```

## createChart

Creates a deterministic Ziwei chart from birth data.

Input:

```ts
type CreateChartInput = {
  profileId: string;
  name: string;
  gender: "male" | "female";
  birthDate: string;
  birthTime: string;
  calendarType: "solar" | "lunar";
  birthPlace?: string;
  isPrimary: boolean;
};
```

Output:

```ts
type CreateChartOutput = {
  chartId: string;
  displayName: string;
  chartJson: unknown;
  summary: ChartSummary;
};
```

Errors:

- `INVALID_BIRTH_DATE`
- `INVALID_BIRTH_TIME`
- `CHART_ENGINE_FAILED`
- `PERSISTENCE_FAILED`

## getCurrentChart

Loads the active chart for the current conversation or user.

Input:

```ts
type GetCurrentChartInput = {
  profileId: string;
  conversationId?: string;
};
```

Output:

```ts
type GetCurrentChartOutput = {
  chartId: string;
  displayName: string;
  chartJson: unknown;
  summary: ChartSummary;
};
```

Errors:

- `NO_ACTIVE_CHART`
- `CHART_NOT_FOUND`

## summarizeChartFacts

Extracts stable facts from chart JSON for analysis.

Input:

```ts
type SummarizeChartFactsInput = {
  chartId: string;
  topics: Array<"career" | "relationship" | "wealth" | "personality" | "recent_fortune" | "general">;
};
```

Output:

```ts
type ChartFact = {
  id: string;
  topic: string;
  palace: string;
  stars: string[];
  transforms: string[];
  patterns: string[];
  rawText: string;
  confidence: "high" | "medium" | "low";
};

type ChartSummary = {
  chartId: string;
  keyPalaces: string[];
  keyStars: string[];
  keyPatterns: string[];
  facts: ChartFact[];
};
```

Errors:

- `CHART_NOT_FOUND`
- `FACT_EXTRACTION_FAILED`

## getPalaceAnalysis

Returns structured domain meaning for a palace in the current chart.

Input:

```ts
type GetPalaceAnalysisInput = {
  chartId: string;
  palace: string;
  topic: string;
};
```

Output:

```ts
type PalaceAnalysis = {
  palace: string;
  topic: string;
  facts: ChartFact[];
  interpretationKeys: string[];
};
```

Errors:

- `PALACE_NOT_FOUND`
- `CHART_NOT_FOUND`

## getStarAnalysis

Returns structured meaning for stars in a palace or topic.

Input:

```ts
type GetStarAnalysisInput = {
  chartId: string;
  stars: string[];
  palace?: string;
  topic: string;
};
```

Output:

```ts
type StarAnalysis = {
  stars: Array<{
    name: string;
    palace?: string;
    positiveTendencies: string[];
    cautionTendencies: string[];
    topicNotes: string[];
  }>;
};
```

Errors:

- `STAR_NOT_FOUND`
- `CHART_NOT_FOUND`

## getPatternAnalysis

Detects and explains chart patterns.

Input:

```ts
type GetPatternAnalysisInput = {
  chartId: string;
  topic: string;
};
```

Output:

```ts
type PatternAnalysis = {
  detectedPatterns: Array<{
    name: string;
    evidence: ChartFact[];
    strength: "strong" | "moderate" | "weak";
    topicRelevance: string;
  }>;
};
```

Errors:

- `CHART_NOT_FOUND`
- `PATTERN_ENGINE_FAILED`

## getLuckCycle

Returns time-period context for recent or annual fortune analysis.

Input:

```ts
type GetLuckCycleInput = {
  chartId: string;
  date: string;
  range: "current" | "three_months" | "year";
  topic: string;
};
```

Output:

```ts
type LuckCycleOutput = {
  range: string;
  activePeriods: string[];
  relevantPalaces: string[];
  facts: ChartFact[];
};
```

Errors:

- `CHART_NOT_FOUND`
- `LUCK_CYCLE_UNSUPPORTED`

## loadSkill

Loads a deterministic analysis workflow.

Input:

```ts
type LoadSkillInput = {
  skillId: "career" | "relationship" | "wealth" | "personality" | "recent_fortune" | "chart_explanation";
};
```

Output:

```ts
type SkillOutput = {
  skillId: string;
  version: string;
  requiredFacts: string[];
  analysisSteps: string[];
  responseRules: string[];
  safetyNotes: string[];
};
```

Errors:

- `SKILL_NOT_FOUND`
- `SKILL_PARSE_FAILED`

## searchKnowledge

Retrieves curated domain knowledge.

Input:

```ts
type SearchKnowledgeInput = {
  query: string;
  topic: string;
  chartTerms: string[];
  limit: number;
  retrievalMode?: "local" | "vector" | "hybrid";
};
```

Output:

```ts
type KnowledgeSource = {
  chunkId: string;
  title: string;
  source: string;
  school: string;
  confidence: "high" | "medium" | "low";
  excerpt: string;
  retrievalMode: "local" | "vector" | "hybrid";
};
```

Errors:

- `KNOWLEDGE_SEARCH_FAILED`
- `LOW_CONFIDENCE_RESULTS`

## saveConversationSummary

Stores a short summary of a conversation.

Input:

```ts
type SaveConversationSummaryInput = {
  profileId: string;
  conversationId: string;
  chartId: string;
  summary: string;
  topics: string[];
};
```

Output:

```ts
type SaveConversationSummaryOutput = {
  summaryId: string;
};
```

Errors:

- `PERSISTENCE_FAILED`

## saveUserMemory

Stores an explicit durable preference or recurring concern.

Input:

```ts
type SaveUserMemoryInput = {
  profileId: string;
  kind: "preference" | "recurring_topic" | "feedback";
  value: string;
  sourceConversationId: string;
  userVisible: true;
};
```

Output:

```ts
type SaveUserMemoryOutput = {
  memoryId: string;
};
```

Errors:

- `MEMORY_POLICY_REJECTED`
- `PERSISTENCE_FAILED`

## runResponseCritic

Validates a draft answer before final response.

Input:

```ts
type RunResponseCriticInput = {
  intent: string;
  draft: string;
  toolsUsed: string[];
  chartFacts: ChartFact[];
  knowledgeSources: KnowledgeSource[];
  safetyLevel: "normal" | "caution" | "refusal";
};
```

Output:

```ts
type CritiqueResult = {
  passed: boolean;
  issues: string[];
  requiredRevision: boolean;
};
```

Errors:

- `CRITIC_FAILED`

## Browser/API presentation contracts

These are application boundaries rather than Agent-callable tools:

- `POST /api/chart` and `GET /api/chart` expose the legacy summary plus a sanitized twelve-palace `display` DTO. Raw `chartJson` stays server-side.
- `POST /api/chat` accepts the anonymous profile, conversation history, current chart input, browser-owned model settings, and an evidence run id. Static answers use text plus `X-Ziwei-Evidence`; model answers use newline-framed `evidence`, critic-approved `token`, optional retryable `error`, and final `done` events.
- `GET /api/conversations` is profile-scoped and returns only conversation/message display fields. It never returns model settings, API keys, message metadata, or tool payloads.
- `DELETE /api/chat?profileId=...` deletes the anonymous profile's runtime/persisted data. The settings UI clears browser profile, chart, conversation, and model-setting state only after the server deletion succeeds.
