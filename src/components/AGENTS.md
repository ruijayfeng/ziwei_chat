# components/
> L2 | Parent: AGENTS.md

Member List
chart-onboarding.tsx: Client chart/profile management form with summary, sync state, save, and reset controls.
report-message.tsx: Structured response-protocol renderer with ordinary-prose fallback.
markdown-message.tsx: HTML-free Markdown renderer for ordinary and progressively revealed model answers.
model-settings-panel.tsx: Browser-local OpenAI-compatible model provider settings panel for Base URL, API key, and model name.
ui/: shadcn/Base UI component primitives owned by the project, used for buttons, cards, inputs, sheets, badges, separators, textareas, selects, and alert dialogs.
brand/ziwei-logotype.tsx: LXGW WenKai wordmark and restrained cinnabar seal used by desktop and mobile navigation.
workspace/app-layout.tsx: Shared App Router workspace shell with persistent sidebar, responsive inspector access, main scroll surface, and mobile tabs.
workspace/sidebar.tsx: Desktop route navigation and anonymous product identity.
workspace/mobile-chrome.tsx: Mobile/tablet top bar, accessible evidence sheet, and bottom route navigation.
workspace/motion-provider.tsx: Motion configuration that respects the operating-system reduced-motion preference.
workspace/nav-items.ts: Single typed source of truth for the five real workspace routes.
workspace/workspace-provider.tsx: Persistent anonymous profile, chart restore/save, model settings, and cross-route browser state boundary.
chat/: Redesigned real chat experience, controlled composer/messages, truthful chart ring, and per-message evidence inspector.
records/: Profile-scoped real conversation list and message timeline presentation.
insights/: Explicit empty boundary used until a sourced aggregation and critic pipeline exists.
chart/chart-provider.tsx: Stable-id selection and hover state for the current sanitized chart display model.
chart/destiny-chart.tsx: Interactive twelve-palace chart driven only by iztro display facts and real-index geometry.
chart/palace-inspector.tsx: Deterministic star, transformation, body-palace, Laiyin-palace, and relationship details for the selected palace.
chart/chart-page.tsx: Real chart route composition with loading, error, onboarding, chart, and local-reset states.

[PROTOCOL]: Update this header when changed, then check AGENTS.md
