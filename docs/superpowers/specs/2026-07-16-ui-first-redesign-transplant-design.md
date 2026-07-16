# UI-First Redesign Transplant Design

## Decision

`D:\Ziwei\ziwei_chat\ziwei-chat-redesign` is the visual source of truth.

The migration order is fixed:

1. Transplant the redesigned UI into the main repository first.
2. Make every target route render with the reference layout, component structure, styling, motion, and responsive behavior.
3. Reconnect the existing real chart, chat, evidence, records, settings, Agent, critic, and RAG capabilities afterward.
4. When backend data does not fit the UI, adapt the data contract or backend boundary before changing the UI.

UI completeness takes priority over backend completeness during the first pass. Reference mock and static content may remain temporarily while a real data source is not yet connected.

## Alternatives Considered

### Direct transplant — selected

Copy the reference presentation components and page composition into `src/`, preserving their JSX and CSS as closely as the main Next.js project permits. Replace mock data only in later integration steps.

This best matches the required visual result and prevents implementation convenience from changing the design.

### Visual imitation — rejected

Rebuild components in the main project while using the reference only as inspiration. This is the approach used by the previous migration and caused major differences in layout, hierarchy, motion, chart rendering, and surface treatment.

### Backend-first reconstruction — rejected

Keep the current real-data UI and gradually restyle it. The current component structure is already materially different from the reference, so incremental styling would preserve the wrong ownership boundary and produce another approximation.

## Presentation Architecture

The reference presentation layer will be moved into the main repository with minimal structural changes:

- `app-layout`, `sidebar`, `mobile-chrome`, background, typography, surfaces, and motion establish the shared shell.
- `hero-header`, `destiny-ring`, `chat-composer`, and `components/chat/*` establish the home and conversation experience.
- `components/chart/*` establish the chart route and inspector presentation.
- `components/workspace/*` establish records and insights presentation.
- The existing settings functionality receives the same visual language because the reference has no settings page implementation.

The reference component API is treated as the default. Existing main-project providers and hooks must adapt to it instead of replacing its JSX.

## Data Integration Boundary

Backend integration happens behind the transplanted views:

- Chart adapter: sanitized iztro chart display data becomes the palace model consumed by the reference chart components.
- Chat adapter: the existing `/api/chat` stream drives the reference chat session state and message components.
- Evidence adapter: existing Agent events populate the reference inspector sections.
- Records adapter: `/api/conversations` populates the reference timeline and record layouts.
- Settings adapter: existing localStorage provider settings remain browser-local and are rendered inside the redesigned settings page.
- Insights adapter: static reference content remains until a real insights source is connected, then is replaced without restructuring the page.

No API key may be stored in the database or written to logs. Existing deterministic fallback, Agent pipeline, critic, RAG, and anonymous profile behavior remain available throughout integration.

## Migration Phases

### Phase 1: Exact visual shell

Move the global CSS, font setup, background, surfaces, motion provider, logotype, app layout, sidebar, mobile chrome, navigation, and route composition. Pages may still use reference static data.

Acceptance: the main repository and reference repository are visually equivalent at desktop and mobile breakpoints, excluding content produced by later backend integration.

### Phase 2: Exact route presentation

Move the home/chat idle state, chart renderer and inspector, records layout, insights layout, and all shared presentation components. Preserve reference spacing, sizing, typography, transitions, and responsive behavior.

Acceptance: `/`, `/chart`, `/records`, and `/insights` match the reference UI before real-data concerns are introduced.

### Phase 3: Real backend adaptation

Reconnect iztro, chat streaming, evidence events, model settings, records, anonymous profiles, deterministic fallback, critic, and RAG through adapters and providers.

Acceptance: real capabilities work without replacing the transplanted UI structure.

### Phase 4: Integration cleanup

Remove superseded approximation components, resolve temporary mock sources as real integrations become available, update documentation, and run the complete project gate.

## Validation

Each phase is checked at 390px, 1024px, 1440px, and 1536px against the reference repository.

Functional gates remain:

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run eval:agent`
- `npm run build`

Visual comparison is a required gate before claiming a route is migrated.
