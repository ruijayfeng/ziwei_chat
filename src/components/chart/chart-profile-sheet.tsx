'use client'

/**
 * [INPUT]: Depends on WorkspaceProvider chart state, the existing ChartOnboarding form, and owned Sheet primitives
 * [OUTPUT]: Provides the reference-style create/edit chart sheet
 * [POS]: Thin presentation wrapper restoring profile controls without owning chart transport
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

import { ChartOnboarding } from '@/components/chart-onboarding'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useWorkspace } from '@/components/workspace/workspace-provider'
import type { ChartDisplayModel } from '@/lib/domain/chart-display'

type ChartProfileSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  chartDisplay: ChartDisplayModel | null
}

export function ChartProfileSheet({
  open,
  onOpenChange,
  chartDisplay,
}: ChartProfileSheetProps) {
  const {
    ready,
    profileId,
    chartInput,
    chartSynced,
    chartError,
    saveChart,
    resetLocalChart,
  } = useWorkspace()

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="w-full max-w-none gap-0 overflow-hidden border-l border-border bg-card p-0 shadow-2xl sm:max-w-[460px]"
        side="right"
      >
        <SheetHeader className="border-b border-border/70 px-6 pb-5 pt-7">
          <p className="font-display text-sm italic text-primary">the birth chart</p>
          <SheetTitle className="font-serif text-2xl font-medium tracking-[-0.02em]">
            {chartDisplay ? '编辑当前命盘' : '创建你的命盘'}
          </SheetTitle>
          <SheetDescription className="max-w-sm leading-6">
            出生资料只用于 iztro 确定性排盘，并绑定当前浏览器的匿名空间。
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
          {chartError ? (
            <p className="mb-4 rounded-xl border border-destructive/35 bg-destructive/10 px-4 py-3 text-sm leading-6 text-destructive">
              {chartError}
            </p>
          ) : null}

          {ready && profileId ? (
            <ChartOnboarding
              chartInput={chartInput}
              chartSynced={chartSynced}
              onChartReady={(chart) => {
                void saveChart(chart).then((saved) => {
                  if (saved) onOpenChange(false)
                })
              }}
              onResetChart={resetLocalChart}
              profileId={profileId}
            />
          ) : (
            <div className="surface h-48 animate-pulse rounded-2xl" aria-label="正在准备命盘资料" />
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
