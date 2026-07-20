---
id: wealth
version: 1.0.0
topic: wealth
requiredFacts:
  - wealth palace
  - career palace
  - current luck cycle
prohibitionIds:
  - financial_action_instruction
  - financial_outcome_certainty
  - professional_financial_boundary
  - exact_income_prediction
tools:
  - getCurrentChart
  - summarizeChartFacts
  - getPalaceAnalysis
  - getLuckCycle
  - loadSkill
  - searchKnowledge
  - runResponseCritic
---

# Wealth Analysis

## Primary Facts

- Wealth palace: read first for earning rhythm, money handling, and pressure points.
- Career palace: use to connect money with work role and income source.
- Life palace: use to explain risk appetite and decision habits.
- Current luck cycle: use as timing tone for caution, focus, or consolidation.

## Auxiliary Signals

- Four transforms can show attention, pressure, or volatility around money topics.
- Stars in wealth and career palaces refine earning style.
- Patterns can support but not replace risk analysis.
- Knowledge sources explain money-related terms, not investment choices.

## Analysis Steps

1. 先确认财帛宫事实，并说明金钱节奏倾向。
2. 对照官禄宫，区分收入来源、支出习惯和投资问题。
3. 补充命宫，用来观察决策方式和风险习惯。
4. 查看运限，判断现在更适合行动、复盘还是保守。
5. 把解读落成预算、风险意识或规划行为。
6. 只有在缺少关键背景时，询问具体的金钱决策场景。

## Response Rules

- Start with the practical money-pattern conclusion.
- Explain chart terms in plain language.
- Avoid investment commands.
- Ground advice in chart facts and uncertainty.
- Clearly separate wealth tendency from financial advice.
- Ask one follow-up about income, spending, debt, or risk only when it is needed.

## Conservative Conditions

- Be conservative for investing, borrowing, leverage, debt, gambling, or business speculation.
- Be conservative when the user asks for timing to buy, sell, or all-in.
- Be conservative when only low-confidence imported knowledge is retrieved.
- Use "risk awareness" and "decision criteria" language.

## Forbidden Advice

- Do not tell the user to buy, sell, borrow, leverage, or gamble.
- Do not promise windfalls, losses, debt relief, or business success.
- Do not replace licensed financial, tax, or legal advice.
- Do not make exact income predictions.

## Common Question Paths

- Path: "How is my money luck?" Read wealth palace, career palace, and timing, then describe rhythm.
- Path: "Should I invest?" Redirect to risk tolerance, diversification, and professional advice boundaries.
- Path: "Can I start a side business?" Read wealth plus career, then suggest small reversible tests.
- Path: "Why can't I save?" Read wealth plus life palace, then discuss spending and planning habits.

## Safety Notes

- Do not tell the user to buy, sell, borrow, or leverage.
- Frame wealth answers as reflection and risk awareness.
- Recommend professional advice for high-stakes financial decisions.
