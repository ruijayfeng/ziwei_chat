/**
 * [INPUT]: Depends on chart and knowledge domain contracts
 * [OUTPUT]: Provides analysis intent, plan, state, and critique types
 * [POS]: Shared agent-core contract between router, planner, tools, composer, critic, and evals
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

import type { ChartFact } from "./chart";
import type { KnowledgeSource } from "../knowledge/search";

export type Intent =
  | "recent_fortune"
  | "career"
  | "relationship"
  | "wealth"
  | "personality"
  | "chart_explanation"
  | "chart_management"
  | "memory_management"
  | "general_chat"
  | "out_of_scope"
  | "safety_sensitive";

export type SafetyLevel = "normal" | "caution" | "refusal";

export type IntentRoute = {
  intent: Intent;
  confidence: number;
  requiresChart: boolean;
  safetyLevel: SafetyLevel;
  rationale: string;
};

export type AnalysisPlan = {
  topic: Intent;
  requiredChartFacts: string[];
  requiredTools: string[];
  requiredSkills: string[];
  knowledgeQueries: string[];
  safetyLevel: SafetyLevel;
  expectedResponseShape: Array<
    "conclusion" | "chart_basis" | "plain_explanation" | "suggestion" | "follow_up"
  >;
};

export type CriticIssueSeverity = "blocking" | "warning";

export type CriticIssue = {
  code: string;
  message: string;
  severity: CriticIssueSeverity;
};

export type CritiqueResult = {
  passed: boolean;
  issues: string[];
  requiredRevision: boolean;
  structuredIssues?: CriticIssue[];
};

export type AnalysisState = {
  intent: string;
  chartId: string | null;
  topic: string;
  toolsUsed: string[];
  chartFacts: ChartFact[];
  skillsLoaded: string[];
  knowledgeSources: KnowledgeSource[];
  safetyLevel: SafetyLevel;
  critique: CritiqueResult;
};
