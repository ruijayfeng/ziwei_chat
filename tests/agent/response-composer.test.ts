import { describe, expect, test } from "vitest";

import { composeResponse } from "../../src/lib/agent/response-composer";

describe("composeResponse", () => {
  test("composes the required conclusion, chart basis, explanation, suggestion, and follow-up shape", () => {
    const response = composeResponse({
      conclusion: "你最近更适合先观察机会，再决定要不要动。",
      chartBasis: ["官禄宫显示工作节奏需要调整。"],
      plainExplanation: "落到现实里，这更像先看清选择，而不是马上拍板。",
      suggestion: "先用两周整理目标、岗位条件和市场反馈。",
      followUp: "你现在更想离开当前环境，还是想换一种工作内容？",
    });

    expect(response).toContain("结论");
    expect(response).toContain("命盘依据");
    expect(response).toContain("现实解释");
    expect(response).toContain("建议");
    expect(response).toContain("追问");
    expect((response.match(/？/g) ?? []).length).toBe(1);
  });
});
