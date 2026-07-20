/**
 * [INPUT]: Depends on unknown /api/chart GET payloads and the current anonymous profile
 * [OUTPUT]: Provides a strictly validated profile-owned chart restore envelope
 * [POS]: Browser API contract boundary before WorkspaceProvider state mutation
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

import type { CreateChartInput } from "../domain/chart";
import type { ChartDisplayModel } from "../domain/chart-display";
import { isChartDisplayModel } from "./chart-session";

export type ChartRestorePayload = {
  chart: CreateChartInput;
  chartId: string;
  displayName: string;
  display: ChartDisplayModel;
};

export function parseChartRestorePayload(value: unknown, profileId: string): ChartRestorePayload {
  if (!isRecord(value) || !isChartInput(value.chart, profileId) || !isChartDisplayModel(value.display)) {
    throw invalidPayload();
  }
  if (
    typeof value.chartId !== "string" ||
    typeof value.displayName !== "string" ||
    value.chartId !== value.display.chartId ||
    value.displayName !== value.display.displayName
  ) {
    throw invalidPayload();
  }

  return {
    chart: value.chart,
    chartId: value.chartId,
    displayName: value.displayName,
    display: value.display,
  };
}

function isChartInput(value: unknown, profileId: string): value is CreateChartInput {
  if (!isRecord(value)) return false;
  return (
    value.profileId === profileId &&
    typeof value.name === "string" &&
    typeof value.birthDate === "string" &&
    typeof value.birthTime === "string" &&
    (value.gender === "male" || value.gender === "female") &&
    (value.calendarType === "solar" || value.calendarType === "lunar") &&
    (value.birthPlace === undefined || typeof value.birthPlace === "string") &&
    value.isPrimary === true
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function invalidPayload() {
  return new Error("命盘恢复响应格式无效，请重试。");
}
