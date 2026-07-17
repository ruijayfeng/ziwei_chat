# components/
> L2 | Parent: AGENTS.md

Member List
app-layout.tsx: Reference-owned viewport shell with ambient background, desktop sidebar, responsive inspector, and mobile chrome.
sidebar.tsx: Reference-owned desktop navigation and current-chart card bound through the real sidebar-chart adapter.
mobile-chrome.tsx: Reference-owned mobile top bar, bottom tabs, and animated inspector sheet.
nav-items.ts: Reference route order and icons; settings href is corrected to the real `/settings` route.
gradient-background.tsx: Reference ambient background, stars, vignette, and texture.
glass-card.tsx: Reference surface wrapper.
hero-header.tsx: Reference home editorial header with the current Shanghai calendar date; unsupported music control is removed from V1.
destiny-ring.tsx: Reference home destiny-ring renderer.
chat-composer.tsx: Reference home/docked composer presentation and theme prompts.
inspector-context.tsx: Inspector open/close contract used by reference shell controls.
inspector-panel.tsx: Reference default inspector that supplies its native trigger styling to the shared, boolean-aware anonymous-data deletion dialog.
clear-anonymous-data-dialog.tsx: Controlled shared deletion presentation that awaits the provider result, retains failures in-modal, and accepts caller-owned trigger styling.
motion-provider.tsx: Reference MotionConfig boundary respecting reduced-motion preferences.
brand/logotype.tsx: Reference LXGW WenKai/Fraunces wordmark.
brand-mark.tsx: Reference circular compass mark used by inspector surfaces.
brand/ziwei-logotype.tsx: Previous wordmark retained temporarily until old approximate shell cleanup.
chart-onboarding.tsx: Previous real chart/profile form retained for the future reference-style create/edit entry point.
report-message.tsx: Structured response-protocol renderer retained for real chat adaptation.
markdown-message.tsx: HTML-free Markdown renderer retained for real chat adaptation.
model-settings-panel.tsx: Real browser-local model provider controls, restyled with reference surfaces.
ui/: Project-owned shadcn/Base UI primitives.
workspace/workspace-provider.tsx: Persistent anonymous profile, serialized real chart restore/save ownership, model settings, real chat transport/evidence, and anonymous-data deletion boundary.
workspace/page-header.tsx: Reference editorial page header and ring glyph.
workspace/life-timeline.tsx: Reference records controller rendering persisted and current-browser conversation history with detail loading and retry state.
workspace/app-layout.tsx, sidebar.tsx, mobile-chrome.tsx, motion-provider.tsx, nav-items.ts: Previous approximate shell retained temporarily and no longer used by routes.
chat/: Reference chat experience and message presentation backed by the real WorkspaceProvider transport/session; the reference inspector rail renders real Agent evidence and critic state.
records/: Previous real conversation timeline retained temporarily for adapter work.
insights/insights-controller.tsx: Browser effect adapter plus injectable source/cache/API lifecycle coordinator with fingerprint-scoped stale refresh authorization, strict approved-report validation, cancellation, and explicit report lifecycle states.
insights/weekly-letter.tsx: Accepted reference weekly-letter composition backed only by approved report content and aggregation-derived provenance.
insights/pattern-list.tsx: Semantic sourced pattern observation articles with 40px topic-mapped Lucide icon treatment, backed only by approved report content and aggregation-derived provenance.
insights/insight-sources.tsx: Compact keyboard-accessible source provenance disclosure derived from the active aggregation, with an explicit browser-session label when no persisted timestamp exists.
insights/insights-empty-state.tsx: Honest insufficient-history presentation with current aggregation eligibility details.
chart/chart-context.tsx: Reference palace collection plus selected/hovered state; initializes against the real 命宫.
chart/chart-hero.tsx: Reference editorial chart header, truthful data-source copy, quick-locate controls, and create/edit entry.
chart/chart-profile-sheet.tsx: Reference-style create/edit sheet reusing WorkspaceProvider and the existing ChartOnboarding form.
chart/destiny-chart.tsx: Reference radial twelve-palace renderer driven by context palaces from the real adapter or explicit demo fallback.
chart/palace-inspector.tsx: Reference palace inspector showing deterministic iztro facts and explicit unsourced-analysis empty states.
chart/chart-provider.tsx, chart-page.tsx: Previous real chart presentation retained temporarily for later dead-code cleanup; active routes use the reference components.

[PROTOCOL]: Update this header when changed, then check AGENTS.md
