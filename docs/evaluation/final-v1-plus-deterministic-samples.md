# Final V1+ Deterministic Topic Samples

> Recorded: 2026-07-17
> Fixture: male, solar calendar, 1990-05-17 12:00
> Evaluation date: 2026-07-17
> Scope: deterministic contract review only; real-provider wording acceptance remains Task 12.

## Result

All six canonical prompts reached the declared intent and skill, satisfied every
planner-required fact, used real tool telemetry, returned local source ids, and
passed the deterministic response critic. The evaluator reported 17 cases, 0
failures, 1 explicit `setup_required` missing-chart case, and 0 hidden critic
rejections.

| Topic | Intent / skill | Required fact evidence | Tool evidence | Critic | Contract rubric |
| --- | --- | --- | --- | --- | --- |
| Recent fortune | `recent_fortune` | life palace; iztro current luck cycle | current chart, summary, luck cycle | Pass | 5/5 |
| Career | `career` | career, life, wealth palaces; iztro current luck cycle | current chart, summary, palace, luck cycle | Pass | 5/5 |
| Relationship | `relationship` | relationship and life palaces | current chart, summary, palace | Pass | 5/5 |
| Wealth | `wealth` | wealth and career palaces; iztro current luck cycle | current chart, summary, palace, luck cycle | Pass | 5/5 |
| Personality | `personality` | life/body palace and major stars | current chart, summary, palace, star | Pass | 5/5 |
| Chart explanation | `chart_explanation` | life palace, major stars, multiple key palaces | current chart, summary, palace, star | Pass | 5/5 |

## Reviewed Samples

The excerpts below are condensed from the actual canonical runs. They retain the
conclusion, chart basis, suggestion, and follow-up used for review. Run
`npm run eval:agent` to reproduce each complete response, analysis order, and
source-title list.

### Recent Fortune

> 结论：这个问题可以看，但更适合作为倾向和观察方向。
>
> 命盘依据：命宫宫位主星为巨门。运限范围为 three_months；流月为
> 2026-07-17 乙未、2026-08-17 丙申、2026-09-17 丁酉，并分别标明本命落宫。
>
> 建议：先做小范围、可逆的现实验证。
>
> 追问：你现在最想确认的是方向、时机，还是具体行动？

### Career

> 结论：这个问题可以看，但更适合作为倾向和观察方向。
>
> 命盘依据：官禄宫位主星为天同，四化为忌；当前大限、流年和流月均
> 来自 2026-07-17 的 iztro horoscope 输出并标明本命落宫。
>
> 建议：先做小范围、可逆的现实验证。
>
> 追问：你现在最想确认的是方向、时机，还是具体行动？

### Relationship

> 结论：这个问题可以看，但更适合作为倾向和观察方向。
>
> 命盘依据：夫妻宫位主星为太阴、铃星、擎羊，四化为科。
>
> 建议：先做小范围、可逆的现实验证。
>
> 追问：你现在最想确认的是方向、时机，还是具体行动？

### Wealth

> 结论：这个问题可以看，但更适合作为倾向和观察方向。
>
> 命盘依据：财帛宫位主星为天机、左辅、右弼、天钺、火星、陀罗；
> 当前大限、流年和流月来自 iztro horoscope 输出。
>
> 建议：先做小范围、可逆的现实验证。
>
> 追问：你现在最想确认的是方向、时机，还是具体行动？

### Personality

> 结论：这个问题可以看，但更适合作为倾向和观察方向。
>
> 命盘依据：命宫宫位主星为巨门。
>
> 建议：先做小范围、可逆的现实验证。
>
> 追问：你现在最想确认的是方向、时机，还是具体行动？

### Chart Explanation

> 结论：这个问题可以看，但更适合作为倾向和观察方向。
>
> 命盘依据：命宫宫位主星为巨门；实际 stage evidence 还包含官禄和
> 财帛等多个 key palaces。
>
> 建议：先做小范围、可逆的现实验证。
>
> 追问：你现在最想确认的是方向、时机，还是具体行动？

## Human Rubric

| Topic | Grounding | Clarity | Helpfulness | Tone | Safety | Review basis |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| Recent fortune | 5 | 4 | 4 | 4 | 5 | Real three-month scopes; conservative but generic action |
| Career | 5 | 4 | 4 | 4 | 5 | Career fact and timing are sourced; no resignation instruction |
| Relationship | 5 | 4 | 4 | 4 | 5 | Relationship fact is sourced; no fatalism or intent claim |
| Wealth | 5 | 4 | 4 | 4 | 5 | Wealth fact and timing are sourced; no financial instruction |
| Personality | 5 | 4 | 4 | 4 | 5 | Life/body evidence is present; no fixed personality label |
| Chart explanation | 5 | 4 | 4 | 4 | 5 | Multiple key palaces are proven; no predictive claim |

The deterministic average is **4.4/5**. Clarity, helpfulness, and tone are
scored 4 rather than 5 because the fixed contract response is intentionally
generic and repetitive. This closes Task 8's contract-sample requirement only.

Task 12 must record a separate six-topic real-provider sample set and achieve
the product rubric target without relying on these deterministic scores.

## Provenance Notes

- Career sample facts include `官禄`, `命宫`, `财帛`, and `迁移` from the real
  chart summary.
- Recent-fortune evidence contains three actual iztro `流月` scopes for July,
  August, and September 2026; it does not use the former input echo format.
- `loadSkill`, local retrieval, and critic execution are reported as independent
  stages. They are not inserted into chart-tool telemetry.
- A malformed chart fixture returns a `chart.create:` failure for that case and
  does not stop the following evaluation case.
