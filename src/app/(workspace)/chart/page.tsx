'use client'

import { AppLayout } from '@/components/app-layout'
import { ChartHero } from '@/components/chart/chart-hero'
import { ChartProfileSheet } from '@/components/chart/chart-profile-sheet'
import { ChartProvider } from '@/components/chart/chart-context'
import { DestinyChart } from '@/components/chart/destiny-chart'
import { PalaceInspector } from '@/components/chart/palace-inspector'
import { useWorkspace } from '@/components/workspace/workspace-provider'
import { PALACES } from '@/lib/chart-data'
import { referencePalaces } from '@/lib/ui/reference-chart'
import { useState } from 'react'

export default function ChartPage() {
  const { chartDisplay, chartLoading } = useWorkspace()
  const [profileOpen, setProfileOpen] = useState(false)
  const palaces = chartDisplay ? referencePalaces(chartDisplay) : PALACES
  const chartKey = chartDisplay?.chartId ?? 'demo-chart'

  return (
    <ChartProvider key={chartKey} palaces={palaces}>
      <AppLayout fill inspector={<PalaceInspector />}>
        <div className="flex h-full flex-col">
          <ChartHero hasChart={Boolean(chartDisplay)} onEdit={() => setProfileOpen(true)} />

          <div className="relative flex min-h-0 flex-1 items-center justify-center py-4">
            <DestinyChart />
          </div>

          <footer className="flex shrink-0 items-center justify-center gap-2 text-xs text-muted-foreground/70">
            <span className="size-1 rounded-full bg-primary/60" />
            {chartDisplay
              ? `${chartDisplay.displayName} · iztro 确定性排盘 · 连线为三方四正`
              : chartLoading
                ? '正在恢复当前命盘'
                : '演示命盘 · 创建命盘后替换为真实排盘'}
          </footer>
        </div>
        <ChartProfileSheet
          chartDisplay={chartDisplay}
          onOpenChange={setProfileOpen}
          open={profileOpen}
        />
      </AppLayout>
    </ChartProvider>
  )
}
