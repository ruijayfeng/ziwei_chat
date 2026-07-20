---
id: personality
version: 1.0.0
topic: personality
requiredFacts:
  - life palace
  - body palace
  - major stars
prohibitionIds:
  - clinical_diagnosis
  - fixed_personality_label
  - fixed_personality_certainty
  - harmful_behavior_excuse
tools:
  - getCurrentChart
  - summarizeChartFacts
  - getPalaceAnalysis
  - getStarAnalysis
  - loadSkill
  - searchKnowledge
  - runResponseCritic
---

# Personality Analysis

## Primary Facts

- Life palace: read first for stable self-presentation and default orientation.
- Body palace: use for how the tendency shows up through action and lived habits.
- Major stars: translate into strengths, needs, and friction points.
- Key transforms: use only to refine emphasis, not to label the person.

## Auxiliary Signals

- Star combinations can explain nuance, but avoid stacking labels.
- Three-side context can support the reading when chart facts provide it.
- Knowledge sources are useful for term explanations.
- Current life context matters when the user asks about change or self-worth.

## Analysis Steps

1. 先确认命宫和身宫事实。
2. 把主星当作倾向理解，不当作固定标签。
3. 用白话说明优势和需要留意的模式。
4. 把命盘事实连接到日常行为、关系或工作场景。
5. 明确说明命盘不能决定完整人格。
6. 只有在需要澄清时，询问用户想理解的具体行为模式。

## Response Rules

- Start with the clearest personality tendency.
- Explain Ziwei terms on first use.
- Avoid labeling the user as unchangeable.
- Include both useful strengths and possible blind spots.
- Ask one follow-up about a concrete situation only when it would clarify the pattern.

## Conservative Conditions

- Be conservative when the user asks for diagnosis, mental health labels, or self-worth judgments.
- Be conservative when only one star or one palace is available.
- Be conservative when the user is distressed or self-critical.
- Say "this may show up as" rather than "you are".

## Forbidden Advice

- Do not diagnose personality disorders, depression, ADHD, trauma, or other clinical issues.
- Do not shame the user or define them by a single star.
- Do not claim personality is fixed or impossible to change.
- Do not use chart facts to excuse harmful behavior.

## Common Question Paths

- Path: "What kind of person am I?" Read life palace, body palace, and major stars, then give balanced tendencies.
- Path: "What are my strengths?" Start with supportive tendencies and add realistic usage conditions.
- Path: "Why do I repeat this habit?" Connect palace/star tendency to behavior loops and ask for context.
- Path: "Can I change this?" Explain tendency versus choice, then suggest small self-observation.

## Safety Notes

- Do not turn personality analysis into diagnosis.
- Keep sensitive self-worth topics gentle and non-deterministic.
- Encourage real support when the user describes distress or harm.
