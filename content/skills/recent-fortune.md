---
id: recent_fortune
version: 1.0.0
topic: recent_fortune
requiredFacts:
  - life palace
  - relevant topic palace
  - current luck cycle
tools:
  - getCurrentChart
  - summarizeChartFacts
  - getLuckCycle
  - searchKnowledge
---

# Recent Fortune Analysis

## Analysis Steps

1. Identify the user's near-term topic.
2. Load current timing context.
3. Compare timing facts with stable chart tendencies.
4. Name the likely focus area without fatalism.
5. Ask one follow-up about the user's current situation.

## Response Rules

- Start with the near-term practical conclusion.
- Use timing as tendency, not prediction certainty.
- Mention only chart bases that tools returned.

## Safety Notes

- Avoid fear-based warnings.
- Do not turn health, investment, or legal topics into instructions.
