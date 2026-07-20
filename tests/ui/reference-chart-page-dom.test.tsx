// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const { retryChartRestore, workspace } = vi.hoisted(() => ({
  retryChartRestore: vi.fn(),
  workspace: {
    ready: true,
    chartDisplay: null as null | { chartId: string; displayName: string; palaces: unknown[] },
    chartLoading: false,
    chartRestoreSettled: false,
    chartError: null as string | null,
    retryChartRestore: vi.fn(),
  },
}));
workspace.retryChartRestore = retryChartRestore;

vi.mock("@/components/workspace/workspace-provider", () => ({ useWorkspace: () => workspace }));
vi.mock("@/components/app-layout", () => ({
  AppLayout: ({ children, inspector }: { children: React.ReactNode; inspector?: React.ReactNode }) => (
    <main>{children}<div data-testid="inspector-slot">{inspector}</div></main>
  ),
}));
vi.mock("@/components/chart/chart-context", () => ({
  ChartProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="chart-provider">{children}</div>,
}));
vi.mock("@/components/chart/chart-hero", () => ({ ChartHero: () => <div>真实命盘标题</div> }));
vi.mock("@/components/chart/destiny-chart", () => ({ DestinyChart: () => <div>真实命盘图</div> }));
vi.mock("@/components/chart/palace-inspector", () => ({ PalaceInspector: () => <aside>真实宫位检查器</aside> }));
vi.mock("@/components/chart/chart-profile-sheet", () => ({
  ChartProfileSheet: ({ open }: { open: boolean }) => open ? <div>命盘资料表单</div> : null,
}));
vi.mock("@/lib/ui/reference-chart", () => ({ referencePalaces: () => [] }));

import ChartPage from "../../src/app/(workspace)/chart/page";

beforeEach(() => {
  workspace.ready = true;
  workspace.chartDisplay = null;
  workspace.chartLoading = false;
  workspace.chartRestoreSettled = false;
  workspace.chartError = null;
  retryChartRestore.mockClear();
});

afterEach(cleanup);

describe("reference chart page mounted states", () => {
  test("keeps chart context and inspector unmounted while loading or empty", () => {
    const view = render(<ChartPage />);
    expect(screen.getByRole("status").textContent).toContain("正在恢复命盘");
    expect(screen.queryByTestId("chart-provider")).toBeNull();
    expect(screen.queryByText("真实宫位检查器")).toBeNull();

    workspace.chartRestoreSettled = true;
    view.rerender(<ChartPage />);
    fireEvent.click(screen.getByRole("button", { name: "创建命盘" }));
    expect(screen.getByText("命盘资料表单")).toBeTruthy();
    expect(screen.queryByTestId("chart-provider")).toBeNull();
  });

  test("renders restore error with a working retry command", () => {
    workspace.chartRestoreSettled = true;
    workspace.chartError = "命盘恢复暂时不可用，请稍后重试。";
    render(<ChartPage />);

    expect(screen.getByRole("alert").textContent).toContain(workspace.chartError);
    fireEvent.click(screen.getByRole("button", { name: "重试恢复" }));
    expect(retryChartRestore).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("chart-provider")).toBeNull();
  });

  test("mounts chart context and inspector only for a real chart", () => {
    workspace.chartRestoreSettled = true;
    workspace.chartDisplay = { chartId: "chart-1", displayName: "我的命盘", palaces: [] };
    render(<ChartPage />);

    expect(screen.getByTestId("chart-provider")).toBeTruthy();
    expect(screen.getByText("真实命盘图")).toBeTruthy();
    expect(screen.getByText("真实宫位检查器")).toBeTruthy();
  });
});
