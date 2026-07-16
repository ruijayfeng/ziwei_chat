'use client'

import { motion } from 'motion/react'
import { Moon, Music2, PanelRightClose, PanelRightOpen } from 'lucide-react'
import { useInspectorToggle } from '@/components/inspector-context'
import { cn } from '@/lib/utils'

const fade = {
  initial: { opacity: 0, y: 12, filter: 'blur(6px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
}

export function HeroHeader() {
  const inspector = useInspectorToggle()
  return (
    <div className="flex items-start justify-between gap-6">
      <div>
        <motion.h1
          {...fade}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="text-balance font-serif text-[26px] font-medium leading-tight tracking-tight text-foreground sm:text-[34px] md:text-[40px]"
        >
          今天 · 你的能量正在流动
        </motion.h1>
        <motion.p
          {...fade}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="mt-3 flex items-center gap-2 text-[15px] text-muted-foreground"
        >
          <span className="size-1.5 shrink-0 rounded-full bg-cinnabar" aria-hidden />
          把握当下的节奏，顺势而为
        </motion.p>
      </div>

      <motion.div
        {...fade}
        transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
        className="flex items-center gap-4"
      >
        <div className="hidden text-right leading-relaxed sm:block">
          <p className="flex items-center justify-end gap-1.5 text-sm text-foreground">
            <Moon className="size-3.5 text-muted-foreground" strokeWidth={1.75} />
            2025年05月14日 · 周三
          </p>
          <p className="font-mono text-xs tracking-wide text-muted-foreground">
            乙巳年 辛巳月 戊申日
          </p>
        </div>
        <button
          type="button"
          aria-label="背景音乐"
          className="flex size-10 items-center justify-center rounded-full border border-border bg-card/50 text-muted-foreground backdrop-blur-md transition-colors duration-300 hover:text-primary"
        >
          <Music2 className="size-[18px]" strokeWidth={1.75} />
        </button>
        {inspector && (
          <button
            type="button"
            onClick={inspector.toggle}
            aria-label={inspector.open ? '收起分析助手' : '展开分析助手'}
            aria-expanded={inspector.open}
            className={cn(
              'hidden size-10 items-center justify-center rounded-full border backdrop-blur-md transition-colors duration-300 xl:flex',
              inspector.open
                ? 'border-primary/40 bg-primary/10 text-primary'
                : 'border-border bg-card/50 text-muted-foreground hover:text-primary',
            )}
          >
            {inspector.open ? (
              <PanelRightClose className="size-[18px]" strokeWidth={1.75} />
            ) : (
              <PanelRightOpen className="size-[18px]" strokeWidth={1.75} />
            )}
          </button>
        )}
      </motion.div>
    </div>
  )
}
