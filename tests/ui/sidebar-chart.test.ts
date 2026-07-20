import { describe, expect, test } from "vitest";
import { sidebarChartSummary } from "../../src/lib/ui/sidebar-chart";

test("keeps the current chart visible when a later save fails", () => {
  const chart = { chartId: "chart-1", displayName: "Primary chart", palaces: [] };

  expect(sidebarChartSummary({
    ready: true,
    settled: true,
    loading: false,
    error: "save failed",
    chart,
  })).toEqual({ phase: "ready", displayName: "Primary chart", detail: "12 宫确定性命盘" });
});

describe("sidebar chart summary", () => {
  test("keeps unsettled bootstrap in loading", () => {
    expect(sidebarChartSummary({ ready: true, settled: false, loading: false, error: null, chart: null })).toEqual({ phase: "loading" });
  });

  test("shows a settled restore error", () => {
    expect(sidebarChartSummary({ ready: true, settled: true, loading: false, error: "恢复失败", chart: null })).toEqual({
      phase: "error",
      message: "命盘暂时不可用",
    });
  });

  test("shows an explicitly settled empty state", () => {
    expect(sidebarChartSummary({ ready: true, settled: true, loading: false, error: null, chart: null })).toEqual({ phase: "empty" });
  });

  test("shows a ready chart after restore settles", () => {
    expect(sidebarChartSummary({
      ready: true,
      settled: true,
      loading: false,
      error: null,
      chart: { chartId: "chart-1", displayName: "我的命盘", palaces: [] },
    })).toEqual({ phase: "ready", displayName: "我的命盘", detail: "12 宫确定性命盘" });
  });
});
