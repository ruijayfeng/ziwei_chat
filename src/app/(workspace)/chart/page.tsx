import { AppLayout } from '@/components/app-layout'
import { ChartHero } from '@/components/chart/chart-hero'
import { ChartProvider } from '@/components/chart/chart-context'
import { DestinyChart } from '@/components/chart/destiny-chart'
import { PalaceInspector } from '@/components/chart/palace-inspector'

export default function ChartPage() {
  return (
    <ChartProvider>
      <AppLayout fill inspector={<PalaceInspector />}>
        <div className="flex h-full flex-col">
          <ChartHero />

          <div className="relative flex min-h-0 flex-1 items-center justify-center py-4">
            <DestinyChart />
          </div>

          <footer className="flex shrink-0 items-center justify-center gap-2 text-xs text-muted-foreground/70">
            <span className="size-1 rounded-full bg-primary/60" />
            点击任意宫位查看解读，连线为三方四正 · 命盘为演示数据
          </footer>
        </div>
      </AppLayout>
    </ChartProvider>
  )
}
