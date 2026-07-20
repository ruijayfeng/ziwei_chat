/**
 * [INPUT]: Depends on normalized workspace chart lifecycle flags
 * [OUTPUT]: Provides the single visible state for the chart route
 * [POS]: Pure UI state boundary between WorkspaceProvider and chart presentation
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

export type ChartRouteState = "loading" | "empty" | "error" | "chart";

type ChartRouteStateInput = {
  hasChart: boolean;
  ready: boolean;
  loading: boolean;
  settled: boolean;
  error: string | null;
};

export function chartRouteState(input: ChartRouteStateInput): ChartRouteState {
  if (input.hasChart) return "chart";
  if (!input.ready || input.loading || !input.settled) return "loading";
  if (input.error) return "error";
  return "empty";
}
