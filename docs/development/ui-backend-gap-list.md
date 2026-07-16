# UI / Backend Function Gap List

> Updated: 2026-07-16
> Baseline: the supplied `ziwei-chat-redesign` presentation has priority; backend capabilities adapt behind the accepted UI.

## Current Integration Summary

- Service and contract layer is healthy: the complete automated gate passes.
- `WorkspaceProvider` restores and saves charts with profile-scoped operation ownership, stores model settings, sends `/api/chat` requests, serializes chart persistence against anonymous-data deletion, and owns real chat/evidence state.
- The transplanted chat, chart, records, sidebar, date header, and default inspector now consume real service state behind the accepted reference UI; insights remains presentation-only.
- Settings and the default inspector share the same confirmed, loading/error-aware anonymous-data deletion operation.

## P0 — Blocks Core Use

No open P0 integration gaps remain for the accepted chat and chart core loop.

## P1 — Important Integration

| Route | UI capability | Current state | Existing backend source | Required adapter | Risk |
| --- | --- | --- | --- | --- | --- |
| No open P1 integration gaps | - | Records and the sidebar now use their real adapters | - | - | - |

## P2 — Later Enhancement

| Route | UI capability | Current state | Existing backend source | Required adapter | Risk |
| --- | --- | --- | --- | --- | --- |
| `/insights` | Weekly letter and long-term patterns | Static `WEEKLY_LETTER` and `PATTERNS` | No sourced aggregation pipeline | Design an aggregation, provenance, generation-time, and critic contract before replacing static content | Medium: current content is presentation-only |

## Connected Today

| Surface | Status | Evidence |
| --- | --- | --- |
| Model settings | Connected | `/settings` consumes `WorkspaceProvider.modelSettings`, persists through the existing localStorage helpers, and keeps API keys browser-local |
| Anonymous-data deletion on settings | Connected | `/settings` calls `WorkspaceProvider.deleteAnonymousData`, which invokes `DELETE /api/chat` before clearing local state |
| Anonymous-data deletion in settings and default inspector | Connected | Both surfaces use the shared controlled dialog, await `WorkspaceProvider.deleteAnonymousData`, prevent pending closes, retain failures in the active modal, and render `dataDeletionError` there |
| Conversation records | Connected | `/records` loads profile-scoped persisted conversations and current browser-session history through the records controller and displays selected-message details |
| Global sidebar chart | Connected | `sidebarChartSummary` adapts WorkspaceProvider restore/save state to loading, error, empty, and ready card states |
| Home current date | Connected | `currentCalendarDisplay` formats the current Asia/Shanghai date and refreshes at the next Shanghai midnight |
| Current chart display | Connected | `ChartDisplayModel -> Palace[]` adapter feeds the unchanged reference radial chart with real palace indices, branches, stars, four transforms, brightness, body-palace, and Laiyin-palace facts |
| Chart create/edit | Connected | Reference-style right sheet reuses `ChartOnboarding`, `WorkspaceProvider.saveChart`, `resetLocalChart`, and `/api/chart`; no duplicate transport or form contract was added |
| Anonymous chart restore | Connected on `/chart` | Browser/server-restored `WorkspaceProvider.chartDisplay` replaces the explicitly labelled demo fallback and resets selection to the real 命宫 |
| Unsupported chart interpretation fields | Explicit gap state | The inspector keeps the reference sections but does not fabricate ratings, personality traits, recommendations, or AI analysis when the DTO has no source; it directs interpretation to the Agent conversation |
| Chat/Agent service | Connected | Reference `ChatProvider` adapts `WorkspaceProvider.chatSession`, `sendMessage`, retry, reset, busy, streaming, and failure states without changing the accepted UI |
| Chat evidence and critic | Connected | Reference `ChatInspector` renders the existing `EvidenceInspector` inside the accepted rail and mobile sheet, including runs, tools, chart facts, knowledge, critic, generation, and model status |
| Conversation service | Connected | `/api/conversations` and the conversation records controller supply the transplanted records route |
| Deterministic fallback, planner, tools, skills, RAG, analyst, critic | Preserved server-side | Agent evaluation and route code remain unchanged |

## Preserved Backend Capabilities

- iztro deterministic chart calculation
- `/api/chat` streaming and deterministic fallback
- Agent planner, tools, skill loading, RAG, analyst, critic, and response composition
- Evidence events
- Anonymous profile and browser-local model settings
- Conversation persistence

## Recommended Integration Order

1. Leave insights unavailable until its sourced aggregation and critic contracts exist.
2. Attachments and background music are removed from V1 scope; do not restore controls until their product contracts are accepted.
