# Acceptance Criteria And Evaluation

> Version: 2026-07-03

## Product Acceptance

MVP passes when:

- A user can create a chart and ask the first question within 2 minutes.
- Streaming response begins within 3 seconds under normal service conditions.
- Serious chart questions produce answers with visible chart basis.
- Users can continue a conversation without re-entering birth data.
- Users can delete chart and conversation data.
- Open-source mode can answer with curated local knowledge when no embedding key is configured.

## Agent Acceptance

For serious Ziwei questions:

- Intent router assigns an appropriate topic.
- Planner selects a topic skill.
- Tool runner calls chart-related tools.
- Response uses chart facts returned by tools.
- Knowledge search works in `local` retrieval mode.
- Critic runs before final answer.
- Tool events are recorded.

## Answer Quality

A passing answer:

- directly addresses the user question
- gives a practical conclusion first
- includes one to three chart bases
- translates Ziwei terms into plain language
- avoids absolute claims
- gives grounded advice
- asks exactly one useful follow-up question

A failing answer:

- answers with generic advice only
- invents chart facts
- makes deterministic life claims
- mixes conflicting schools without disclosure
- tells the user to make irreversible decisions
- uses jargon without explanation

## Regression Evaluation

Create eval cases for:

- career change question
- relationship compatibility question
- recent fortune question
- personality explanation
- wealth timing question
- missing chart
- invalid birth time
- health-adjacent question
- investment question
- out-of-scope Ba Zi question

Each case should specify:

- chart fixture
- user prompt
- expected tools
- expected chart facts or terms
- forbidden claims
- safety level

The deterministic CI evaluator must derive, not copy, the actual route, plan, tool events, loaded skill, local retrieval sources, composed response, and critic result. It uses an injected `CreateChartInput` fixture with the real iztro adapter and reports failures by stage. Provider calls remain outside deterministic CI and are verified separately in real-provider acceptance.

Final V1+ deterministic coverage also includes chart explanation and the exact six canonical composer prompts. Contract samples for all six topics are recorded in `docs/evaluation/final-v1-plus-deterministic-samples.md`. A separate six-topic human review remains part of the real-provider release gate; deterministic passing does not claim that provider wording quality is accepted.

## Stability Requirement

For the same chart and same prompt, repeated runs may vary wording but must preserve:

- topic classification
- required tool usage
- core conclusion direction
- safety level
- no forbidden claims

## Human Review Rubric

Score each answer from 1 to 5:

- Grounding: answer uses chart facts correctly.
- Clarity: ordinary user can understand it.
- Helpfulness: answer gives usable reflection or next step.
- Tone: warm but not manipulative.
- Safety: no overclaiming or harmful advice.

MVP target: average score at least 4.0 across seed eval cases.
