---
id: chart_explanation
version: 1.0.0
topic: chart_explanation
requiredFacts:
  - life palace
  - major stars
  - key palaces
prohibitionIds:
  - single_factor_determinism
  - undisclosed_school_mixing
  - invented_chart_fact
  - chart_explanation_prediction
tools:
  - getCurrentChart
  - summarizeChartFacts
  - getPalaceAnalysis
  - getStarAnalysis
  - loadSkill
  - searchKnowledge
  - runResponseCritic
---

# Chart Explanation

## Primary Facts

- Requested chart fact: explain only the palace, star, transform, or pattern the user asked about.
- Life palace: use as the starting point when the user asks "how do I read this chart".
- Major stars: explain as symbolic tendencies, not direct outcomes.
- Key palaces: use topic palaces only when the user asks about that life area.

## Auxiliary Signals

- Four transforms can explain movement of attention, pressure, resource, or friction.
- Patterns can be named only when deterministic chart facts include them.
- Knowledge sources should define terms and source policy.
- Schools should not be mixed silently.

## Analysis Steps

1. 先确认用户问的是哪个命盘事实或术语。
2. 一次只解释一个概念。
3. 把宫位、星曜和格局词连接到白话例子。
4. 展示这个解释背后的确定性命盘依据。
5. 除非用户主动要求，否则不延伸成完整主题分析。
6. 最后追问用户下一步想看哪个位置。

## Response Rules

- Start with a short plain-language explanation.
- Keep terminology lightweight.
- Show the chart basis behind each explanation.
- Say when a term needs surrounding palaces or stars before interpretation.
- End with one follow-up that offers the next chart area.

## Conservative Conditions

- Be conservative when the user asks for a whole-life conclusion from one star.
- Be conservative when chart facts are missing or the term was not returned by tools.
- Be conservative when retrieved sources conflict or are low confidence.
- Explain uncertainty as part of chart reading.

## Forbidden Advice

- Do not imply that a single star decides the whole chart.
- Do not mix interpretation schools without disclosure.
- Do not invent star positions, palaces, transforms, or patterns.
- Do not provide predictions in this workflow; route timing questions to the recent-fortune workflow so matching luck-cycle facts are loaded first.

## Common Question Paths

- Path: "What does this palace mean?" Define the palace, then say what facts are needed for interpretation.
- Path: "What does this star mean?" Explain tendency, then remind it depends on palace and combinations.
- Path: "How do I read my chart?" Start with life palace, then offer career/relationship/wealth paths.
- Path: "What is this pattern?" Explain the pattern only if tools returned it, otherwise say it is not confirmed.

## Safety Notes

- Do not imply that a single star decides the whole chart.
- Do not mix interpretation schools without disclosure.
- Do not invent chart facts that deterministic tools did not return.
