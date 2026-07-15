import { describe, expect, test } from "vitest";

import type { ChartDisplayModel } from "../../src/lib/domain/chart-display";
import { getRelatedPalaceIds } from "../../src/lib/ui/chart-display";

const display: ChartDisplayModel = {
  chartId: "chart-1",
  displayName: "测试命盘",
  palaces: Array.from({ length: 12 }, (_, index) => ({
    id: `palace-${index}`,
    index,
    name: `宫位${index}`,
    heavenlyStem: "甲",
    earthlyBranch: "子",
    majorStars: [],
    minorStars: [],
    adjectiveStars: [],
    isBodyPalace: false,
    isLaiyinPalace: false,
  })),
};

describe("chart display geometry", () => {
  test("uses stable ids while deriving trines and opposition from iztro indices", () => {
    expect(getRelatedPalaceIds(display, "palace-11")).toEqual({
      selected: "palace-11",
      trines: ["palace-3", "palace-7"],
      opposite: "palace-5",
    });
  });

  test("returns null for a palace outside the current chart", () => {
    expect(getRelatedPalaceIds(display, "unknown")).toBeNull();
  });
});
