'use client'

import { cn } from '@/lib/utils'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { PanelRight } from 'lucide-react'
import { NAV_ITEMS } from '@/components/nav-items'
import { ZiweiLogotype } from '@/components/brand/logotype'

/** Top bar shown only on mobile: brand + optional inspector trigger. */
export function MobileTopBar({ onOpenInspector }: { onOpenInspector?: () => void }) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border/60 bg-background/80 px-4 backdrop-blur-md lg:hidden">
      <ZiweiLogotype className="text-[22px]" />
      {onOpenInspector && (
        <button
          type="button"
          onClick={onOpenInspector}
          aria-label="打开分析助手"
          className="flex size-9 items-center justify-center rounded-full border border-border bg-card/50 text-muted-foreground transition-colors hover:text-primary"
        >
          <PanelRight className="size-[18px]" strokeWidth={1.75} />
        </button>
      )}
    </header>
  )
}

/** Bottom tab bar shown only on mobile: primary navigation. */
export function MobileTabBar() {
  const pathname = usePathname()
  return (
    <nav className="flex h-16 shrink-0 items-stretch border-t border-border/60 bg-background/90 backdrop-blur-md lg:hidden">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon
        const active = item.href !== '#' && pathname === item.href
        return (
          <Link
            key={item.id}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className="flex flex-1 flex-col items-center justify-center gap-1"
          >
            <Icon
              className={cn(
                'size-[22px] transition-colors',
                active ? 'text-primary' : 'text-muted-foreground',
              )}
              strokeWidth={active ? 2 : 1.75}
            />
            <span
              className={cn(
                'text-[10px] transition-colors',
                active ? 'font-medium text-primary' : 'text-muted-foreground',
              )}
            >
              {item.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
