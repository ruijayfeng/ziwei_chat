/**
 * [INPUT]: Depends on deterministic ChartSummary facts from iztro-backed tools
 * [OUTPUT]: Provides a stable, truthful visual model for compact/full chart discs
 * [POS]: UI data boundary between chart facts/evidence and animated chart components
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

import type { ChartSummary } from "../domain/chart";

export const chartPalaceOrder = ["命宫", "兄弟", "夫妻", "子女", "财帛", "疾厄", "迁移", "仆役", "官禄", "田宅", "福德", "父母"] as const;

export type ChartVisualPalace = {
  name: string;
  stars: string[];
  transforms: string[];
  patterns: string[];
  rawText: string;
  confidence: "high" | "medium" | "low" | null;
  active: boolean;
};

export type ChartVisualModel = {
  chartId: string;
  displayName: string;
  palaces: ChartVisualPalace[];
};

export function selectActivePalaces(palaces: string[]) {
  return [...new Set(palaces)].filter((palace) => chartPalaceOrder.includes(palace as (typeof chartPalaceOrder)[number]));
}

export function buildChartVisualModel({ chartId, displayName, summary }: { chartId: string; displayName: string; summary: ChartSummary }): ChartVisualModel {
  const factsByPalace = new Map(summary.facts.map((fact) => [fact.palace, fact]));
  return {
    chartId,
    displayName,
    palaces: chartPalaceOrder.map((name) => {
      const fact = factsByPalace.get(name);
      return {
        name,
        stars: fact?.stars ?? [],
        transforms: fact?.transforms ?? [],
        patterns: fact?.patterns ?? [],
        rawText: fact?.rawText ?? "",
        confidence: fact?.confidence ?? null,
        active: Boolean(fact),
      };
    }),
  };
}

export function activateChartVisualModel(model: ChartVisualModel, palaceNames: string[]): ChartVisualModel {
  const activePalaces = new Set(selectActivePalaces(palaceNames));
  return { ...model, palaces: model.palaces.map((palace) => ({ ...palace, active: activePalaces.has(palace.name) })) };
}
