import { expect, it } from "vitest";

import { parseChatReport } from "../../src/lib/ui/chat-report";

it("parses the current five-part response protocol", () => {
  const report = parseChatReport(
    "结论：暂不建议换工作。\n\n命盘依据：\n- 事业宫主星稳定。\n\n现实解释：外部机会仍在变化。\n\n建议：先积累作品。\n\n追问：你更在意收入还是成长？",
  );

  expect(report).toMatchObject({
    conclusion: "暂不建议换工作。",
    chartBasis: ["事业宫主星稳定。"],
    followUp: "你更在意收入还是成长？",
  });
});

it("uses a prose fallback for non-protocol content", () => {
  expect(parseChatReport("普通回复")).toBeNull();
});
