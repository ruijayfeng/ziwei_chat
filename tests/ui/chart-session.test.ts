import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  chartDisplayModelFromStorage,
  chartSessionFromStorage,
  chartSessionStorageKey,
  chartSessionStorageValue,
  chartVisualModelFromStorage,
} from "../../src/lib/ui/chart-session";
import type { ChartDisplayModel } from "../../src/lib/domain/chart-display";

const chartInput = {
  profileId: "profile-1",
  name: "我的命盘",
  gender: "male" as const,
  birthDate: "1990-05-17",
  birthTime: "12:00",
  calendarType: "solar" as const,
  birthPlace: "上海",
  isPrimary: true,
};

describe("chart session storage", () => {
  test("round-trips a saved primary chart for its anonymous profile", () => {
    const visualModel = { chartId: "chart-1", displayName: "我的命盘", palaces: [] };
    const stored = chartSessionStorageValue(chartInput, visualModel);

    expect(chartSessionStorageKey("profile-1")).toBe("ziwei-chat-primary-chart:profile-1");
    expect(chartSessionFromStorage(stored, "profile-1")).toEqual(chartInput);
    expect(chartVisualModelFromStorage(stored, "profile-1")).toEqual(visualModel);
  });

  test("rejects malformed or profile-mismatched browser chart state", () => {
    expect(chartSessionFromStorage("not-json", "profile-1")).toBeNull();
    expect(chartSessionFromStorage(chartSessionStorageValue(chartInput), "profile-2")).toBeNull();
  });

  test("round-trips a deeply validated full chart display model", () => {
    const display: ChartDisplayModel = {
      chartId: "chart-1",
      displayName: "我的命盘",
      palaces: Array.from({ length: 12 }, (_, index) => ({
        id: `palace-${index}`,
        index,
        name: index === 0 ? "命宫" : `宫位${index}`,
        heavenlyStem: "甲",
        earthlyBranch: "子",
        majorStars: [],
        minorStars: [],
        adjectiveStars: [],
        isBodyPalace: index === 0,
        isLaiyinPalace: index === 1,
      })),
    };

    const stored = chartSessionStorageValue(chartInput, null, display);
    expect(chartDisplayModelFromStorage(stored, "profile-1")).toEqual(display);

    const malformed = JSON.stringify({
      chart: chartInput,
      display: { ...display, palaces: [{ id: "broken" }] },
    });
    expect(chartDisplayModelFromStorage(malformed, "profile-1")).toBeNull();

    const duplicateGeometry = JSON.stringify({
      chart: chartInput,
      display: {
        ...display,
        palaces: display.palaces.map((palace) => ({ ...palace, id: "duplicate", index: 0 })),
      },
    });
    expect(chartDisplayModelFromStorage(duplicateGeometry, "profile-1")).toBeNull();
  });
});

test("defers local chart restoration outside the effect body", () => {
  const providerSource = readFileSync(resolve(process.cwd(), "src/components/workspace/workspace-provider.tsx"), "utf8");

  expect(providerSource).toContain("const restoreTimer = window.setTimeout(() => {");
  expect(providerSource).not.toContain('if (restored) {\n      setChartInput(restored);');
});

test("falls back to the chart API when legacy storage has no display model", () => {
  const providerSource = readFileSync(
    resolve(process.cwd(), "src/components/workspace/workspace-provider.tsx"),
    "utf8",
  );

  expect(providerSource).toContain("if (storedChart && storedDisplay)");
  expect(providerSource).toContain("fetch(`/api/chart?profileId=");
});

test("blocks invalid provider settings before opening a chat request", () => {
  const providerSource = readFileSync(
    resolve(process.cwd(), "src/components/workspace/workspace-provider.tsx"),
    "utf8",
  );

  expect(providerSource).toContain("modelSettingsValidationError(modelSettings)");
  expect(providerSource).toContain("if (modelValidationError)");
  expect(providerSource.indexOf("if (modelValidationError)")).toBeLessThan(
    providerSource.indexOf("await sendChatRequest"),
  );
});
