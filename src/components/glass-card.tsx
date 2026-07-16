import { cn } from '@/lib/utils'
import type { ComponentPropsWithoutRef } from 'react'

export function GlassCard({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<'div'>) {
  return (
    <div
      className={cn('surface relative overflow-hidden rounded-2xl', className)}
      {...props}
    >
      {children}
    </div>
  )
}
