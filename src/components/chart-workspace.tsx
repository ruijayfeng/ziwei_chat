"use client";

/**
 * [INPUT]: Depends on existing chart onboarding inputs and callbacks
 * [OUTPUT]: Provides the chart editing workspace and an honest visual placeholder
 * [POS]: Main workspace view selected from the persistent sidebar
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

import type { CreateChartInput } from "@/lib/domain/chart";
import { ChartOnboarding } from "./chart-onboarding";

type ChartWorkspaceProps = {
  profileId: string;
  chartInput: CreateChartInput | null;
  chartSynced: boolean;
  onChartReady: (chart: CreateChartInput) => void;
  onResetChart: () => void;
};

export function ChartWorkspace(props: ChartWorkspaceProps) {
  return <section className="mx-auto grid w-full max-w-4xl gap-7 px-5 py-8 sm:px-10"><header><h2 className="font-serif text-3xl font-medium">命盘</h2><p className="mt-3 text-muted-foreground">查看并更新当前用于分析的出生资料。</p></header><div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px]"><ChartOnboarding {...props} /><aside className="rounded-xl border border-dashed border-border bg-card p-5"><p className="text-sm font-medium">命盘概览</p><div className="mx-auto mt-5 flex aspect-square max-w-40 items-center justify-center rounded-full border border-border text-primary"><div className="size-20 rounded-full border border-border" /></div><p className="mt-5 text-sm leading-6 text-muted-foreground">{props.chartInput ? "完整命盘图将在可用结构化盘面数据后展示" : "保存命盘资料后可查看命盘摘要。"}</p></aside></div></section>;
}
