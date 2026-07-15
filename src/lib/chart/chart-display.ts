/**
 * [INPUT]: Depends on raw server-only iztro chart JSON and chart display contracts
 * [OUTPUT]: Provides a sanitized twelve-palace display model
 * [POS]: Server chart adapter that prevents raw iztro objects from reaching the browser
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

import type {
  ChartDisplayModel,
  ChartDisplayPalace,
  ChartDisplayStar,
} from "../domain/chart-display";

type PalaceLike = {
  index?: unknown;
  name?: unknown;
  heavenlyStem?: unknown;
  earthlyBranch?: unknown;
  majorStars?: unknown;
  minorStars?: unknown;
  adjectiveStars?: unknown;
  isBodyPalace?: unknown;
  isOriginalPalace?: unknown;
};

export function buildChartDisplayModel({
  chartId,
  displayName,
  chartJson,
}: {
  chartId: string;
  displayName: string;
  chartJson: unknown;
}): ChartDisplayModel {
  const palaces = readPalaces(chartJson)
    .map(readPalace)
    .filter((palace): palace is ChartDisplayPalace => palace !== null)
    .sort((left, right) => left.index - right.index);

  return { chartId, displayName, palaces };
}

function readPalaces(chartJson: unknown): PalaceLike[] {
  if (!isRecord(chartJson) || !Array.isArray(chartJson.palaces)) return [];
  return chartJson.palaces.filter(isRecord) as PalaceLike[];
}

function readPalace(value: PalaceLike): ChartDisplayPalace | null {
  const index = readIndex(value.index);
  const name = readString(value.name);
  const earthlyBranch = readString(value.earthlyBranch);
  if (index === null || !name || !earthlyBranch) return null;

  return {
    id: `palace-${index}-${earthlyBranch}`,
    index,
    name,
    heavenlyStem: readString(value.heavenlyStem),
    earthlyBranch,
    majorStars: readStars(value.majorStars),
    minorStars: readStars(value.minorStars),
    adjectiveStars: readStars(value.adjectiveStars),
    isBodyPalace: value.isBodyPalace === true,
    isLaiyinPalace: value.isOriginalPalace === true,
  };
}

function readStars(value: unknown): ChartDisplayStar[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord).map((star) => ({
    name: readString(star.name),
    brightness: readString(star.brightness),
    mutagen: readString(star.mutagen),
  })).filter((star) => star.name.length > 0);
}

function readIndex(value: unknown) {
  return Number.isInteger(value) && Number(value) >= 0 && Number(value) < 12
    ? Number(value)
    : null;
}

function readString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
