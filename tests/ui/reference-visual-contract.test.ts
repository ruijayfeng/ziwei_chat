import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("reference redesign visual contract", () => {
  test("keeps the reference design tokens and surface system", () => {
    const css = source("src/app/globals.css");

    expect(css).toContain("--font-display: var(--font-fraunces)");
    expect(css).toContain("--background: oklch(0.158 0.03 292)");
    expect(css).toContain(".surface {");
    expect(css).toContain(".surface-well {");
    expect(css).toContain(".ziwei-orbit-slow {");
  });

  test("installs the reference ambient and branding primitives", () => {
    expect(source("src/components/gradient-background.tsx")).toContain(
      "<FloatingStars count={70} />",
    );
    expect(source("src/components/brand/logotype.tsx")).toContain("ZiweiLogotype");
    expect(source("src/components/motion-provider.tsx")).toContain("MotionConfig");
  });

  test("loads reference fonts without a build-time Google Fonts dependency", () => {
    const layout = source("src/app/layout.tsx");

    expect(layout).not.toContain("next/font/google");
    expect(layout).toContain("fonts.googleapis.com/css2?family=Fraunces");
    expect(layout).toContain("--font-fraunces");
    expect(layout).toContain("--font-noto-serif");
  });

  test("binds the sidebar chart card to the active workspace chart", () => {
    const sidebar = source("src/components/sidebar.tsx");

    expect(sidebar).toContain("useWorkspace()");
    expect(sidebar).toContain("sidebarChartSummary");
    expect(sidebar).toContain("chartRestoreSettled");
    expect(sidebar).toContain("chartError");
    expect(sidebar).toContain("查看命盘状态");
    expect(sidebar).not.toContain("命盘恢复失败");
    expect(sidebar).not.toContain("我的命盘");
    expect(sidebar).not.toContain("开通 Pro");
  });

  test("exposes profile-scoped chart restore settlement", () => {
    const provider = source("src/components/workspace/workspace-provider.tsx");

    expect(provider).toContain("chartRestoreSettled");
    expect(provider).toContain("settledProfileId");
    expect(provider).toContain("settledProfileId === profileId");
  });

  test("guards profile-scoped chart saves before async mutations", () => {
    const provider = source("src/components/workspace/workspace-provider.tsx");

    expect(provider).toContain("isCurrentProfileOperation");
    expect(provider).toContain("const operation = { profileId, revision: revisionRef.current }");
    expect(provider).toContain("isCurrentProfileOperation(operation, currentOperation)");
    expect(provider).toContain("revisionRef.current += 1");
    expect(provider).toContain("setProfileId(nextProfileId)");
    expect(provider).toContain("return false");

    const deletion = provider.slice(provider.indexOf("const deleteAnonymousData"));
    expect(deletion).toContain("revisionRef.current += 1");
  });
});
