# Chat Reliability Design

> Date: 2026-07-19
> Scope: Chat chart hydration, DeepSeek model validation, and actionable failure messages

## Problem

Chart questions can fail before analysis begins because `/api/chat` treats the
browser-provided chart as a new primary-chart save. That write uses the Agent
tool persistence timeout even though `/api/chart` already owns durable chart
saves. With a remote Postgres connection slower than five seconds, Chat returns
a generic failure before chart facts, skills, knowledge, or the critic run.

The same generic UI message also hides later model-provider failures. The
current browser is configured with `deepseek-v4-pro`, while the project's
DeepSeek contract and default use `deepseek-chat`.

## Goals

- A saved browser chart can hydrate a Chat request without another database
  write.
- Stateless mode keeps working because each Chat request can still rebuild the
  deterministic iztro chart from its browser-owned input.
- Durable primary-chart writes remain owned by `/api/chart`.
- Unsupported DeepSeek model names are rejected with an actionable settings
  message before a Chat request is sent.
- Chat failures expose a safe, user-readable stage without leaking provider
  responses, credentials, raw chart JSON, or knowledge bodies.
- Existing chart grounding, tool evidence, critic gating, retry, and anonymous
  deletion contracts remain intact.

## Non-Goals

- Automatically changing a user-entered model name.
- Adding model discovery or a provider health-check endpoint.
- Changing the Postgres schema or migrations.
- Making Chat message persistence blocking.
- Weakening final critic gating or returning deterministic drafts as if they
  were completed model answers.

## Design

### Request-Local Chart Hydration

Add a request-local chart hydration operation to the Agent tool layer. It uses
the existing iztro `createChart` adapter and populates only the request-scoped
chart maps. It does not call `ChartPersistence.savePrimaryChart`.

`/api/chat` uses this operation when `body.chartInput` exists. The route then
continues through the existing intent, planner, chart-fact, supplemental-tool,
skill, RAG, deterministic critic, model, and final critic pipeline.

`/api/chart` remains the only browser-facing primary-chart save boundary and
continues to use the explicit 15-second save budget. Server-side restoration
still uses `getCurrentChart` when no browser chart is supplied.

This preserves one ownership rule:

```text
edit/create chart -> /api/chart -> Postgres
ask question      -> /api/chat  -> request-local iztro hydration
reload without browser chart    -> Postgres restore
```

### Model Validation

Model settings validation gains a provider-specific issue for DeepSeek. A
DeepSeek configuration is valid for Chat only when the model is one of the
explicitly supported public aliases:

- `deepseek-chat`
- `deepseek-reasoner`

The settings screen keeps the user's entered value and shows a direct message
that recommends `deepseek-chat`. Chat submission is blocked while this issue is
present. Other OpenAI-compatible providers retain their existing free-form
model field because their model catalogs are deployment-specific.

Validation is a pure UI/domain helper so it can be tested independently and
used consistently by the settings status and Chat request boundary.

### Error Contract

Pre-stream HTTP failures continue to expose `X-Ziwei-Error-Stage`. The browser
maps known stages to concise messages. The chart hydration stage uses a distinct
`chart_hydration` name rather than `create_chart`, because it performs no save.

Model-stream failures already arrive as structured event-stream errors. Their
safe message is changed from the generic analysis failure to:

`模型没有完成回答，请检查模型名称、API Key 和网络后重试。`

The evidence panel remains the detailed diagnostic surface. It may show a
sanitized model error category and timing, but never endpoint credentials,
provider response bodies, prompts, raw chart JSON, or source bodies.

Known pre-stream messages include:

- `chart_hydration`: `命盘读取失败，请重新保存出生信息后重试。`
- `restore_chart`: existing chart restore guidance.
- `planner`, `supplemental_tools`, `skill`, `rag`, and critic stages: existing
  stage-specific guidance.
- unknown server stage: generic retryable analysis message.

### Persistence

Chat message persistence remains best-effort. Its three-second timeout may
produce server warnings under a slow database, but it must not fail the active
answer. This design does not increase that timeout because doing so would add
latency without improving the analysis path.

## Failure Handling

- Invalid browser chart input returns a retryable `chart_hydration` error and
  does not touch the stored primary chart.
- Missing browser chart input falls back to the existing Postgres restore path.
- Unsupported DeepSeek model settings block send and keep the composer content.
- Provider HTTP, timeout, idle, truncation, incomplete-stream, empty-response,
  and final-critic failures remain retryable and retain final evidence.
- A failed Chat request never deletes or replaces the last usable chart.

## Tests

### Unit and Contract Tests

- Request-local hydration creates a real chart in request stores without
  calling persistence.
- `/api/chat` with `chartInput` does not invoke primary-chart persistence.
- `/api/chart` still invokes primary-chart persistence and returns its stable
  chart identity.
- DeepSeek accepts `deepseek-chat` and `deepseek-reasoner` and rejects
  `deepseek-v4-pro` with actionable copy.
- Non-DeepSeek OpenAI-compatible model names remain free-form.
- `chart_hydration` and model-stream failures map to their intended messages.
- Existing provider, critic, stateless, Postgres, and deletion tests remain
  green.

### Browser Acceptance

Using the current profile and saved chart:

1. Set the DeepSeek model to `deepseek-chat` with the existing browser-owned
   credentials.
2. Ask a chart question.
3. Confirm `/api/chat` does not call `/api/chart` and does not fail at chart
   hydration.
4. Confirm evidence shows deterministic chart tools and facts before model
   generation.
5. Confirm a successful provider response passes the final critic and renders
   an answer, or a provider failure shows the model-specific retry message and
   retains evidence.
6. Confirm the sidebar chart remains ready and the browser console has no
   errors.

## Compatibility

The public request shape does not change. Existing browser chart storage,
Postgres rows, stateless operation, and API clients remain compatible. The only
behavioral change is removal of an unintended duplicate chart write from Chat
and stricter validation for the built-in DeepSeek provider.
