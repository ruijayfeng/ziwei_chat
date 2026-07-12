import { expect, it } from "vitest";

import { parseMarkdown } from "../../src/lib/ui/markdown";

it("parses the supported block and inline Markdown without accepting HTML", () => {
  expect(parseMarkdown("# 结论\n\n**先积累**，再`验证`。\n\n- 观察机会\n- 更新作品\n\n> 以现实反馈为准\n\n---\n\n<script>alert(1)</script>")).toEqual([
    { type: "heading", depth: 1, children: [{ type: "text", value: "结论" }] },
    {
      type: "paragraph",
      children: [
        { type: "strong", children: [{ type: "text", value: "先积累" }] },
        { type: "text", value: "，再" },
        { type: "code", value: "验证" },
        { type: "text", value: "。" },
      ],
    },
    {
      type: "list",
      items: [
        [{ type: "text", value: "观察机会" }],
        [{ type: "text", value: "更新作品" }],
      ],
    },
    { type: "quote", children: [{ type: "text", value: "以现实反馈为准" }] },
    { type: "divider" },
    { type: "paragraph", children: [{ type: "text", value: "<script>alert(1)</script>" }] },
  ]);
});
