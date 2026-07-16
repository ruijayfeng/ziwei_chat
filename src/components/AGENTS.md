# components/
> L2 | Parent: AGENTS.md

Member List
app-layout.tsx: Reference-owned viewport shell with ambient background, desktop sidebar, responsive inspector, and mobile chrome.
sidebar.tsx: Reference-owned desktop navigation, chart summary card, and visual product footer.
mobile-chrome.tsx: Reference-owned mobile top bar, bottom tabs, and animated inspector sheet.
nav-items.ts: Reference route order and icons; settings href is corrected to the real `/settings` route.
gradient-background.tsx: Reference ambient background, stars, vignette, and texture.
glass-card.tsx: Reference surface wrapper.
hero-header.tsx: Reference home editorial header and date/music controls.
destiny-ring.tsx: Reference home destiny-ring renderer.
chat-composer.tsx: Reference home/docked composer presentation and theme prompts.
inspector-context.tsx: Inspector open/close contract used by reference shell controls.
inspector-panel.tsx: Reference default inspector presentation; real evidence binding remains pending.
motion-provider.tsx: Reference MotionConfig boundary respecting reduced-motion preferences.
brand/logotype.tsx: Reference LXGW WenKai/Fraunces wordmark.
brand-mark.tsx: Reference circular compass mark used by inspector surfaces.
brand/ziwei-logotype.tsx: Previous wordmark retained temporarily until old approximate shell cleanup.
chart-onboarding.tsx: Previous real chart/profile form retained for the future reference-style create/edit entry point.
report-message.tsx: Structured response-protocol renderer retained for real chat adaptation.
markdown-message.tsx: HTML-free Markdown renderer retained for real chat adaptation.
model-settings-panel.tsx: Real browser-local model provider controls, restyled with reference surfaces.
ui/: Project-owned shadcn/Base UI primitives.
workspace/workspace-provider.tsx: Persistent anonymous profile, real chart restore/save, model settings, real chat transport/evidence, and anonymous-data deletion boundary.
workspace/page-header.tsx: Reference editorial page header and ring glyph.
workspace/life-timeline.tsx: Reference records timeline currently driven by static workspace data.
workspace/pattern-list.tsx: Reference insights pattern list currently driven by static workspace data.
workspace/weekly-letter.tsx: Reference weekly-letter surface currently driven by static workspace data.
workspace/app-layout.tsx, sidebar.tsx, mobile-chrome.tsx, motion-provider.tsx, nav-items.ts: Previous approximate shell retained temporarily and no longer used by routes.
chat/: Reference chat experience and message presentation backed by the real WorkspaceProvider transport/session; the reference inspector rail renders real Agent evidence and critic state.
records/: Previous real conversation timeline retained temporarily for adapter work.
insights/: Previous explicit empty state retained temporarily for later service integration.
chart/chart-context.tsx: Reference selected/hovered palace state.
chart/chart-hero.tsx: Reference editorial chart header and quick-locate controls.
chart/destiny-chart.tsx: Reference radial twelve-palace renderer currently driven by static `PALACES`.
chart/palace-inspector.tsx: Reference palace inspector currently driven by static `PALACES`.
chart/chart-provider.tsx, chart-page.tsx: Previous real chart presentation retained temporarily for iztro adapter work.

[PROTOCOL]: Update this header when changed, then check AGENTS.md
