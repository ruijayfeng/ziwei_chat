# Chat Reveal And Markdown Design

## Goal

Make critic-approved answers appear progressively instead of flashing in at once, and render their Markdown with a distinctive but restrained Ziwei Chat reading hierarchy.

## Scope

- Keep the API, critic, evidence, and chart-fact pipeline unchanged.
- Buffer approved answer chunks in the presentation layer and reveal Unicode-safe characters over roughly 2.5 to 3 seconds.
- Continue revealing after the transport completes until the full answer is visible.
- Show the full answer immediately when reduced motion is requested.
- Render headings, paragraphs, lists, emphasis, links, quotes, dividers, code, and tables as semantic Markdown.
- Use the existing warm-indigo product system and cinnabar punctuation. Avoid nested cards, decorative gradients, and theatrical motion.

## Presentation

- Body copy remains the dominant surface at 1rem with generous dark-mode leading and a maximum readable measure.
- Headings use the existing editorial serif role, solid foreground color, and a compact leading marker.
- Lists use small geometric markers and clear vertical rhythm.
- Blockquotes use a quiet tinted surface and a leading quote icon instead of a heavy side stripe.
- Inline code and fenced code use restrained neutral surfaces with overflow protection.
- Tables scroll horizontally on narrow screens and preserve readable cell spacing.

## Motion

- The answer reveal is the single signature state transition.
- Reveal steps adapt to answer length, use `requestAnimationFrame`, and never split surrogate pairs.
- The streaming caret remains visible while buffered content is still being revealed.
- Reduced-motion mode skips pacing and renders the complete available content.

## Verification

- Unit tests cover Unicode slicing, adaptive pacing, Markdown structures, and reduced-motion behavior.
- Typecheck, full tests, production build, and browser checks must pass.
- Browser checks cover desktop and mobile layout, no overlap, no horizontal page overflow, and zero console errors.
