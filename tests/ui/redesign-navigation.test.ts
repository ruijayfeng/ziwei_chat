import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

import { workspaceNavItems } from "../../src/components/workspace/nav-items";
import { inspectorPresentationForWidth } from "../../src/lib/ui/workspace-layout";

describe("redesigned workspace navigation", () => {
  test("uses five real App Router destinations", () => {
    expect(workspaceNavItems.map(({ label, href }) => ({ label, href }))).toEqual([
      { label: "对话", href: "/" },
      { label: "命盘", href: "/chart" },
      { label: "记录", href: "/records" },
      { label: "洞见", href: "/insights" },
      { label: "设置", href: "/settings" },
    ]);
    expect(workspaceNavItems.some((item) => item.href === "#")).toBe(false);
  });

  test("keeps the inspector reachable below the xl rail breakpoint", () => {
    expect(inspectorPresentationForWidth(390)).toBe("sheet");
    expect(inspectorPresentationForWidth(1024)).toBe("sheet");
    expect(inspectorPresentationForWidth(1279)).toBe("sheet");
    expect(inspectorPresentationForWidth(1280)).toBe("rail");
  });

  test("provides every approved workspace route", () => {
    const appRoot = resolve(process.cwd(), "src/app/(workspace)");
    const pages = ["page.tsx", "chart/page.tsx", "records/page.tsx", "insights/page.tsx", "settings/page.tsx"];
    for (const page of pages) expect(existsSync(resolve(appRoot, page))).toBe(true);

    const layoutSource = readFileSync(resolve(appRoot, "layout.tsx"), "utf8");
    expect(layoutSource).toContain("WorkspaceAppLayout");
  });
});
