# General Chat Chart Status Design

## Problem

The browser sends the saved primary `chartInput` with every chat request, and the
server creates or restores that chart before routing the message. The general-chat
path does not carry this positive state into the model prompt. It only tells the
model not to assume that a chart is missing, while its deterministic fallback still
asks for birth date, birth time, and gender.

As a result, an unrelated conversational message can receive a false missing-birth-
data response even though the current anonymous profile already has a chart.

## Desired Behavior

- A general-chat turn with a current chart must explicitly tell the analyst that the
  chart is already set.
- The analyst must answer the user's current conversational message directly and
  must not ask for birth data or claim that the chart is missing.
- A general-chat turn without a chart should still answer normally. It should not
  interrupt unrelated conversation to request birth data.
- Missing-chart guidance remains valid only when the user explicitly requests an
  analysis that requires a chart and no current chart can be loaded.
- Existing chart-analysis routing, deterministic chart tools, and safety refusals
  remain unchanged.

## Design

Add an explicit `hasChart: boolean` field to the conversation-mode analyst context.
The chat route derives it after request chart creation/restoration rather than asking
the model to infer it from conversation text. For the current self-contained browser
request contract, a successfully supplied `chartInput` means `hasChart` is true. The
route may also use the request-scoped current chart lookup when extending persistence
later, without changing the analyst contract.

The conversation prompt renders one unambiguous status line:

- `当前命盘状态：已设置。` when `hasChart` is true.
- `当前命盘状态：未设置。` when `hasChart` is false.

Both states retain the rule that ordinary conversation should respond directly. The
general-chat fallback becomes neutral and no longer asks for birth data, so a model
failure or future fallback cannot reintroduce the false state.

## Data Flow

```text
saved browser chart
-> chartInput in POST /api/chat
-> create/restore request-scoped chart
-> hasChart boolean
-> conversation analyst context
-> explicit chart-status prompt
-> direct general-chat response
```

## Testing

Add route regression coverage for both states:

1. With `chartInput`, inspect the model request and assert that it contains the
   explicit `已设置` status and does not instruct the model to collect birth data.
2. Without `chartInput`, assert that the model request contains the explicit `未设置`
   status while still instructing the model to answer ordinary conversation directly.
3. Keep the existing missing-chart test for a chart-required intent to prove that
   legitimate onboarding guidance is preserved.

The test must fail before implementation because the current prompt has no explicit
chart-status line.

## Non-Goals

- No new persistence layer or database query.
- No changes to intent classification.
- No output string filtering or post-generation replacement.
- No redesign of the chat interface.
