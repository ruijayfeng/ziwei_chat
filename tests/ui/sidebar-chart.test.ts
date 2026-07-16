import { describe, expect, test } from "vitest";
import { sidebarChartSummary } from "../../src/lib/ui/sidebar-chart";

describe("sidebar chart summary", () => {
  test("keeps loading, empty, and ready states explicit", () => {
    expect(sidebarChartSummary({ ready: false, loading: false, chart: null })).toEqual({ phase: "loading" });
    expect(sidebarChartSummary({ ready: true, loading: false, chart: null })).toEqual({ phase: "empty" });
    expect(sidebarChartSummary({
      ready: true,
      loading: false,
      chart: { chartId: "chart-1", displayName: "我的命盘", palaces: [] },
    })).toEqual({ phase: "ready", displayName: "我的命盘", detail: "12 宫确定性命盘" });
  });
});
