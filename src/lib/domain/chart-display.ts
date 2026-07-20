/**
 * [INPUT]: Depends on sanitized values extracted from an iztro astrolabe
 * [OUTPUT]: Provides browser-safe full-chart display contracts
 * [POS]: Shared domain boundary between server-only chart JSON and chart UI
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

export type ChartDisplayStar = {
  name: string;
  brightness: string;
  mutagen: string;
};

export type ChartDisplayPalace = {
  id: string;
  index: number;
  name: string;
  heavenlyStem: string;
  earthlyBranch: string;
  majorStars: ChartDisplayStar[];
  minorStars: ChartDisplayStar[];
  adjectiveStars: ChartDisplayStar[];
  isBodyPalace: boolean;
  isLaiyinPalace: boolean;
};

export type ChartDisplayModel = {
  chartId: string;
  displayName: string;
  palaces: ChartDisplayPalace[];
};
