import { describe, expect, it } from "vitest";

import { greetingForChart, workspaceNavigation } from "../../src/lib/ui/workspace-navigation";

describe("workspace navigation", () => {
  it("keeps the five workspace views in reference order", () => {
    expect(workspaceNavigation.map((item) => item.id)).toEqual([
      "chat",
      "chart",
      "topics",
      "records",
      "settings",
    ]);
  });

  it("uses a generic greeting until a non-default chart name exists", () => {
    expect(greetingForChart(null)).toBe("你好，欢迎回来");
    expect(greetingForChart({ name: "我的命盘" } as never)).toBe("你好，欢迎回来");
    expect(greetingForChart({ name: "Jay" } as never)).toBe("你好，Jay");
  });
});
