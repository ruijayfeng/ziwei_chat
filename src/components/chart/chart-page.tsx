"use client";

import { ChartOnboarding } from "@/components/chart-onboarding";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import { ChartProvider } from "./chart-provider";
import { DestinyChart } from "./destiny-chart";
import { PalaceInspector } from "./palace-inspector";

export function ChartPage() {
  const {
    ready,
    profileId,
    chartInput,
    chartDisplay,
    chartLoading,
    chartSynced,
    chartError,
    saveChart,
    resetLocalChart,
  } = useWorkspace();

  if (!ready || !profileId) return <ChartLoading />;

  return (
    <section className="mx-auto max-w-6xl py-4">
      <header className="max-w-3xl">
        <p className="text-sm text-cinnabar">命盘</p>
        <h1 className="mt-3 font-serif text-4xl font-bold leading-tight sm:text-5xl">十二宫是一张事实地图</h1>
        <p className="mt-4 leading-7 text-muted-foreground">点击宫位查看真实排盘信息。需要解释时，再把宫位带入对话交给 Agent 分析。</p>
      </header>

      {chartError ? (
        <p className="mt-6 rounded-xl border border-destructive/35 bg-destructive/10 px-4 py-3 text-sm text-destructive">{chartError}</p>
      ) : null}

      {chartLoading && !chartDisplay ? <ChartLoading /> : null}

      {chartDisplay ? (
        <ChartProvider model={chartDisplay}>
          <div className="mt-8 grid gap-7 xl:grid-cols-[minmax(0,1fr)_320px]">
            <DestinyChart />
            <PalaceInspector />
          </div>
        </ChartProvider>
      ) : null}

      <div className="mt-10 max-w-xl">
        <ChartOnboarding
          chartInput={chartInput}
          chartSynced={chartSynced}
          onChartReady={(chart) => void saveChart(chart)}
          onResetChart={resetLocalChart}
          profileId={profileId}
        />
        {chartInput ? <p className="mt-3 text-xs leading-5 text-muted-foreground">重置只清除当前浏览器显示；部署实例中的匿名数据请在设置页统一删除。</p> : null}
      </div>
    </section>
  );
}

function ChartLoading() {
  return <div className="mt-10 h-48 rounded-2xl border border-border bg-card/60" aria-label="正在读取命盘" />;
}
