/**
 * [INPUT]: Depends on structured analysis conclusions, chart bases, explanations, suggestions, and follow-up
 * [OUTPUT]: Provides response protocol composition for serious Ziwei answers
 * [POS]: Deterministic composition helper before model-backed generation is wired
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

type ComposeResponseInput = {
  conclusion: string;
  chartBasis: string[];
  plainExplanation: string;
  suggestion: string;
  followUp: string;
};

export function composeResponse({
  conclusion,
  chartBasis,
  plainExplanation,
  suggestion,
  followUp,
}: ComposeResponseInput) {
  const basis =
    chartBasis.length > 0 ? chartBasis.map((item) => `- ${item}`).join("\n") : "- 当前缺少命盘依据。";

  return [
    `结论：${conclusion}`,
    `命盘依据：\n${basis}`,
    `现实解释：${plainExplanation}`,
    `建议：${suggestion}`,
    `追问：${followUp}`,
  ].join("\n\n");
}
