/**
 * [INPUT]: Depends on structured analysis conclusions, chart bases, explanations, suggestions, follow-up, and optional agent context
 * [OUTPUT]: Provides response protocol composition for serious Ziwei answers
 * [POS]: Deterministic composition helper before optional model-backed wording
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

type ComposeResponseInput = {
  conclusion: string;
  chartBasis: string[];
  plainExplanation: string;
  suggestion: string;
  followUp: string;
  analysisSteps?: string[];
  knowledgeSources?: string[];
};

export function composeResponse({
  conclusion,
  chartBasis,
  plainExplanation,
  suggestion,
  followUp,
  analysisSteps = [],
  knowledgeSources = [],
}: ComposeResponseInput) {
  const basis =
    chartBasis.length > 0
      ? chartBasis.map((item) => `- ${item}`).join("\n")
      : "- 当前缺少命盘依据。";
  const explanationParts = [plainExplanation];
  const sourceTitles = knowledgeSources.filter((source) => source.trim().length > 0).slice(0, 3);

  if (analysisSteps.length > 0) {
    explanationParts.push(`分析顺序：${analysisSteps.slice(0, 3).join("；")}`);
  }

  if (sourceTitles.length > 0) {
    explanationParts.push(`参考来源：${sourceTitles.join("；")}`);
  }

  return [
    `结论：${conclusion}`,
    `命盘依据：\n${basis}`,
    `现实解释：${explanationParts.join("\n")}`,
    `建议：${suggestion}`,
    `追问：${followUp}`,
  ].join("\n\n");
}
