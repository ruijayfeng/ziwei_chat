'use client'

import { AnimatePresence, motion } from 'motion/react'
import { ArrowUp, Paperclip } from 'lucide-react'
import { useState } from 'react'
import { THEMES } from '@/lib/workspace-data'

// A curated set of theme-guided starting points — the old standalone
// "主题分析" page collapsed into the one place users actually ask questions.
const GUIDED = THEMES.slice(0, 6)

export function ChatComposer({
  variant = 'hero',
  disabled = false,
  onSend,
}: {
  variant?: 'hero' | 'docked'
  disabled?: boolean
  onSend?: (text: string) => void
}) {
  const [value, setValue] = useState('')
  const isHero = variant === 'hero'

  function submit() {
    if (disabled) return
    const text = value.trim()
    if (!text) return
    onSend?.(text)
    setValue('')
  }

  return (
    <div className={isHero ? undefined : 'w-full'}>
      <AnimatePresence initial={false}>
        {isHero && (
          <motion.div
            key="guides"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="mb-3 px-1 text-[11px] text-muted-foreground">
              不知从何问起？从一个主题开始
            </div>
            <div className="mb-3 flex flex-wrap gap-2">
              {GUIDED.map((t) => {
                const Icon = t.icon
                return (
                  <button
                    key={t.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => setValue(t.question)}
                    className="surface group flex items-center gap-1.5 rounded-full py-1.5 pl-2 pr-3.5 text-xs text-muted-foreground transition-colors duration-300 hover:border-primary/40 hover:text-foreground"
                  >
                    <Icon
                      className="size-3.5 transition-colors"
                      style={{ color: t.accent }}
                      strokeWidth={2}
                    />
                    {t.label}
                  </button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="surface group relative flex items-end gap-3 rounded-2xl p-3 transition-colors duration-300 focus-within:border-primary/45">
        <button
          type="button"
          aria-label="添加附件"
          disabled={disabled}
          className="flex size-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:text-foreground"
        >
          <Paperclip className="size-[18px]" strokeWidth={1.75} />
        </button>
        <textarea
          disabled={disabled}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (
              e.key === 'Enter' &&
              !e.shiftKey &&
              !e.nativeEvent.isComposing &&
              e.keyCode !== 229
            ) {
              e.preventDefault()
              submit()
            }
          }}
          rows={1}
          placeholder="向紫微知道提问，探索属于你的答案…"
          className="max-h-40 flex-1 resize-none bg-transparent py-2 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
        <button
          type="button"
          aria-label="发送"
          onClick={submit}
          disabled={disabled || !value.trim()}
          className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-all duration-300 hover:opacity-90 disabled:opacity-30"
        >
          <ArrowUp className="size-[18px]" strokeWidth={2} />
        </button>
      </div>

      <div className="mt-2.5 text-center text-[11px] text-muted-foreground">
        回答仅供参考，不构成决策依据
      </div>
    </div>
  )
}
