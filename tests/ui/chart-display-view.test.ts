import { readFileSync } from "node:fs";
import { resolve } from "node:path";
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

  test("keeps the reference radial chart renderer", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/components/chart/destiny-chart.tsx"),
      "utf8",
    );

    expect(source).toContain("三方四正 connections");
    expect(source).toContain("radial-gradient(circle at 50% 42%");
    expect(source).toContain("<motion.path");
    expect(source).toContain("OUTER_RING");
  });
});
