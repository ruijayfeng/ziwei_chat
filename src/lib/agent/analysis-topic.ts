/**
 * [INPUT]: Depends on routed analysis intent ids
 * [OUTPUT]: Provides the deterministic chart and knowledge topic used by tools and RAG
 * [POS]: Shared mapping boundary; chart explanation intentionally reuses general chart doctrine
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

import type { Intent } from "../domain/analysis";
import type { ChartTopic } from "../domain/chart";

export function analysisTopicForIntent(intent: Intent | string): ChartTopic {
  if (intent === "chart_explanation") return "general";
  if (
    intent === "career" ||
    intent === "relationship" ||
    intent === "wealth" ||
    intent === "personality" ||
    intent === "recent_fortune" ||
    intent === "general"
  ) return intent;
  return "general";
}
