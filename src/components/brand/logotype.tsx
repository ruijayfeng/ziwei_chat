import { cn } from '@/lib/utils'

/**
 * ZiweiLogotype — the editorial "紫微知道" wordmark.
 *
 * The Song/Ming serif supplies the glyphs; `.ziwei-logotype` (in globals.css)
 * layers warm-white color, light weight, refined optical spacing and a
 * subliminal moonlight — nearly flat, no carve or metal. Set as one continuous
 * string so 紫微知道 reads as a single word with no gap. Kept at a restrained
 * size (caller sets it via `className`, e.g. `text-[26px]`).
 */
export function ZiweiLogotype({ className }: { className?: string }) {
  return (
    <span className={cn('ziwei-logotype font-serif', className)}>紫微知道</span>
  )
}
