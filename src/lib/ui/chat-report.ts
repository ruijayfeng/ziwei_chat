/**
 * [INPUT]: Depends on the five-section response protocol emitted by response-composer
 * [OUTPUT]: Provides a parsed report or null for ordinary assistant prose
 * [POS]: Presentation boundary between agent response text and report-style chat rendering
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

export type ChatReport = {
  conclusion: string;
  chartBasis: string[];
  plainExplanation: string;
  suggestion: string;
  followUp: string;
};

const labels = ["结论：", "命盘依据：", "现实解释：", "建议：", "追问："] as const;

export function parseChatReport(content: string): ChatReport | null {
  const sections = labels.map((label, index) => {
    const start = content.indexOf(label);
    const nextStarts = labels
      .slice(index + 1)
      .map((item) => content.indexOf(item))
      .filter((value) => value >= 0);

    return start < 0
      ? ""
      : content
          .slice(start + label.length, nextStarts.length > 0 ? Math.min(...nextStarts) : undefined)
          .trim();
  });

  if (sections.some((section) => !section)) return null;

  return {
    conclusion: sections[0],
    chartBasis: sections[1]
      .split("\n")
      .map((line) => line.replace(/^-\s*/, "").trim())
      .filter(Boolean),
    plainExplanation: sections[2],
    suggestion: sections[3],
    followUp: sections[4],
  };
}
