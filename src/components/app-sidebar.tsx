"use client";

/**
 * [INPUT]: Depends on workspace navigation, chart input, and local-data actions
 * [OUTPUT]: Provides the fixed desktop/mobile navigation rail
 * [POS]: Persistent identity and navigation surface outside the switching workspace
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

import { Pencil, Sparkles } from "lucide-react";

import type { CreateChartInput } from "@/lib/domain/chart";
import { getChartSyncLabel } from "@/lib/ui/chart-profile";
import type { ChartVisualModel } from "@/lib/ui/chart-visual";
import { ChartDisc } from "./chart-disc";
import type { ChartDiscMotionPhase } from "./chart-disc-motion";
import { workspaceNavigation, type WorkspaceView } from "@/lib/ui/workspace-navigation";
import { Button } from "@/components/ui/button";

type AppSidebarProps = {
  activeView: WorkspaceView;
  chartInput: CreateChartInput | null;
  chartSynced: boolean;
  onEditChart: () => void;
  onSelectView: (view: WorkspaceView) => void;
  chartVisualModel: ChartVisualModel | null;
  chartMotionPhase: ChartDiscMotionPhase;
};

export function AppSidebar({ activeView, chartInput, chartSynced, onEditChart, onSelectView, chartVisualModel, chartMotionPhase }: AppSidebarProps) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-card px-4 py-7">
      <div className="flex items-center gap-3 px-2">
        <div className="flex size-10 items-center justify-center rounded-full bg-accent text-primary"><Sparkles className="size-6 fill-current" /></div>
        <div><h1 className="text-xl font-semibold text-foreground">紫微知道</h1><p className="mt-1 text-xs text-muted-foreground">可信的命盘分析助手</p></div>
      </div>

      <nav className="mt-8 grid gap-1" aria-label="工作区导航">
        {workspaceNavigation.map((item) => {
          const Icon = item.icon;
          const active = activeView === item.id;
          return <Button className={active ? "justify-start bg-accent text-primary hover:bg-accent" : "justify-start text-foreground hover:bg-muted"} key={item.id} onClick={() => onSelectView(item.id)} type="button" variant="ghost"><Icon data-icon="inline-start" />{item.label}</Button>;
        })}
      </nav>

      <section className="mt-7 overflow-hidden rounded-xl border border-border bg-card" aria-labelledby="current-chart-title">
        <div className="flex items-center justify-between border-b border-border px-4 py-3"><h2 className="text-sm font-semibold" id="current-chart-title">当前命盘</h2><Button className="text-primary" onClick={onEditChart} size="xs" title="编辑命盘" type="button" variant="secondary"><Pencil data-icon="inline-start" />编辑</Button></div>
        <div className="p-4">
          <ChartDisc model={chartVisualModel} phase={chartMotionPhase} compact />
          {chartInput ? <><div className="flex items-center justify-between gap-2"><p className="truncate font-medium">{chartInput.name}</p><span className="shrink-0 rounded-md bg-success-muted px-2 py-0.5 text-xs text-success">{chartSynced ? "已同步" : "待同步"}</span></div><dl className="mt-3 grid gap-1.5 text-xs text-muted-foreground"><div className="flex justify-between gap-2"><dt>出生日期</dt><dd>{chartInput.birthDate}</dd></div><div className="flex justify-between gap-2"><dt>出生时间</dt><dd>{chartInput.birthTime}</dd></div><div className="flex justify-between gap-2"><dt>性别 / 历法</dt><dd>{chartInput.gender === "female" ? "女" : "男"} · {chartInput.calendarType === "lunar" ? "农历" : "阳历"}</dd></div>{chartInput.birthPlace ? <div className="flex justify-between gap-2"><dt>出生地</dt><dd className="truncate">{chartInput.birthPlace}</dd></div> : null}</dl><p className="mt-3 text-xs text-muted-foreground">{getChartSyncLabel(chartSynced, true)}</p></> : <div className="grid gap-2"><p className="font-medium">尚未创建命盘</p><p className="text-xs leading-5 text-muted-foreground">保存出生信息后，分析会使用这张命盘。</p></div>}
        </div>
      </section>

      <div className="mt-auto px-2 pt-6 text-xs leading-6 text-muted-foreground"><p>关于紫微知道</p><p>v0.1.0 · 开源优先 · 匿名使用</p></div>
    </div>
  );
}
