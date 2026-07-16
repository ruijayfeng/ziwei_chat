# UI / Backend Function Gap List

> Updated: 2026-07-16
> Baseline: the supplied `ziwei-chat-redesign` presentation has priority; backend capabilities adapt behind the accepted UI.

## Current Integration Summary

- Service and contract layer is healthy: the full test gate passes 52 files / 225 tests, and Agent evaluation passes 10/10.
- `WorkspaceProvider` restores and saves charts, stores model settings, sends `/api/chat` requests, deletes anonymous data, and owns real chat/evidence state.
- The transplanted chat and chart routes now consume real service state behind the accepted reference UI; records and insights still use reference presentation data.
- The settings route remains connected to real browser-local model settings and anonymous-data deletion.

## P0 — Blocks Core Use

No open P0 integration gaps remain for the accepted chat and chart core loop.

## P1 — Important Integration

| Route | UI capability | Current state | Existing backend source | Required adapter | Risk |
| --- | --- | --- | --- | --- | --- |
| `/records` | Conversation history | Timeline consumes static `RECORDS` and `MONTHLY_REFLECTION` | `/api/conversations`, `loadConversationList`, `loadConversationMessages` | Convert conversation list/messages into reference timeline items and expanded detail content | Medium: route does not show persisted conversations |
| Global sidebar | Current chart summary | Sidebar contains a fixed sexagenary date and fixed chart card | `WorkspaceProvider.chartDisplay`, stored chart input | Add a small view-model adapter for the existing reference card | Medium: global chart identity is disconnected |

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
| Current chart display | Connected | `ChartDisplayModel -> Palace[]` adapter feeds the unchanged reference radial chart with real palace indices, branches, stars, four transforms, brightness, body-palace, and Laiyin-palace facts |
| Chart create/edit | Connected | Reference-style right sheet reuses `ChartOnboarding`, `WorkspaceProvider.saveChart`, `resetLocalChart`, and `/api/chart`; no duplicate transport or form contract was added |
| Anonymous chart restore | Connected on `/chart` | Browser/server-restored `WorkspaceProvider.chartDisplay` replaces the explicitly labelled demo fallback and resets selection to the real 命宫 |
| Unsupported chart interpretation fields | Explicit gap state | The inspector keeps the reference sections but does not fabricate ratings, personality traits, recommendations, or AI analysis when the DTO has no source; it directs interpretation to the Agent conversation |
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

1. Adapt persisted conversations into the reference records timeline.
2. Connect global sidebar chart state.
3. Leave insights and auxiliary controls until their service contracts exist.
