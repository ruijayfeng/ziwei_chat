/**
 * [INPUT]: Depends on raw iztro chart JSON and chart domain contracts
 * [OUTPUT]: Provides topic-scoped ChartSummary extraction
 * [POS]: Deterministic fact boundary between chart engine output and agent analysis
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

import type { ChartFact, ChartSummary, ChartTopic } from "../domain/chart";

type StarLike = {
  name?: unknown;
  mutagen?: unknown;
};

type PalaceLike = {
  name?: unknown;
  isBodyPalace?: unknown;
  isOriginalPalace?: unknown;
  majorStars?: StarLike[];
  minorStars?: StarLike[];
  adjectiveStars?: StarLike[];
};

type SummarizeChartInput = {
  chartId: string;
  chartJson: unknown;
  topics: ChartTopic[];
};

const topicPalaces: Record<ChartTopic, string[]> = {
  career: ["官禄", "命宫", "迁移"],
  relationship: ["夫妻", "命宫", "福德"],
  wealth: ["财帛", "官禄", "田宅"],
  personality: ["命宫", "身宫", "福德"],
  recent_fortune: ["命宫", "迁移", "官禄", "财帛"],
  general: ["命宫", "身宫"],
};

export function summarizeChart({
  chartId,
  chartJson,
  topics,
}: SummarizeChartInput): ChartSummary {
  const palaces = readPalaces(chartJson);
  const facts = topics.flatMap((topic) =>
    buildFactsForTopic(chartId, topic, palaces),
  );

  return {
    chartId,
    keyPalaces: unique(facts.map((fact) => fact.palace).filter(isKnownPalace)),
    keyStars: unique(facts.flatMap((fact) => fact.stars)),
    keyPatterns: unique(facts.flatMap((fact) => fact.patterns)),
    facts,
  };
}

function buildFactsForTopic(
  chartId: string,
  topic: ChartTopic,
  palaces: PalaceLike[],
): ChartFact[] {
  const matchedPalaces = topicPalaces[topic]
    .map((palaceName) => findPalace(palaces, palaceName))
    .filter((palace): palace is PalaceLike => Boolean(palace));

  if (matchedPalaces.length === 0) {
    return [
      {
        id: `${chartId}:${topic}:missing-palace`,
        topic,
        palace: "unknown",
        stars: [],
        transforms: [],
        patterns: [],
        rawText: `No palace data was available for ${topic}.`,
        confidence: "low",
      },
    ];
  }

  return matchedPalaces.map((palace) => {
    const palaceName = readString(palace.name, "unknown");
    const stars = readStars(palace);
    const transforms = readTransforms(palace);
    const patterns = readPatterns(palace);

    return {
      id: `${chartId}:${topic}:${palaceName}`,
      topic,
      palace: palaceName,
      stars,
      transforms,
      patterns,
      rawText: `${palaceName} palace has ${stars.length > 0 ? stars.join("、") : "no major stars"}${transforms.length > 0 ? ` with transforms ${transforms.join("、")}` : ""}.`,
      confidence: stars.length > 0 ? "high" : "medium",
    };
  });
}

function readPalaces(chartJson: unknown): PalaceLike[] {
  if (!isRecord(chartJson) || !Array.isArray(chartJson.palaces)) {
    return [];
  }

  return chartJson.palaces.filter(isRecord) as PalaceLike[];
}

function findPalace(palaces: PalaceLike[], palaceName: string) {
  if (palaceName === "命宫") {
    return palaces.find((palace) => palace.isOriginalPalace === true);
  }

  if (palaceName === "身宫") {
    return palaces.find((palace) => palace.isBodyPalace === true);
  }

  return palaces.find((palace) => palace.name === palaceName);
}

function readStars(palace: PalaceLike) {
  return unique([
    ...readStarNames(palace.majorStars),
    ...readStarNames(palace.minorStars),
  ]);
}

function readStarNames(stars: StarLike[] | undefined) {
  if (!Array.isArray(stars)) {
    return [];
  }

  return stars.map((star) => readString(star.name)).filter(Boolean);
}

function readTransforms(palace: PalaceLike) {
  const stars = [...(palace.majorStars ?? []), ...(palace.minorStars ?? [])];

  return unique(
    stars
      .map((star) => readString(star.mutagen))
      .filter((mutagen) => mutagen.length > 0),
  );
}

function readPatterns(palace: PalaceLike) {
  const patterns: string[] = [];

  if (palace.isOriginalPalace === true) {
    patterns.push("命宫主星");
  }

  if (palace.isBodyPalace === true) {
    patterns.push("身宫落点");
  }

  return patterns;
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function isKnownPalace(palace: string) {
  return palace !== "unknown";
}

function readString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
