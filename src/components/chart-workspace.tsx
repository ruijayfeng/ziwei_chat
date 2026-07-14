"use client";

/**
 * [INPUT]: Depends on existing chart onboarding inputs and callbacks
 * [OUTPUT]: Provides the chart editing workspace and an honest visual placeholder
 * [POS]: Main workspace view selected from the persistent sidebar
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

import type { CreateChartInput } from "@/lib/domain/chart";
import type { ChartVisualModel } from "@/lib/ui/chart-visual";
import { ChartOnboarding } from "./chart-onboarding";
import { ChartDisc } from "./chart-disc";
import type { ChartDiscMotionPhase } from "./chart-disc-motion";

type ChartWorkspaceProps = {
  profileId: string;
  chartInput: CreateChartInput | null;
  chartSynced: boolean;
  onChartReady: (chart: CreateChartInput) => void;
  onResetChart: () => void;
  chartVisualModel: ChartVisualModel | null;
  chartMotionPhase: ChartDiscMotionPhase;
};

export function ChartWorkspace(props: ChartWorkspaceProps) {
  return <section className="mx-auto grid w-full max-w-5xl gap-7 px-5 py-8 sm:px-10"><header><h2 className="font-serif text-3xl font-medium">命盘</h2><p className="mt-3 text-muted-foreground">查看并更新当前用于分析的出生资料。</p></header><div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]"><ChartOnboarding {...props} /><aside className="grid content-start gap-4 rounded-xl border border-border bg-card p-5"><div><p className="text-sm font-semibold">命盘概览</p><p className="mt-1 text-xs leading-5 text-muted-foreground">只显示已由工具得到的确定命盘事实。</p></div><ChartDisc model={props.chartVisualModel} phase={props.chartMotionPhase} /><p className="text-center text-xs leading-5 text-muted-foreground">{props.chartVisualModel ? "分析时，相关宫位会在盘面中高亮。" : "保存命盘资料后可查看十二宫位摘要。"}</p></aside></div></section>;
}
