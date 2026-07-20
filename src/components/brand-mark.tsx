/**
 * 紫微知道 brand mark — a bespoke "pole star" glyph, not the stock sparkle.
 *
 * It condenses the product's own destiny-ring geometry into an icon: a crisp
 * four-point star (the 紫微/帝星 — the pole star classical astrology orients
 * by) sitting inside a single orbit with one satellite. Drawn with
 * `currentColor` so it inherits the surrounding text color (violet primary).
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      {/* orbit */}
      <circle
        cx="12"
        cy="12"
        r="10.25"
        stroke="currentColor"
        strokeOpacity="0.38"
        strokeWidth="1"
      />
      {/* satellite star on the orbit (upper-right) */}
      <circle cx="19.25" cy="4.75" r="1.5" fill="currentColor" />
      {/* central four-point pole star */}
      <path
        d="M12 3.6 Q 12.85 11.15 20.4 12 Q 12.85 12.85 12 20.4 Q 11.15 12.85 3.6 12 Q 11.15 11.15 12 3.6 Z"
        fill="currentColor"
      />
    </svg>
  )
}

/**
 * Just the four-point pole star, no orbit — the brand's reusable kicker tick.
 * Replaces stray unicode stars (✦) that render as tofu in the serif fonts, and
 * keeps every section marker on one identity. Inherits currentColor.
 */
export function StarTick({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <path
        d="M12 2.5 Q 13 11 21.5 12 Q 13 13 12 21.5 Q 11 13 2.5 12 Q 11 11 12 2.5 Z"
        fill="currentColor"
      />
    </svg>
  )
}
