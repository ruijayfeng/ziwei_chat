/**
 * [INPUT]: Depends on browser-owned primary chart input and anonymous profile id
 * [OUTPUT]: Provides validated local persistence for rendering the current-chart UI after reload
 * [POS]: UI-only session boundary; server chart tools remain the source of analysis facts
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

import type { CreateChartInput } from "../domain/chart";
import type { ChartVisualModel } from "./chart-visual";

const storagePrefix = "ziwei-chat-primary-chart:";

export function chartSessionStorageKey(profileId: string) {
  return `${storagePrefix}${profileId}`;
}

export function chartSessionStorageValue(chart: CreateChartInput, visualModel?: ChartVisualModel | null) {
  return JSON.stringify({ chart, visualModel: visualModel ?? null });
}

export function chartSessionFromStorage(value: string | null, profileId: string): CreateChartInput | null {
  if (!value) return null;

  try {
    const chart = readStoredChart(JSON.parse(value) as unknown);
    return isStoredChartInput(chart, profileId) ? chart : null;
  } catch {
    return null;
  }
}

export function chartVisualModelFromStorage(value: string | null, profileId: string): ChartVisualModel | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as unknown;
    const chart = readStoredChart(parsed);
    if (!isStoredChartInput(chart, profileId) || !isStoredChartVisualModel(parsed)) return null;
    return parsed.visualModel;
  } catch {
    return null;
  }
}

function readStoredChart(value: unknown) {
  return isRecord(value) && "chart" in value ? value.chart : value;
}

function isStoredChartVisualModel(value: unknown): value is { visualModel: ChartVisualModel } {
  return isRecord(value) && isRecord(value.visualModel) && typeof value.visualModel.chartId === "string" && typeof value.visualModel.displayName === "string" && Array.isArray(value.visualModel.palaces);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isStoredChartInput(value: unknown, profileId: string): value is CreateChartInput {
  if (typeof value !== "object" || value === null) return false;
  const chart = value as Record<string, unknown>;

  return (
    chart.profileId === profileId &&
    typeof chart.name === "string" &&
    typeof chart.birthDate === "string" &&
    typeof chart.birthTime === "string" &&
    (chart.gender === "male" || chart.gender === "female") &&
    (chart.calendarType === "solar" || chart.calendarType === "lunar") &&
    (chart.birthPlace === undefined || typeof chart.birthPlace === "string") &&
    chart.isPrimary === true
  );
}
