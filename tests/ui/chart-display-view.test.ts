import { existsSync, readFileSync } from "node:fs";
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

  test("binds the reference chart route to the real workspace display model", () => {
    const route = readFileSync(
      resolve(process.cwd(), "src/app/(workspace)/chart/page.tsx"),
      "utf8",
    );
    const context = readFileSync(
      resolve(process.cwd(), "src/components/chart/chart-context.tsx"),
      "utf8",
    );

    expect(route).toContain("useWorkspace()");
    expect(route).toContain("referencePalaces(chartDisplay)");
    expect(route).toContain("chartDisplay?.chartId ?? 'demo-chart'");
    expect(context).toContain("palaces: Palace[]");
    expect(context).toContain("palace.name === '命宫'");
  });

  test("reads palace data from the reference chart context instead of static imports", () => {
    for (const file of ["destiny-chart.tsx", "palace-inspector.tsx", "chart-hero.tsx"]) {
      const source = readFileSync(
        resolve(process.cwd(), `src/components/chart/${file}`),
        "utf8",
      );

      expect(source).not.toContain("PALACES");
      expect(source).toContain("palaces");
    }
  });

  test("restores chart create and edit access through the reference route", () => {
    const route = readFileSync(
      resolve(process.cwd(), "src/app/(workspace)/chart/page.tsx"),
      "utf8",
    );
    const hero = readFileSync(
      resolve(process.cwd(), "src/components/chart/chart-hero.tsx"),
      "utf8",
    );
    const sheetPath = resolve(process.cwd(), "src/components/chart/chart-profile-sheet.tsx");

    expect(existsSync(sheetPath)).toBe(true);
    expect(route).toContain("<ChartProfileSheet");
    expect(route).toContain("chartDisplay={chartDisplay}");
    expect(hero).toContain("onEdit");
    expect(hero).toContain("hasChart ? '编辑命盘' : '创建命盘'");
    expect(hero).toContain("点击宫位查看确定性排盘事实");
    expect(hero).not.toContain("AI 将实时解释每一次点击");

    const sheet = existsSync(sheetPath) ? readFileSync(sheetPath, "utf8") : "";
    expect(sheet).toContain("<ChartOnboarding");
    expect(sheet).toContain("saveChart");
    expect(sheet).toContain("resetLocalChart");
  });
});
