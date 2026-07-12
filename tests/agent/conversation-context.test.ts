import { expect, test } from "vitest";

import { buildConversationContext } from "../../src/lib/agent/conversation-context";

test("keeps recent conversation turns with visible speaker labels", () => {
  expect(
    buildConversationContext([
      { role: "user", content: "请解释我的命盘。" },
      { role: "assistant", content: "先看命宫。" },
      { role: "user", content: "那我今年财运呢？" },
    ]),
  ).toBe("用户：请解释我的命盘。\n助手：先看命宫。\n用户：那我今年财运呢？");
});

test("bounds context to the latest twelve turns", () => {
  const messages = Array.from({ length: 13 }, (_, index) => ({
    role: "user" as const,
    content: `问题 ${index + 1}`,
  }));

  const context = buildConversationContext(messages);
  expect(context.split("\n")).not.toContain("用户：问题 1");
  expect(context.split("\n")).toContain("用户：问题 13");
});
