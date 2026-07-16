'use client'

import { GradientBackground } from '@/components/gradient-background'
import { InspectorPanel } from '@/components/inspector-panel'
import { InspectorToggleContext } from '@/components/inspector-context'
import { MobileTabBar, MobileTopBar } from '@/components/mobile-chrome'
import { Sidebar } from '@/components/sidebar'
import { cn } from '@/lib/utils'
import { AnimatePresence, motion } from 'motion/react'
import { X } from 'lucide-react'
import { useState } from 'react'

export function AppLayout({
  children,
  inspector,
  fill = false,
  center = false,
  collapsibleInspector = false,
}: {
  children: React.ReactNode
  /** `undefined` → default panel · `null` → no panel · node → custom panel */
  inspector?: React.ReactNode
  fill?: boolean
  /** Vertically center the (short) content within the viewport. */
  center?: boolean
  /** When true, the inspector can be slid open/closed via the header toggle. */
  collapsibleInspector?: boolean
}) {
  const [open, setOpen] = useState(true)
  const [sheetOpen, setSheetOpen] = useState(false)
  const inspectorContent = inspector === undefined ? <InspectorPanel /> : inspector

  return (
    <InspectorToggleContext.Provider
      value={collapsibleInspector ? { open, toggle: () => setOpen((v) => !v) } : null}
    >
      {/* App shell: locked to the viewport height so the chrome always fills the
          screen and never leaves a void on tall/zoomed-out displays. */}
      <div className="relative h-screen overflow-hidden font-sans text-foreground">
        <GradientBackground />
        <div className="mx-auto flex h-full max-w-[1600px] flex-col lg:flex-row">
          {/* Desktop-only fixed sidebar */}
          <Sidebar />

          {/* Mobile-only top bar */}
          <MobileTopBar onOpenInspector={inspectorContent ? () => setSheetOpen(true) : undefined} />

          <main
            className={cn(
              'min-h-0 min-w-0 flex-1 border-border/60 lg:border-x',
              fill
                ? 'overflow-hidden px-4 py-5 sm:px-6 lg:h-full lg:px-10'
                : 'overflow-y-auto px-4 py-5 sm:px-6 lg:h-full lg:px-12',
            )}
          >
            {fill ? (
              <div className="h-full">{children}</div>
            ) : (
              // `min-h-full` lets short content center while tall content grows
              // past the viewport and scrolls from the top without clipping.
              <div className={cn('flex min-h-full flex-col', center && 'lg:justify-center')}>
                {children}
              </div>
            )}
          </main>

          {/* Desktop inspector column */}
          {inspectorContent &&
            (collapsibleInspector ? (
              <AnimatePresence initial={false}>
                {open && (
                  <motion.div
                    key="inspector"
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 320, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    className="hidden shrink-0 overflow-hidden border-l border-border/60 xl:block"
                  >
                    {inspectorContent}
                  </motion.div>
                )}
              </AnimatePresence>
            ) : (
              <div className="hidden shrink-0 xl:block">{inspectorContent}</div>
            ))}

          {/* Mobile-only bottom tab bar */}
          <MobileTabBar />
        </div>

        {/* Mobile inspector as a slide-up sheet */}
        {inspectorContent && (
          <AnimatePresence>
            {sheetOpen && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  onClick={() => setSheetOpen(false)}
                  className="fixed inset-0 z-40 bg-background/70 backdrop-blur-sm lg:hidden"
                />
                <motion.div
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] flex-col rounded-t-3xl border-t border-border/60 bg-card lg:hidden"
                >
                  <div className="flex items-center justify-between border-b border-border/60 px-5 py-3.5">
                    <span className="text-sm font-medium text-foreground">分析助手</span>
                    <button
                      type="button"
                      onClick={() => setSheetOpen(false)}
                      aria-label="关闭"
                      className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <X className="size-[18px]" strokeWidth={1.75} />
                    </button>
                  </div>
                  <div className="min-h-0 flex-1 overflow-y-auto">{inspectorContent}</div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        )}
      </div>
    </InspectorToggleContext.Provider>
  )
}
