import { describe, expect, test } from "vitest";

import { parseChartRestorePayload } from "../../src/lib/ui/chart-restore-payload";
import type { ChartDisplayModel } from "../../src/lib/domain/chart-display";

const profileId = "00000000-0000-4000-8000-000000000001";

function validPayload() {
  const display: ChartDisplayModel = {
    chartId: "chart-1",
    displayName: "我的命盘",
    palaces: Array.from({ length: 12 }, (_, index) => ({
      id: `palace-${index}`,
      index,
      name: `宫位${index}`,
      heavenlyStem: "甲",
      earthlyBranch: "子",
      majorStars: [],
      minorStars: [],
      adjectiveStars: [],
      isBodyPalace: index === 0,
      isLaiyinPalace: index === 1,
    })),
  };
  return {
    chartId: display.chartId,
    displayName: display.displayName,
    chart: {
      profileId,
      name: "我的命盘",
      gender: "male",
      birthDate: "1990-05-17",
      birthTime: "12:00",
      calendarType: "solar",
      isPrimary: true,
    },
    display,
  };
}

describe("chart restore payload", () => {
  test("accepts a profile-owned chart with a matching display envelope", () => {
    expect(parseChartRestorePayload(validPayload(), profileId)).toEqual(validPayload());
  });

  test.each([
    null,
    {},
    { ...validPayload(), chart: undefined },
    { ...validPayload(), chart: { ...validPayload().chart, profileId: "other" } },
    { ...validPayload(), display: { ...validPayload().display, palaces: [] } },
    { ...validPayload(), chartId: "different" },
    { ...validPayload(), displayName: "different" },
  ])("rejects malformed successful restore bodies", (payload) => {
    expect(() => parseChartRestorePayload(payload, profileId)).toThrow("命盘恢复响应格式无效，请重试。");
  });
});
