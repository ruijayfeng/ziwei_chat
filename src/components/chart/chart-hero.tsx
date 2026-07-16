'use client'

import { useChart } from './chart-context'

const QUICK_JUMPS = ['命宫', '财帛', '官禄', '迁移']

export function ChartHero() {
  const { palaces, selected, setSelected } = useChart()

  return (
    <header className="flex shrink-0 items-start justify-between gap-6">
      <div className="max-w-xl">
        <p className="mb-3 flex items-baseline gap-2.5">
          <span className="font-display text-sm italic leading-none text-primary">the chart</span>
          <span className="text-xs tracking-[0.16em] text-muted-foreground">命盘全览</span>
        </p>
        <h1 className="text-pretty font-serif text-3xl font-medium leading-tight tracking-[-0.02em] text-foreground xl:text-[2.6rem]">
          你的命盘不会改变命运，
          <br />
          它只帮助你看清自己。
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          探索十二宫、主星与四化之间的关系，AI 将实时解释每一次点击。
        </p>
      </div>

      <nav className="hidden shrink-0 flex-col items-end gap-2 lg:flex" aria-label="快速跳转宫位">
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
