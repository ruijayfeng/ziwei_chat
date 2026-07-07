import { describe, expect, test } from "vitest";

import { composeResponse } from "../../src/lib/agent/response-composer";

describe("composeResponse", () => {
  test("composes readable Chinese sections for the required response shape", () => {
    const response = composeResponse({
      conclusion: "你最近更适合先观察机会，再决定要不要动。",
      chartBasis: ["官禄宫显示工作节奏需要调整。"],
      plainExplanation: "落到现实里，这更像先看清选择，而不是马上拍板。",
      suggestion: "先用两周整理目标、岗位条件和市场反馈。",
      followUp: "你现在更想离开当前环境，还是想换一种工作内容？",
    });

    expect(response).toContain("结论：你最近更适合先观察机会");
    expect(response).toContain("命盘依据：\n- 官禄宫显示工作节奏需要调整。");
    expect(response).toContain("现实解释：落到现实里");
    expect(response).toContain("建议：先用两周整理目标");
    expect(response).toContain("追问：你现在更想离开当前环境");
    expect(response).not.toMatch(/[锛�]|缁撹|鍛界洏|鐜板疄|寤鸿|杩介棶/);
  });

  test("can include skill analysis order and knowledge source titles without changing section shape", () => {
    const response = composeResponse({
      conclusion: "先观察机会，再决定行动。",
      chartBasis: ["官禄宫主星为天同。"],
      plainExplanation: "事业问题先看官禄宫。",
      suggestion: "先整理岗位条件。",
      followUp: "你更想换环境还是换内容？",
      analysisSteps: ["先确认官禄宫事实。", "再查看当前运限。"],
      knowledgeSources: ["事业宫基础", "骨髓赋：各宫主象与吉凶"],
    });

    expect(response).toContain("分析顺序：先确认官禄宫事实。；再查看当前运限。");
    expect(response).toContain("参考来源：事业宫基础；骨髓赋：各宫主象与吉凶");
    expect(response).toContain("追问：你更想换环境还是换内容？");
  });
});
