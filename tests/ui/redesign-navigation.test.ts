import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

import { inspectorPresentationForWidth } from "../../src/lib/ui/workspace-layout";

const navPath = resolve(process.cwd(), "src/components/nav-items.ts");
const navSource = existsSync(navPath) ? readFileSync(navPath, "utf8") : "";

describe("redesigned workspace navigation", () => {
  test("uses five real App Router destinations", () => {
    expect(navSource).toContain("export const NAV_ITEMS");
    expect(navSource).toContain("label: '对话'");
    expect(navSource).toContain("href: '/chart'");
    expect(navSource).toContain("href: '/records'");
    expect(navSource).toContain("href: '/insights'");
    expect(navSource).toContain("href: '/settings'");
    expect(navSource).not.toContain("href: '#'");
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
    expect(layoutSource).toContain("WorkspaceProvider");
    expect(layoutSource).not.toContain("WorkspaceAppLayout");
  });
});
