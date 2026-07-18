# UI / Backend Integration Status

> Updated: 2026-07-17
> Authority: `docs/development/final-v1-plus-gap-register.md`
> Baseline: the accepted `ziwei-chat-redesign/` presentation remains the visual source; runtime services adapt behind it.

This file is a concise integration handoff. The G1-G10 register is the only
authoritative function-gap list and defines the evidence required for closure.

## Connected Surfaces

| Surface | Runtime source | Current contract |
| --- | --- | --- |
| Home and chat | `WorkspaceProvider`, `/api/chat` | Six canonical topics, real model/setup/error states, event-framed evidence, retry, and current-session continuity |
| Chart | `/api/chart`, iztro, chart persistence | Explicit loading/empty/error/retry/real states; create, restore, edit, save, and delete use the anonymous profile |
| Records | `/api/conversations`, browser session | Profile-scoped persisted conversations plus current-session history, validated details, retry, and stale-request ownership |
| Insights | source loader, aggregator, report API, critic, cache | Real loading/insufficient/ready/stale/error states, profile/fingerprint ownership, approved reports, and provenance disclosure |
| Settings and inspector | browser-local model settings, `DELETE /api/chat` | One confirmed remote-first anonymous deletion operation; failures preserve local state and remain visible |
| Sidebar and header | chart adapter, Shanghai calendar helpers | Real chart summary and current date; no personalized fixture fallback |

## Preserved Service Boundaries

- iztro owns deterministic chart and horoscope calculation.
- Vercel AI SDK/OpenAI-compatible providers own model generation; approved text
  is emitted only after critic validation.
- Planner, tools, executable skills, local/optional pgvector retrieval, critic,
  and evidence stay server-owned.
- Postgres is the system of record when configured. Without `DATABASE_URL`,
  server routes are stateless and the anonymous browser workspace remains the
  honest local baseline.
- The browser stores model credentials locally and never persists them as
  conversation, evidence, source, or insight data.

## Remaining Release Work

No known UI/backend implementation adapter is intentionally missing. Final V1+
still requires the current Task 11-13 evidence: complete automated and Postgres
gates, four-width browser acceptance, timed real-provider chat and Insights,
security/log inspection, and final G1-G10 audit.

Attachments, music, accounts, payments, subscriptions, community, multi-chart,
multi-school, advanced reports, and dedicated health/family/children/home flows
are explicit non-goals, not integration gaps.
