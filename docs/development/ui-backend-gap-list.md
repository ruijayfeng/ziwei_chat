# UI / Backend Function Gap List

> Updated: 2026-07-16
> Baseline: the supplied `ziwei-chat-redesign` presentation has priority; backend capabilities adapt behind the accepted UI.

## Current Integration Summary

- Service and contract layer is healthy: targeted chart, chat, conversation, chat-client, chat-session, model-settings, and conversation-record tests pass 36/36.
- `WorkspaceProvider` still restores charts, stores model settings, sends `/api/chat` requests, deletes anonymous data, and owns real chat state.
- The transplanted home, chart, records, and insights routes currently render the reference data providers instead of consuming `WorkspaceProvider` or the existing API adapters.
- The settings route remains connected to real browser-local model settings and anonymous-data deletion.

## P0 — Blocks Core Use

| Route | UI capability | Current state | Existing backend source | Required adapter | Risk |
| --- | --- | --- | --- | --- | --- |
| `/chart` | Display the current iztro chart | Radial chart consumes static `PALACES` | `/api/chart`, `WorkspaceProvider.chartDisplay`, `ChartDisplayModel` | Add `ChartDisplayModel -> Palace[]` adapter and feed reference `ChartProvider` | High: displayed palaces are not the user's chart |
| `/chart` | Create or edit a chart | Reference chart page has no entry point for `ChartOnboarding` | `/api/chart` POST, `WorkspaceProvider.saveChart`, `ChartOnboarding` | Place onboarding/edit flow behind a reference-style sheet or route action without changing radial chart composition | High: a new user cannot create the chart shown by the UI |

## P1 — Important Integration

| Route | UI capability | Current state | Existing backend source | Required adapter | Risk |
| --- | --- | --- | --- | --- | --- |
| `/records` | Conversation history | Timeline consumes static `RECORDS` and `MONTHLY_REFLECTION` | `/api/conversations`, `loadConversationList`, `loadConversationMessages` | Convert conversation list/messages into reference timeline items and expanded detail content | Medium: route does not show persisted conversations |
| Global sidebar | Current chart summary | Sidebar contains a fixed sexagenary date and fixed chart card | `WorkspaceProvider.chartDisplay`, stored chart input | Add a small view-model adapter for the existing reference card | Medium: global chart identity is disconnected |
| `/chart` inspector | Palace facts and analysis | Palace content, traits, ratings, basis, and "实时生成" text come from static `PALACES` | Sanitized iztro display DTO plus Agent tools/evidence | Separate deterministic palace facts from optional Agent analysis and map both into the existing inspector sections | Medium: visual interaction works, content is static |
| Global | Anonymous profile chart restore | `WorkspaceProvider` fetches `/api/chart` in the background, but reference pages do not consume the result | `/api/chart` GET and browser chart session | Bind restored state to sidebar, chart route, and home ring after chart adapter exists | Medium: service work occurs without visible effect |

## P2 — Later Enhancement

| Route | UI capability | Current state | Existing backend source | Required adapter | Risk |
| --- | --- | --- | --- | --- | --- |
| `/insights` | Weekly letter and long-term patterns | Static `WEEKLY_LETTER` and `PATTERNS` | No sourced aggregation pipeline | Design an aggregation, provenance, generation-time, and critic contract before replacing static content | Medium: current content is presentation-only |
| `/records` | Monthly reflection | Static `MONTHLY_REFLECTION` | No monthly aggregation service | Derive only after conversation-history aggregation exists | Low |
| `/` | Current date and sexagenary calendar header | Fixed `2025年05月14日` and fixed stem/branch text | No dedicated calendar view service | Add deterministic date/calendar adapter | Low |
| `/` | Attachment button | Visual button only | No upload or attachment API | Define supported attachment types and request contract before enabling | Low |
| `/` | Background music button | Visual button only | No audio asset or playback state | Decide whether the control remains decorative or receives an owned audio source | Low |
| Global sidebar | "开通 Pro" button | Visual button only | No account, payment, or subscription backend | Product decision required before any behavior is added | Low |
| Default inspector | Clear anonymous data button | Default reference inspector button has no handler | Real deletion exists on `/settings` through `deleteAnonymousData` | Either bind the same action or link to settings | Low |

## Connected Today

| Surface | Status | Evidence |
| --- | --- | --- |
| Model settings | Connected | `/settings` consumes `WorkspaceProvider.modelSettings`, persists through the existing localStorage helpers, and keeps API keys browser-local |
| Anonymous-data deletion on settings | Connected | `/settings` calls `WorkspaceProvider.deleteAnonymousData`, which invokes `DELETE /api/chat` before clearing local state |
| Chart service | Available, not displayed by transplanted chart | `/api/chart` route tests pass; provider restore/save code remains present |
| Chat/Agent service | Connected | Reference `ChatProvider` adapts `WorkspaceProvider.chatSession`, `sendMessage`, retry, reset, busy, streaming, and failure states without changing the accepted UI |
| Chat evidence and critic | Connected | Reference `ChatInspector` renders the existing `EvidenceInspector` inside the accepted rail and mobile sheet, including runs, tools, chart facts, knowledge, critic, generation, and model status |
| Conversation service | Available, not used by transplanted records | `/api/conversations` and conversation adapter tests pass |
| Deterministic fallback, planner, tools, skills, RAG, analyst, critic | Preserved server-side | Agent evaluation and route code remain unchanged |

## Preserved Backend Capabilities

- iztro deterministic chart calculation
- `/api/chat` streaming and deterministic fallback
- Agent planner, tools, skill loading, RAG, analyst, critic, and response composition
- Evidence events
- Anonymous profile and browser-local model settings
- Conversation persistence

## Recommended Integration Order

1. Adapt `ChartDisplayModel` into the reference `Palace[]` model and restore chart creation/edit access.
2. Adapt persisted conversations into the reference records timeline.
3. Connect global sidebar chart state.
4. Leave insights and auxiliary controls until their service contracts exist.
