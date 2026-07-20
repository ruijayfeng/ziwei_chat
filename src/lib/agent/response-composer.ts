/**
 * [INPUT]: Depends on structured analysis conclusions, chart bases, explanations, suggestions, follow-up, and optional agent context
 * [OUTPUT]: Provides natural-dialogue composition for serious Ziwei answers
 * [POS]: Deterministic composition helper before optional model-backed wording
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

type ComposeResponseInput = {
  conclusion: string;
  chartBasis: string[];
  plainExplanation: string;
  suggestion: string;
  followUp?: string;
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
  const paragraphs = [conclusion.trim()];
  const sourceTitles = knowledgeSources.filter((source) => source.trim().length > 0).slice(0, 3);

  if (chartBasis.length > 0) {
    paragraphs.push(`从盘里与这件事最相关的线索看，${chartBasis.join("；")}`);
  } else {
    paragraphs.push("目前这部分信息还不够，我不想为了给出答案而硬下结论。");
  }

  if (plainExplanation.trim()) paragraphs.push(plainExplanation.trim());

  if (analysisSteps.length > 0) {
    paragraphs.push(`我会${analysisSteps.slice(0, 3).join("")}`);
  }

  if (sourceTitles.length > 0) {
    paragraphs.push(`这也参考了${sourceTitles.join("、")}的解释。`);
  }

  if (suggestion.trim()) paragraphs.push(suggestion.trim());
  if (followUp?.trim()) paragraphs.push(followUp.trim());

  return paragraphs.join("\n\n");
}
