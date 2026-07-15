import { astro } from "iztro";
import { describe, expect, test } from "vitest";

import { summarizeChart } from "../../src/lib/chart/summarize-chart";

describe("summarizeChart", () => {
  test("extracts topic-relevant palaces, stars, transforms, patterns, and facts", () => {
    const chartJson = astro.bySolar("1990-5-17", 6, "male", true, "zh-CN");
    const summary = summarizeChart({
      chartId: "chart-fixture",
      chartJson,
      topics: ["career", "wealth", "personality"],
    });

    expect(summary.chartId).toBe("chart-fixture");
    expect(summary.keyPalaces).toEqual(
      expect.arrayContaining(["官禄", "财帛", "命宫"]),
    );
    expect(summary.keyStars.length).toBeGreaterThan(0);
    expect(summary.keyPatterns).toContain("命宫主星");
    expect(summary.facts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          topic: "career",
          palace: "官禄",
          confidence: "high",
        }),
        expect.objectContaining({
          topic: "wealth",
          palace: "财帛",
          confidence: "high",
        }),
      ]),
    );
  });

  test("uses the named 命宫 instead of iztro's 来因宫 marker", () => {
    const chartJson = astro.bySolar("1990-5-17", 6, "male", true, "zh-CN");
    const laiyinPalace = chartJson.palaces.find((palace) => palace.isOriginalPalace);
    expect(laiyinPalace?.name).not.toBe("命宫");

    const summary = summarizeChart({
      chartId: "chart-fixture",
      chartJson,
      topics: ["personality"],
    });

    expect(summary.facts[0]).toMatchObject({
      palace: "命宫",
      patterns: expect.arrayContaining(["命宫主星", "身宫落点"]),
    });
    expect(summary.facts[0]?.palace).not.toBe(laiyinPalace?.name);
  });

  test("returns a low-confidence fallback fact when chart palaces are unavailable", () => {
    const summary = summarizeChart({
      chartId: "chart-bad",
      chartJson: {},
      topics: ["career"],
    });

    expect(summary).toEqual({
      chartId: "chart-bad",
      keyPalaces: [],
      keyStars: [],
      keyPatterns: [],
      facts: [
        {
          id: "chart-bad:career:missing-palace",
          topic: "career",
          palace: "unknown",
          stars: [],
          transforms: [],
          patterns: [],
        rawText: "没有找到 career 对应的宫位资料。",
          confidence: "low",
        },
      ],
    });
  });
});
