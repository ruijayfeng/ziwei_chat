/**
 * [INPUT]: Depends on the current browser-owned primary chart draft
 * [OUTPUT]: Provides request-safe chart context for every chat turn
 * [POS]: UI request helper that keeps serverless chat requests self-contained
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

import type { CreateChartInput } from "@/lib/domain/chart";

export function chartInputForChatRequest(chart: CreateChartInput | null) {
  return chart ?? undefined;
}
