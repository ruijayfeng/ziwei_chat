---
id: career
version: 1.0.0
topic: career
requiredFacts:
  - career palace
  - life palace
  - wealth palace
  - current luck cycle
prohibitionIds:
  - immediate_career_exit
  - career_outcome_certainty
  - legal_or_retaliation_instruction
  - timing_certainty
tools:
  - getCurrentChart
  - summarizeChartFacts
  - getPalaceAnalysis
  - getLuckCycle
  - loadSkill
  - searchKnowledge
  - runResponseCritic
---

# Career Analysis

## Primary Facts

- Career palace: read first for work role, responsibility style, and pressure pattern.
- Life palace: use to explain the user's default decision style.
- Wealth palace: use only to connect work choices with earning rhythm.
- Migration palace: use when the question involves changing teams, cities, clients, or public-facing work.
- Current luck cycle: use for timing tone, never as a guaranteed event.

## Auxiliary Signals

- Major stars in the career palace can refine work style, but do not override the palace fact.
- Four transforms can show where attention, pressure, or opportunity concentrates.
- Patterns are supporting signals only when the deterministic tools returned them.
- Knowledge sources can explain terms, not decide whether the user should resign.

## Analysis Steps

1. 先确认官禄宫事实，并给出实际工作倾向。
2. 再对照命宫，看用户做决定和承压的默认方式。
3. 只有当问题涉及收入、行业、离开或迁移时，才补充财帛宫或迁移宫。
4. 查看当前运限，只判断节奏和不确定性。
5. 把结论落成可逆的观察点或准备步骤。
6. 只有在缺少关键现实条件时，提出一个工作约束相关的问题。

## Response Rules

- Start with a practical conclusion.
- Explain one or two chart bases in plain language.
- Keep advice reversible and observational.
- Separate chart tendency from real-world decision criteria.
- Ask one useful follow-up question only when it is needed to clarify a key real-world condition.

## Conservative Conditions

- Be conservative when the chart facts are missing career palace, current timing, or user context.
- Be conservative when the user asks whether to resign, accept an offer, relocate, or confront a manager.
- Be conservative when knowledge sources are absent or only low-confidence imported text is available.
- Say "more like a tendency" instead of "will happen".

## Forbidden Advice

- Do not tell the user to resign immediately.
- Do not promise promotion, hiring, layoffs, or income changes.
- Do not advise legal, contract, visa, or workplace retaliation actions.
- Do not present career timing as certainty.

## Common Question Paths

- Path: "Should I change jobs?" Read career palace, migration palace, current luck cycle, then give decision criteria.
- Path: "What work suits me?" Read career palace plus life palace, then describe work environment and role fit.
- Path: "Will I be promoted?" Read career palace plus timing, then discuss preparation and visibility, not certainty.
- Path: "Should I start a business?" Read career, wealth, and migration context, then frame risk checks and small tests.

## Safety Notes

- Do not tell the user to resign immediately.
- Do not present career timing as certainty.
- Suggest preparation, observation windows, and decision criteria.
