/**
 * [INPUT]: Depends on the sanitized ChartDisplayModel and WorkspaceProvider chart state
 * [OUTPUT]: Provides the pure loading, empty, and ready sidebar chart summary model
 * [POS]: Small presentation adapter between workspace state and the sidebar chart card
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

import type { ChartDisplayModel } from "@/lib/domain/chart-display";

export type SidebarChartSummary =
  | { phase: "loading" }
  | { phase: "empty" }
  | { phase: "ready"; displayName: string; detail: string };

export function sidebarChartSummary(input: {
  ready: boolean;
  loading: boolean;
  chart: ChartDisplayModel | null;
}): SidebarChartSummary {
  if (!input.ready || input.loading) return { phase: "loading" };
  if (!input.chart) return { phase: "empty" };

  return {
    phase: "ready",
    displayName: input.chart.displayName || "我的命盘",
    detail: `${input.chart.palaces.length || 12} 宫确定性命盘`,
  };
}
