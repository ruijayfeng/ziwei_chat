'use client'

import { PencilLine, Plus } from 'lucide-react'
import { useChart } from './chart-context'

const QUICK_JUMPS = ['命宫', '财帛', '官禄', '迁移']

export function ChartHero({ hasChart, onEdit }: { hasChart: boolean; onEdit: () => void }) {
  const { palaces, selected, setSelected } = useChart()
  const actionLabel = hasChart ? '编辑命盘' : '创建命盘'

  return (
    <header className="flex shrink-0 items-start justify-between gap-6">
      <div className="max-w-xl">
        <div className="mb-3 flex items-center justify-between gap-3 lg:block">
          <p className="flex items-baseline gap-2.5">
            <span className="font-display text-sm italic leading-none text-primary">the chart</span>
            <span className="text-xs tracking-[0.16em] text-muted-foreground">命盘全览</span>
          </p>
          <button
            type="button"
            onClick={onEdit}
            className="surface inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-foreground transition-colors hover:border-primary/40 lg:hidden"
          >
            {hasChart ? <PencilLine className="size-3.5" /> : <Plus className="size-3.5" />}
            {actionLabel}
          </button>
        </div>
        <h1 className="text-pretty font-serif text-3xl font-medium leading-tight tracking-[-0.02em] text-foreground xl:text-[2.6rem]">
          你的命盘不会改变命运，
          <br />
          它只帮助你看清自己。
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          点击宫位查看确定性排盘事实，需要解读时再交给 Agent 结合依据分析。
        </p>
      </div>

      <nav className="hidden shrink-0 flex-col items-end gap-2 lg:flex" aria-label="快速跳转宫位">
        <button
          type="button"
          onClick={onEdit}
          className="surface mb-2 inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-xs text-foreground transition-colors hover:border-primary/40"
        >
          {hasChart ? <PencilLine className="size-3.5" /> : <Plus className="size-3.5" />}
          {actionLabel}
        </button>
        <span className="text-xs tracking-[0.2em] text-muted-foreground">快速定位</span>
        <div className="flex flex-wrap justify-end gap-1.5">
          {QUICK_JUMPS.map((name) => {
            const index = palaces.findIndex((p) => p.name === name)
            const active = index === selected
            return (
              <button
                key={name}
                type="button"
                onClick={() => setSelected(index)}
                className={
                  active
                    ? 'rounded-full border border-primary/50 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors'
                    : 'surface rounded-full px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground'
                }
              >
                {name}
              </button>
            )
          })}
        </div>
      </nav>
    </header>
  )
}
