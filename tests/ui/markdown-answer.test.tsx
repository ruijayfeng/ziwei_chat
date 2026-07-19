import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { MarkdownAnswer } from "../../src/components/chat/markdown-answer";

describe("MarkdownAnswer", () => {
  test("renders Ziwei answer structure with semantic elements", () => {
    const { container } = render(
      <MarkdownAnswer
        content={[
          "## 命盘依据",
          "",
          "- 官禄宫是观察重点",
          "- **紫微星**需要结合现实条件",
          "",
          "> 这是一种倾向，不是绝对结论。",
          "",
          "[查看资料](https://example.com)",
          "",
          "| 方向 | 建议 |",
          "| --- | --- |",
          "| 长期积累 | 优先 |",
        ].join("\n")}
      />,
    );

    expect(screen.getByRole("heading", { name: "命盘依据" })).toBeTruthy();
    expect(screen.getByRole("list")).toBeTruthy();
    expect(container.querySelector("blockquote")?.textContent).toContain("这是一种倾向");
    expect(screen.getByRole("link", { name: "查看资料" }).getAttribute("rel")).toBe("noreferrer");
    expect(screen.getByRole("table")).toBeTruthy();
  });
});
// @vitest-environment jsdom
