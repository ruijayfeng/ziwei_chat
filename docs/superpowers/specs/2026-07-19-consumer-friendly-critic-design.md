# Consumer-Friendly Critic Design

> Date: 2026-07-19
> Scope: Final response critic severity, revision, and user-facing failure copy

## Problem

The current final critic treats every issue as blocking. It also uses a lexical
closed-world check: any palace or major-star term in the chart-basis section
that is not present in the topic-scoped fact subset can reject the whole answer.
This protects against hallucinated chart facts, but it also blocks useful
consumer explanations for formatting differences, extra context, minor field
mismatches, and general Ziwei knowledge.

Ziwei Chat serves ordinary interested users rather than professional Ziwei
students. The product should answer naturally and usefully while remaining
anchored to the current deterministic chart.

## Goals

- Block only answers that materially detach from or contradict the current
  chart, violate safety boundaries, or make prohibited high-stakes claims.
- Allow natural-language interpretation, general doctrine, comparison,
  practical advice, and minor structural variation.
- Keep non-blocking quality issues visible in evidence without interrupting the
  answer.
- Attempt one revision only for blocking issues.
- Distinguish provider failure from critic rejection in user-facing copy.
- Preserve deterministic chart creation and tool ownership; the model never
  recalculates the chart.

## Non-Goals

- Removing the final critic.
- Treating RAG doctrine as a deterministic fact about the user's chart.
- Allowing invented palace-star-transform combinations to be stated as current
  chart facts.
- Allowing absolute predictions, clinical diagnosis, financial instructions,
  or other prohibited high-stakes advice.
- Requiring professional Ziwei terminology or a rigid report template.

## Severity Model

The critic produces issues with a severity:

```ts
type CriticIssue = {
  code: string;
  message: string;
  severity: "blocking" | "warning";
};
```

The public `CritiqueResult` retains its existing compatibility fields and adds
structured issues:

```ts
type CritiqueResult = {
  passed: boolean;
  issues: string[];
  requiredRevision: boolean;
  structuredIssues: CriticIssue[];
};
```

`passed` means there are no blocking issues. Warnings do not make `passed`
false. `requiredRevision` is true only when a blocking issue exists.

## Blocking Issues

### Missing Chart Grounding

A serious Ziwei answer is blocked when no deterministic chart facts are
available, or required chart tools did not run, unless the response is an
explicit chart-setup prompt.

### Direct Chart Contradiction

Only factual assertions about the current chart are checked as a closed set.
The critic blocks when an answer states a concrete current-chart relationship
that tools did not return, for example:

- `你的迁移宫有紫微`
- `你命宫化禄`
- `你的官禄宫是杀破狼格`

The check operates on assertion patterns that bind the user/current chart to a
palace, star, transform, or pattern. Merely mentioning a term is not enough to
block.

Allowed examples:

- `迁移宫通常也可以作为后续观察方向`
- `如果迁移宫出现紫微，一般会有不同解释；但这不是本次命盘依据`
- `巨门常被解释为重视辨析和表达`
- `从当前官禄宫事实延伸看，你可以观察工作沟通方式`

### Safety And Certainty

The existing checks remain blocking for:

- unqualified absolute/fatalistic language;
- prohibited financial, medical, legal, relationship, or irreversible advice;
- active skill prohibition matches;
- refusal responses containing prohibited instructions.

## Warning Issues

Warnings are recorded but never block or trigger revision:

- the answer has zero or multiple follow-up questions;
- the preferred headings are missing or reordered;
- the answer is shorter or longer than requested;
- a palace or star is mentioned as general knowledge without being part of the
  current topic-scoped fact subset;
- wording does not exactly match `rawText`;
- the answer makes a reasonable interpretive extension from known chart facts;
- an answer could use clearer qualifiers or source separation but does not
  assert a false current-chart relationship.

Warnings appear only in evidence. The consumer-facing answer is still shown.

## Current-Chart Assertion Detection

Replace the current term-presence scan with relationship detection.

The critic first reads the `命盘依据` section when present. When headings are
absent, it checks the full answer conservatively.

It then detects statements that bind current ownership markers to chart terms:

- ownership markers: `你的`, `你命盘`, `本命`, `命盘中`, `盘里`, `当前命盘`;
- relationship verbs: `有`, `坐`, `落`, `见`, `化`, `为`, `是`, `形成`,
  `构成`, `位于`;
- chart terms: palace, major star, transform, or known detected pattern.

An assertion is blocking only if the claimed relationship cannot be supported
by one of the deterministic `ChartFact` records. General doctrine and
hypothetical language such as `如果`, `通常`, `一般`, `可能用于观察`, and
`并非本次命盘事实` are excluded from blocking.

The implementation starts with palace-star and palace-transform assertions,
which cover the observed failure and highest-risk hallucinations. Pattern
assertions use `ChartFact.patterns`. It does not attempt unrestricted Chinese
semantic parsing.

## Revision Flow

The model receives one revision request only when blocking issues exist. The
revision prompt must:

- list deterministic chart facts as the authoritative current-chart data;
- identify the blocking issue codes;
- instruct the model to remove or qualify only unsupported current-chart
  assertions;
- allow natural interpretation, general doctrine, and practical suggestions;
- avoid forcing verbatim copying or rigid headings;
- preserve one useful answer rather than returning a refusal.

If the revision has only warnings, it is shown. If a blocking issue remains,
the answer is withheld.

## User-Facing Errors

Provider and critic failures must not share the same message.

- Provider/network/model protocol failure:
  `模型没有完成回答，请检查模型名称、API Key 和网络后重试。`
- Final critic blocking after revision:
  `这次回答与当前命盘事实存在冲突，已停止展示，请重试。`

The evidence panel shows whether failure came from the provider or blocking
critic and lists sanitized issue messages. It does not expose prompts, raw chart
JSON, provider response bodies, credentials, or source bodies.

## Evidence

Critic evidence states:

- `passed`: no blocking issues;
- `passed_with_warnings`: answer shown with non-blocking issues;
- `needs_review`: blocking issues remain and answer is withheld.

The existing presentation can initially map `passed_with_warnings` to a passed
tone while displaying `warnings.join("；")` as detail. No new consumer-facing
badge is required.

## Tests

### Critic Unit Tests

- blocks `你的迁移宫有紫微` when that relationship is absent;
- blocks an unsupported palace-transform assertion;
- allows an unknown palace/star in general doctrine or a hypothetical example;
- allows interpretive extension from a known star or palace;
- converts follow-up count and structure deviations to warnings;
- keeps absolute language and prohibited advice blocking;
- reports `passed: true` and `requiredRevision: false` when only warnings exist.

### Route Tests

- does not attempt revision for warnings;
- shows an answer that passes with warnings;
- attempts one revision for blocking chart contradictions;
- shows a revised answer when blocking issues are removed;
- emits critic-specific error copy when blocking issues remain;
- retains provider-specific error copy for provider failure;
- preserves final evidence in every path.

### Browser Acceptance

Using the current saved chart and `deepseek-chat`:

1. Ask `我目前的事业方向，适合关注什么？`.
2. Confirm deterministic chart facts, skill, and RAG run.
3. Confirm a natural answer is shown when it remains anchored to those facts,
   even if it contains interpretation or non-rigid formatting.
4. Confirm evidence reports passed or passed-with-warnings.
5. Confirm no `/api/chart` request, sidebar regression, console error, or
   credential/raw-data disclosure.

## Compatibility

The Chat request and event-stream shapes remain compatible. Existing string
`issues` remain available while structured issues are additive. Existing safety
and provider contracts remain blocking. No database migration is required.
