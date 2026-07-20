'use client'

import { AppLayout } from '@/components/app-layout'
import { ChartHero } from '@/components/chart/chart-hero'
import { ChartProfileSheet } from '@/components/chart/chart-profile-sheet'
import { ChartProvider } from '@/components/chart/chart-context'
import { DestinyChart } from '@/components/chart/destiny-chart'
import { PalaceInspector } from '@/components/chart/palace-inspector'
import { useWorkspace } from '@/components/workspace/workspace-provider'
import { chartRouteState } from '@/lib/ui/chart-route-state'
import { referencePalaces } from '@/lib/ui/reference-chart'
import { LoaderCircle, Plus, RefreshCw } from 'lucide-react'
import { useState } from 'react'

export default function ChartPage() {
  const {
    ready,
    chartDisplay,
    chartLoading,
    chartRestoreSettled,
    chartError,
    retryChartRestore,
  } = useWorkspace()
  const [profileOpen, setProfileOpen] = useState(false)
  const state = chartRouteState({
    hasChart: Boolean(chartDisplay),
    ready,
    loading: chartLoading,
    settled: chartRestoreSettled,
    error: chartError,
  })
  const profileSheet = (
    <ChartProfileSheet
      chartDisplay={chartDisplay}
      onOpenChange={setProfileOpen}
      open={profileOpen}
    />
  )

  if (state !== 'chart' || !chartDisplay) {
    return (
      <AppLayout fill inspector={null}>
        <div className="flex h-full flex-col">
          <ChartEmptyHeader />
          <div className="flex min-h-0 flex-1 items-center justify-center px-4 py-8">
            {state === 'loading' ? (
              <div role="status" className="flex flex-col items-center text-center text-muted-foreground">
                <LoaderCircle className="mb-4 size-7 animate-spin text-primary" aria-hidden="true" />
                <p className="font-serif text-xl text-foreground">正在恢复命盘</p>
                <p className="mt-2 text-sm">正在读取当前浏览器工作区的数据。</p>
              </div>
            ) : state === 'error' ? (
              <div role="alert" className="max-w-md text-center">
                <p className="font-serif text-2xl text-foreground">命盘暂时无法恢复</p>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{chartError}</p>
                <button
                  type="button"
                  aria-label="重试恢复"
                  onClick={retryChartRestore}
                  className="mt-6 inline-flex items-center gap-2 border-b border-primary pb-1 text-sm font-medium text-primary"
                >
                  <RefreshCw className="size-4" aria-hidden="true" />
                  重试恢复
                </button>
              </div>
            ) : (
              <div className="max-w-md text-center">
                <p className="font-serif text-2xl text-foreground">这里还没有命盘</p>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  创建后才会展示由 iztro 计算的真实宫位与星曜信息。
                </p>
                <button
                  type="button"
                  aria-label="创建命盘"
                  onClick={() => setProfileOpen(true)}
                  className="mt-6 inline-flex items-center gap-2 border-b border-primary pb-1 text-sm font-medium text-primary"
                >
                  <Plus className="size-4" aria-hidden="true" />
                  创建命盘
                </button>
              </div>
            )}
          </div>
          {profileSheet}
        </div>
      </AppLayout>
    )
  }

  const palaces = referencePalaces(chartDisplay)

  return (
    <ChartProvider key={chartDisplay.chartId} palaces={palaces}>
      <AppLayout fill inspector={<PalaceInspector />}>
        <div className="flex h-full flex-col">
          <ChartHero hasChart onEdit={() => setProfileOpen(true)} />
          <div className="relative flex min-h-0 flex-1 items-center justify-center py-4">
            <DestinyChart />
          </div>
          <footer className="flex shrink-0 items-center justify-center gap-2 text-xs text-muted-foreground/70">
            <span className="size-1 rounded-full bg-primary/60" />
            {`${chartDisplay.displayName} · iztro 确定性排盘 · 连线为三方四正`}
          </footer>
        </div>
        {profileSheet}
      </AppLayout>
    </ChartProvider>
  )
}

function ChartEmptyHeader() {
  return (
    <header className="max-w-xl shrink-0">
      <p className="flex items-baseline gap-2.5">
        <span className="font-display text-sm italic leading-none text-primary">the chart</span>
        <span className="text-xs text-muted-foreground">命盘全览</span>
      </p>
      <h1 className="mt-3 font-serif text-3xl font-medium leading-tight text-foreground xl:text-[2.6rem]">
        先有真实排盘，再谈解读
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        页面不会用演示数据代替你的命盘。
      </p>
    </header>
  )
}
