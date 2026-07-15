# Redesign UI Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current single-shell UI with the approved dark editorial multi-route redesign while preserving the iztro chart engine, anonymous profile, real chat/Agent pipeline, evidence protocol, model settings, retrieval fallbacks, critic, and data deletion.

**Architecture:** Keep the existing API and Agent core authoritative. Add a sanitized full-chart display model beside `ChartSummary`, extract browser chat transport/state from the old shell, and place shared anonymous profile/chart/model/chat state under an App Router workspace layout. New pages consume typed adapters; mock chart facts, demo replies, records, and insights never enter production state.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, shadcn/Base UI, Motion for redesigned UI leaves, GSAP only for legacy isolated chart motion, iztro, Vitest, Drizzle/Postgres.

## Global Constraints

- Keep npm and all current root dependency versions; add only `motion`, and do not add Vercel Analytics.
- Keep `/api/chat` event ordering and critic gating: evidence, approved tokens, optional retryable error, done.
- Never return raw `chartJson` to the browser and never persist or log a model API key.
- Keep the anonymous profile model; do not add login, payment, or hosted-account requirements.
- Use LXGW WenKai 400/700 from jsDelivr with system fallbacks; do not request synthetic 500/600 weights.
- Keep the deep warm-indigo, cinnabar, editorial direction while removing starfields, outer glows, Sparkles decoration, fake live indicators, and perpetual decorative motion.
- Every personalized statement must come from iztro facts, the Agent response, persisted conversations, or an explicitly empty/unavailable state.
- Update L3 headers and the nearest `AGENTS.md` whenever responsibilities or members change.

---

### Task 1: Lock chart correctness and display contracts

**Files:**
- Modify: `tests/chart/summarize-chart.test.ts`
- Create: `tests/chart/chart-display.test.ts`
- Modify: `tests/app/chart-route.test.ts`
- Modify: `src/lib/chart/summarize-chart.ts`
- Create: `src/lib/domain/chart-display.ts`
- Create: `src/lib/chart/chart-display.ts`
- Modify: `src/app/api/chart/route.ts`
- Modify: `src/lib/AGENTS.md`

**Interfaces:**
- Consumes: raw server-only iztro `chartJson` and existing `CreateChartOutput`.
- Produces: `ChartDisplayModel { chartId, displayName, palaces }` and `ChartDisplayPalace { id, index, name, heavenlyStem, earthlyBranch, majorStars, minorStars, adjectiveStars, isBodyPalace, isLaiyinPalace }`.
- `/api/chart` adds `display` without removing `chart`, `chartId`, `displayName`, or `summary`.

- [ ] Add a failing regression proving `name === "命宫"` is selected as 命宫 and `isOriginalPalace` is exposed only as 来因宫.
- [ ] Add a failing fixture test proving the display mapper returns exactly 12 uniquely indexed palaces, real branches, separated star categories, mutagens, body-palace state, and no raw chart object.
- [ ] Add failing POST/GET API assertions for additive `display` and continued absence of `chartJson`.
- [ ] Run `npm run test -- tests/chart/summarize-chart.test.ts tests/chart/chart-display.test.ts tests/app/chart-route.test.ts` and confirm the new assertions fail for missing behavior.
- [ ] Implement the minimal mapper and route response changes; fix 命宫 lookup by palace name.
- [ ] Re-run the targeted tests, then `npm run typecheck`.
- [ ] Commit with `fix(chart): add truthful full chart display model`.

### Task 2: Establish the redesigned workspace shell and real routes

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css`
- Create: `src/app/(workspace)/layout.tsx`
- Move/replace: `src/app/page.tsx` -> `src/app/(workspace)/page.tsx`
- Create: `src/app/(workspace)/chart/page.tsx`
- Create: `src/app/(workspace)/records/page.tsx`
- Create: `src/app/(workspace)/insights/page.tsx`
- Create: `src/app/(workspace)/settings/page.tsx`
- Create: `src/components/workspace/app-layout.tsx`
- Create: `src/components/workspace/sidebar.tsx`
- Create: `src/components/workspace/mobile-chrome.tsx`
- Create: `src/components/workspace/nav-items.ts`
- Create: `src/components/workspace/motion-provider.tsx`
- Create: `src/components/brand/ziwei-logotype.tsx`
- Modify: `src/components/AGENTS.md`
- Modify: `PRODUCT.md`

**Interfaces:**
- Produces real routes `/`, `/chart`, `/records`, `/insights`, `/settings` with a shared responsive shell.
- The shell accepts optional inspector content and exposes a single accessible desktop/mobile inspector controller.

- [ ] Add failing route/navigation policy tests for all five hrefs, no `#` settings link, and inspector availability at desktop/tablet/mobile widths.
- [ ] Run the targeted UI tests and confirm failure.
- [ ] Install `motion` with npm; do not copy the redesign package manifest, pnpm lock, Analytics, or `ignoreBuildErrors`.
- [ ] Add the approved font links, scoped semantic tokens, focus styles, safe-area/dvh rules, and reduced-motion behavior.
- [ ] Port the layout/navigation/brand structure as production components; remove starfield/glow/fake controls and use an accessible dialog primitive for mobile inspector.
- [ ] Add honest records/insights empty pages and a settings route shell.
- [ ] Run targeted tests, lint, typecheck, and build.
- [ ] Commit with `feat(ui): add redesigned workspace shell and routes`.

### Task 3: Create shared browser workspace state and connect the real chart page

**Files:**
- Create: `src/components/workspace/workspace-provider.tsx`
- Create: `src/components/chart/chart-provider.tsx`
- Create: `src/components/chart/destiny-chart.tsx`
- Create: `src/components/chart/palace-inspector.tsx`
- Create: `src/components/chart/chart-page.tsx`
- Modify: `src/components/chart-onboarding.tsx`
- Modify: `src/lib/ui/chart-session.ts`
- Modify: `src/app/(workspace)/chart/page.tsx`
- Create/modify: `tests/ui/chart-session.test.ts`
- Create: `tests/ui/chart-display-view.test.ts`

**Interfaces:**
- `WorkspaceProvider` exposes profile id, chart input, display model, sync/load/save/error state, model settings, clear-data action, and current chat session.
- `ChartProvider` selects palaces by stable palace id, not array position.
- Three-way/four-direction geometry uses the real iztro index modulo 12.

- [ ] Add failing storage migration tests for legacy chart-only data, invalid nested palace data, and server fallback when local display is absent.
- [ ] Add failing view-model tests for stable id selection, trines `(i+4,i+8)`, opposition `(i+6)`, and evidence-backed active palaces.
- [ ] Run targeted tests and confirm expected failures.
- [ ] Implement provider bootstrap, chart GET/POST, storage validation/versioning, chart save errors, and immediate chart view updates.
- [ ] Port the chart visual as a controlled component using real display props; remove `rating`, `aiTraits`, fake summaries, and “实时 AI” copy.
- [ ] Preserve the chart onboarding form and expose an edit/reset affordance; reset must not falsely imply server deletion.
- [ ] Run targeted tests, typecheck, lint, and build.
- [ ] Commit with `feat(ui): connect redesigned chart to iztro data`.

### Task 4: Extract real chat transport and per-message evidence state

**Files:**
- Create: `src/lib/ui/chat-contract.ts`
- Create: `src/lib/ui/chat-client.ts`
- Create: `src/lib/ui/chat-session.ts`
- Create: `tests/ui/chat-client.test.ts`
- Create: `tests/ui/chat-session.test.ts`
- Modify: `src/lib/ui/chat-evidence.ts`
- Modify: `src/app/api/chat/route.ts`
- Modify: `src/lib/AGENTS.md`

**Interfaces:**
- `sendChatRequest(input, handlers, fetchImpl?)` sends profile, conversation, complete messages, current chart input, model settings, and evidence run id.
- `ChatSessionMessage` includes stable id, role, content, status, and its own `EvidenceState`.
- The client supports both static text responses and newline-framed `evidence|token|error|done` streams.

- [ ] Add failing tests for static response headers, split JSON lines, event ordering, per-message evidence binding, empty-answer failure, retry, and no carry-over of facts between runs.
- [ ] Run targeted tests and confirm failures.
- [ ] Extract shared request/evidence types from the API route without changing wire compatibility.
- [ ] Implement the transport and reducer with `AbortController`, one in-flight request, stable retry content, and final done handling.
- [ ] Keep final critic gating server-side and keep no-model behavior as an explicit configuration-required response.
- [ ] Run targeted tests plus the existing app chat route suite.
- [ ] Commit with `refactor(ui): extract real chat transport and session state`.

### Task 5: Connect redesigned chat, evidence inspector, and settings

**Files:**
- Create: `src/components/chat/chat-experience.tsx`
- Create: `src/components/chat/chat-composer.tsx`
- Create: `src/components/chat/message-bubble.tsx`
- Create: `src/components/chat/chat-inspector.tsx`
- Create: `src/components/chat/evidence-inspector.tsx`
- Create: `src/components/chat/home-chart-ring.tsx`
- Modify: `src/app/(workspace)/page.tsx`
- Modify: `src/app/(workspace)/settings/page.tsx`
- Reuse/modify: `src/components/model-settings-panel.tsx`
- Reuse: `src/components/markdown-message.tsx`
- Reuse: `src/components/report-message.tsx`
- Modify: `src/components/AGENTS.md`

**Interfaces:**
- Chat components consume the shared session; they do not call fetch or parse evidence directly.
- Inspector consumes the selected/latest assistant message evidence and exposes tools, facts, sources, critic, generation, and run steps.
- Settings continues to serialize the existing model/embedding format and legacy localStorage values.

- [ ] Add failing source/behavior tests for composer disabled/thinking/error/retry states, settings route, and full evidence section mapping.
- [ ] Run targeted tests and confirm failures.
- [ ] Port the visual components as controlled views, fix the conditional hook violation, textarea labeling, touch sizes, focus, and non-decorative motion.
- [ ] Connect the home chart ring only to real chart/evidence state; use a neutral empty state when no chart exists.
- [ ] Connect the model and embedding panels, correct privacy copy, and clear-data confirmation/reset behavior.
- [ ] Run UI, chat route, evidence, model settings, Markdown, reveal, and readable-copy tests.
- [ ] Commit with `feat(ui): connect real chat evidence and settings`.

### Task 6: Add truthful records and an honest insights boundary

**Files:**
- Modify: `src/lib/agent/chat-persistence.ts`
- Modify: `src/lib/db/chat-persistence.ts`
- Modify: `src/lib/agent/chat-runtime.ts`
- Create: `src/app/api/conversations/route.ts`
- Create: `src/lib/ui/conversation-records.ts`
- Create: `src/components/records/life-timeline.tsx`
- Create: `src/components/insights/insights-empty-state.tsx`
- Modify: `src/app/(workspace)/records/page.tsx`
- Modify: `src/app/(workspace)/insights/page.tsx`
- Modify: `tests/agent/chat-persistence.test.ts`
- Modify: `tests/db/chat-persistence.test.ts`
- Create: `tests/app/conversations-route.test.ts`

**Interfaces:**
- `listConversations(profileId)` and `listMessages(profileId, conversationId)` are profile-scoped and return only sanitized message metadata.
- Without Postgres read capability, Records displays current browser-session messages; Insights displays an unavailable/empty state, not fabricated personalized content.

- [ ] Add failing persistence and API tests for profile isolation, ordering, empty state, invalid ids, and database-unavailable behavior.
- [ ] Run targeted tests and confirm failures.
- [ ] Implement profile-scoped read methods and route; update conversation timestamps/titles only from real messages.
- [ ] Port the timeline as a props-only view and connect real current/persisted records.
- [ ] Keep weekly letters/patterns absent until a separately sourced insight pipeline exists.
- [ ] Run targeted tests, typecheck, lint, eval, and build.
- [ ] Commit with `feat(chat): add truthful conversation records`.

### Task 7: Remove mocks and legacy UI, align documentation, and complete verification

**Files:**
- Remove after usage audit: superseded `src/components/app-sidebar.tsx`, `chart-disc*.tsx`, `chart-workspace.tsx`, `chat-panel.tsx`, `evidence-drawer.tsx`, `records-workspace.tsx`, `settings-workspace.tsx`, `topics-workspace.tsx`, `ziwei-chat-shell.tsx`
- Remove from migrated runtime: demo reply/reference constants and mock chart/workspace data
- Modify: `AGENTS.md`
- Modify: `src/components/AGENTS.md`
- Modify: `src/lib/AGENTS.md`
- Modify: `docs/architecture/tool-contracts.md`
- Modify: `docs/architecture/data-model.md`
- Modify: `docs/development/project-status.md`
- Modify: `README.md`

**Interfaces:**
- All public routes use the redesigned shell and real adapters; APIs remain backward compatible except additive responses/read endpoints.

- [ ] Use `rg` to prove no runtime import references `DEMO_REPLY`, `DEMO_REFS`, mock `PALACES`, `RECORDS`, `PATTERNS`, `WEEKLY_LETTER`, or removed legacy components.
- [ ] Remove only confirmed-dead production files; do not delete the user-provided `ziwei-chat-redesign/` reference directory.
- [ ] Update L1/L2/L3 documentation and explain real storage/privacy behavior and remaining insights gap.
- [ ] Run `npm run lint`, `npm run typecheck`, `npm run test`, `npm run eval:agent`, and `npm run build`.
- [ ] Run browser QA at 390, 1024, 1280, and 1536 pixels for chart creation/reload, no-model chat, real-model success/failure, evidence access, settings, deletion, records, keyboard focus, and reduced motion.
- [ ] Commit with `chore(ui): complete redesign migration and remove mocks`.

