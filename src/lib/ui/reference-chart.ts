/**
 * [INPUT]: Depends on the sanitized iztro-backed ChartDisplayModel
 * [OUTPUT]: Provides truthful Palace[] data for the accepted reference chart UI
 * [POS]: Pure presentation adapter between the real chart DTO and reference radial components
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

import type {
  ChartDisplayModel,
  ChartDisplayPalace,
  ChartDisplayStar,
} from "../domain/chart-display";
import type { MainStar, Palace, SihuaType } from "../chart-data";

const brightnessScore: Record<string, number> = {
  陷: 1,
  不: 2,
  平: 2,
  利: 2,
  得: 3,
  旺: 4,
  庙: 5,
};

export function referencePalaces(model: ChartDisplayModel): Palace[] {
  return [...model.palaces]
    .sort((left, right) => left.index - right.index)
    .map(referencePalace);
}

export function referencePalaceSummary(palace: ChartDisplayPalace) {
  const stars = palace.majorStars.map((star) => star.name);
  const starFact = stars.length > 0
    ? `主星为${stars.join("、")}`
    : "本宫无主星";
  const markers = [
    palace.isBodyPalace ? "同时为身宫" : "",
    palace.isLaiyinPalace ? "同时为来因宫" : "",
  ].filter(Boolean);
  const markerFact = markers.length > 0 ? `；${markers.join("，")}` : "";

  return `${palace.name}落在${palace.earthlyBranch}位，${starFact}${markerFact}。`;
}

function referencePalace(palace: ChartDisplayPalace): Palace {
  const mainStars = palace.majorStars.map(referenceMainStar);
  const supportingStars = uniqueStarNames([
    ...palace.minorStars,
    ...palace.adjectiveStars,
  ]);

  return {
    id: palace.id,
    sourceIndex: palace.index,
    name: palace.name,
    branch: palace.earthlyBranch,
    mainStars,
    minorStars: supportingStars,
    keywords: [
      palace.isBodyPalace ? "身宫" : "",
      palace.isLaiyinPalace ? "来因宫" : "",
    ].filter(Boolean),
    rating: strongestBrightness(palace.majorStars),
    summary: referencePalaceSummary(palace),
    aiTraits: [],
    basis: [
      ...mainStars.map(formatMainStarBasis),
      ...supportingStars,
    ],
    related: [],
  };
}

function referenceMainStar(star: ChartDisplayStar): MainStar {
  return {
    name: star.name,
    ...(star.brightness ? { brightness: star.brightness } : {}),
    ...(sihuaFromMutagen(star.mutagen)
      ? { sihua: sihuaFromMutagen(star.mutagen) }
      : {}),
  };
}

function strongestBrightness(stars: ChartDisplayStar[]) {
  const scores = stars
    .map((star) => brightnessScore[star.brightness])
    .filter((score): score is number => typeof score === "number");
  return scores.length > 0 ? Math.max(...scores) : null;
}

function uniqueStarNames(stars: ChartDisplayStar[]) {
  return [...new Set(stars.map((star) => star.name).filter(Boolean))];
}

function formatMainStarBasis(star: MainStar) {
  return [star.name, star.brightness, star.sihua].filter(Boolean).join("·");
}

function sihuaFromMutagen(mutagen: string): SihuaType | undefined {
  const value = mutagen.startsWith("化") ? mutagen : `化${mutagen}`;
  return value === "化禄" || value === "化权" || value === "化科" || value === "化忌"
    ? value
    : undefined;
}
