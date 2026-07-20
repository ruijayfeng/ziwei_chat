import { describe, expect, test } from "vitest";

import { chartRouteState } from "../../src/lib/ui/chart-route-state";

describe("chart route state", () => {
  test("keeps an existing real chart visible during background work", () => {
    expect(chartRouteState({ hasChart: true, ready: true, loading: true, settled: false, error: "ignored" })).toBe("chart");
  });

  test("shows loading until workspace bootstrap and restore settle", () => {
    expect(chartRouteState({ hasChart: false, ready: false, loading: false, settled: false, error: null })).toBe("loading");
    expect(chartRouteState({ hasChart: false, ready: true, loading: true, settled: false, error: null })).toBe("loading");
    expect(chartRouteState({ hasChart: false, ready: true, loading: false, settled: false, error: null })).toBe("loading");
  });

  test("keeps restore failure distinct from a settled empty workspace", () => {
    expect(chartRouteState({ hasChart: false, ready: true, loading: false, settled: true, error: "restore failed" })).toBe("error");
    expect(chartRouteState({ hasChart: false, ready: true, loading: false, settled: true, error: null })).toBe("empty");
  });
});
