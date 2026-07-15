import { describe, expect, test } from "vitest";

import { createChart } from "../../src/lib/chart/create-chart";
import { buildChartDisplayModel } from "../../src/lib/chart/chart-display";

describe("buildChartDisplayModel", () => {
  test("maps a complete iztro chart into a sanitized twelve-palace display model", () => {
    const chart = createChart({
      profileId: "00000000-0000-4000-8000-000000000001",
      name: "测试命盘",
      gender: "male",
      birthDate: "1990-05-17",
      birthTime: "12:00",
      calendarType: "solar",
      isPrimary: true,
    });
    if (!chart.ok) throw new Error(chart.error.message);

    const display = buildChartDisplayModel({
      chartId: chart.data.chartId,
      displayName: chart.data.displayName,
      chartJson: chart.data.chartJson,
    });

    expect(display.palaces).toHaveLength(12);
    expect(new Set(display.palaces.map((palace) => palace.id)).size).toBe(12);
    expect(new Set(display.palaces.map((palace) => palace.index)).size).toBe(12);
    expect(display.palaces.map((palace) => palace.earthlyBranch)).not.toContain("");

    const soulPalace = display.palaces.find((palace) => palace.name === "命宫");
    expect(soulPalace).toMatchObject({
      id: expect.stringContaining("palace-"),
      name: "命宫",
      heavenlyStem: expect.any(String),
      earthlyBranch: expect.any(String),
      majorStars: expect.any(Array),
      minorStars: expect.any(Array),
      adjectiveStars: expect.any(Array),
      isBodyPalace: true,
    });
    expect(display.palaces.some((palace) => palace.isLaiyinPalace)).toBe(true);
    expect(display).not.toHaveProperty("chartJson");
  });
});
