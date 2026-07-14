import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  chartSessionFromStorage,
  chartSessionStorageKey,
  chartSessionStorageValue,
  chartVisualModelFromStorage,
} from "../../src/lib/ui/chart-session";

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
});

test("defers local chart restoration outside the effect body", () => {
  const shellSource = readFileSync(resolve(process.cwd(), "src/components/ziwei-chat-shell.tsx"), "utf8");

  expect(shellSource).toContain("window.setTimeout(() => {");
  expect(shellSource).not.toContain('if (restored) {\n      setChartInput(restored);');
});
