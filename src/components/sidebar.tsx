'use client'

import { cn } from '@/lib/utils'
import { motion } from 'motion/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight, Compass } from 'lucide-react'
import { NAV_ITEMS, type NavItem } from '@/components/nav-items'
import { ZiweiLogotype } from '@/components/brand/logotype'

function NavigationItem({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group relative flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm transition-colors duration-300',
        active
          ? 'text-foreground'
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {active && (
        <motion.span
          layoutId="nav-active"
          transition={{ type: 'spring', stiffness: 400, damping: 34 }}
          className="absolute inset-0 rounded-xl bg-primary/10"
        />
      )}
      <Icon
        className={cn(
          'relative z-10 size-[18px] transition-colors',
          active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground',
        )}
        strokeWidth={1.75}
      />
      <span className="relative z-10 font-medium">{item.label}</span>
    </Link>
  )
}

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden h-full w-[264px] shrink-0 flex-col gap-6 overflow-y-auto px-5 py-6 lg:flex">
      {/* Wordmark — restrained editorial logotype whose memory point is the
          pole-star mark on 紫微, not its size. No icon box, no accent split. */}
      <div className="px-1.5 pb-1 pt-1">
        <h1>
          <ZiweiLogotype className="text-[26px]" />
        </h1>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => (
          <NavigationItem
            key={item.id}
            item={item}
            active={item.href !== '#' && pathname === item.href}
          />
        ))}
      </nav>

      {/* Current chart card */}
      <div className="surface relative overflow-hidden rounded-2xl p-4">
        <div className="mb-3 flex items-center gap-2.5">
          <div className="surface-well flex size-8 items-center justify-center rounded-lg">
            <Compass className="size-4 text-primary" strokeWidth={1.75} />
          </div>
          <span className="text-sm font-medium text-foreground">我的命盘</span>
        </div>
        <p className="mb-3.5 font-mono text-xs tracking-wide text-muted-foreground">
          己巳年 · 戊辰月 · 戊寅日
        </p>
        <Link
          href="/chart"
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-primary/25 bg-primary/10 py-2 text-xs font-medium text-primary transition-colors duration-300 hover:bg-primary/15"
        >
          查看命盘
          <ChevronRight className="size-3.5" strokeWidth={2} />
        </Link>
      </div>

      <div className="flex-1" />

      {/* Pro card */}
      <div className="surface relative overflow-hidden rounded-2xl p-4">
        <div className="mb-1.5 flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">解锁更多能力</span>
        </div>
        <p className="mb-3.5 text-xs leading-relaxed text-muted-foreground">
          畅享深度分析与高级功能
        </p>
        <button
          type="button"
          className="relative w-full rounded-lg bg-primary py-2 text-xs font-semibold text-primary-foreground transition-opacity duration-300 hover:opacity-90"
        >
          开通 Pro
        </button>
      </div>

      {/* Footer */}
      <div className="px-1.5 leading-relaxed">
        <p className="text-xs font-medium text-muted-foreground">关于紫微知道</p>
        <p className="mt-1 text-[11px] text-muted-foreground/70">
          v0.1.0 · 开源优先 · 匿名使用
        </p>
      </div>
    </aside>
  )
}
