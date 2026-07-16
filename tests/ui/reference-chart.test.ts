import { describe, expect, test } from "vitest";

import type { ChartDisplayModel } from "../../src/lib/domain/chart-display";
import { referencePalaces } from "../../src/lib/ui/reference-chart";

function chartDisplayFixture(): ChartDisplayModel {
  return {
    chartId: "chart-1",
    displayName: "测试命盘",
    palaces: Array.from({ length: 12 }, (_, index) => ({
      id: `palace-${index}-${index === 3 ? "卯" : "子"}`,
      index,
      name: index === 3 ? "命宫" : `宫位${index}`,
      heavenlyStem: "甲",
      earthlyBranch: index === 3 ? "卯" : "子",
      majorStars: index === 3
        ? [{ name: "紫微", brightness: "庙", mutagen: "权" }]
        : index === 4
          ? [{ name: "天机", brightness: "未知", mutagen: "未知" }]
          : [],
      minorStars: index === 3
        ? [{ name: "左辅", brightness: "", mutagen: "" }]
        : [],
      adjectiveStars: index === 3
        ? [
            { name: "天喜", brightness: "", mutagen: "" },
            { name: "左辅", brightness: "", mutagen: "" },
          ]
        : [],
      isBodyPalace: index === 3,
      isLaiyinPalace: index === 3,
    })),
  };
}

describe("referencePalaces", () => {
  test("maps sanitized iztro display facts into the reference palace contract", () => {
    const palaces = referencePalaces(chartDisplayFixture());

    expect(palaces).toHaveLength(12);
    expect(palaces.map((palace) => palace.sourceIndex)).toEqual(
      Array.from({ length: 12 }, (_, index) => index),
    );
    expect(palaces[3]).toMatchObject({
      id: "palace-3-卯",
      sourceIndex: 3,
      name: "命宫",
      branch: "卯",
      mainStars: [{ name: "紫微", sihua: "化权", brightness: "庙" }],
      minorStars: ["左辅", "天喜"],
      keywords: ["身宫", "来因宫"],
      rating: 5,
      aiTraits: [],
      related: [],
    });
    expect(palaces[3].summary).toContain("命宫落在卯位");
    expect(palaces[3].summary).toContain("主星为紫微");
    expect(palaces[3].basis).toEqual(["紫微·庙·化权", "左辅", "天喜"]);
  });

  test("does not turn unknown brightness or mutagen values into sourced claims", () => {
    const palace = referencePalaces(chartDisplayFixture())[4];

    expect(palace.rating).toBeNull();
    expect(palace.mainStars).toEqual([{ name: "天机", brightness: "未知" }]);
    expect(palace.basis).toEqual(["天机·未知"]);
  });
});
