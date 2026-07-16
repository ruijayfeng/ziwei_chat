'use client'

import { motion } from 'motion/react'
import { Moon, PanelRightClose, PanelRightOpen } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useInspectorToggle } from '@/components/inspector-context'
import {
  currentCalendarDisplay,
  type CurrentCalendarDisplay,
} from '@/lib/ui/current-calendar'
import { cn } from '@/lib/utils'

const fade = {
  initial: { opacity: 0, y: 12, filter: 'blur(6px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
}

export function HeroHeader() {
  const inspector = useInspectorToggle()
  const [calendar, setCalendar] = useState<CurrentCalendarDisplay | null>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => setCalendar(currentCalendarDisplay(new Date())), 0)
    return () => window.clearTimeout(timer)
  }, [])

  return (
    <div className="flex items-start justify-between gap-6">
      <div>
        <motion.h1
          {...fade}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="text-balance font-serif text-[26px] font-medium leading-tight tracking-tight text-foreground sm:text-[34px] md:text-[40px]"
        >
          {'\u4eca\u5929 \u00b7 \u4f60\u7684\u80fd\u91cf\u6b63\u5728\u6d41\u52a8'}
        </motion.h1>
        <motion.p
          {...fade}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="mt-3 flex items-center gap-2 text-[15px] text-muted-foreground"
        >
          <span className="size-1.5 shrink-0 rounded-full bg-cinnabar" aria-hidden />
          {'\u628a\u63e1\u5f53\u4e0b\u7684\u8282\u594f\uff0c\u987a\u52bf\u800c\u4e3a'}
        </motion.p>
      </div>

      <motion.div
        {...fade}
        transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
        className="flex items-center gap-4"
      >
        <div className="hidden min-w-40 text-right leading-relaxed sm:block">
          <p className="flex items-center justify-end gap-1.5 text-sm text-foreground">
            <Moon className="size-3.5 text-muted-foreground" strokeWidth={1.75} />
            {calendar?.dateLabel}
          </p>
        </div>
        {inspector && (
          <button
            type="button"
            onClick={inspector.toggle}
            aria-label={inspector.open ? '\u6536\u8d77\u5206\u6790\u52a9\u624b' : '\u5c55\u5f00\u5206\u6790\u52a9\u624b'}
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
