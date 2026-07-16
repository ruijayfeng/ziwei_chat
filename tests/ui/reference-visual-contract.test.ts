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
    expect(provider).toContain("const saveToken");
    expect(provider).toContain("isCurrentProfileOperation(saveToken, currentOperation)");
    expect(provider).toContain("revisionRef.current += 1");
    expect(provider).toContain("setProfileId(nextProfileId)");
    expect(provider).toContain("return false");

    const deletion = provider.slice(provider.indexOf("const deleteAnonymousData"));
    expect(deletion).toContain("revisionRef.current += 1");
  });

  test("blocks saves during deletion and recovers loading after deletion failure", () => {
    const provider = source("src/components/workspace/workspace-provider.tsx");
    const save = provider.slice(provider.indexOf("const saveChart"), provider.indexOf("const resetLocalChart"));
    const deletion = provider.slice(provider.indexOf("const deleteAnonymousData"));
    const deletionCatch = deletion.slice(deletion.indexOf("} catch (error)"), deletion.indexOf("} finally"));

    expect(save).toContain("if (dataDeletingRef.current) return Promise.resolve(false);");
    expect(save).toContain("}, [profileId]);");
    expect(deletionCatch).toContain("setDataDeletionError");
  });

  test("serializes chart saves before deletion requests", () => {
    const provider = source("src/components/workspace/workspace-provider.tsx");
    const save = provider.slice(provider.indexOf("const saveChart"), provider.indexOf("const resetLocalChart"));
    const deletion = provider.slice(provider.indexOf("const deleteAnonymousData"));
    const saveAwaitIndex = deletion.indexOf("await chartSavePromiseRef.current");
    const deleteRequestIndex = deletion.indexOf("fetch(`/api/chat");

    expect(provider).toContain("chartSavePromiseRef");
    expect(provider).toContain("dataDeletingRef");
    expect(save).toContain("if (dataDeletingRef.current) return Promise.resolve(false);");
    expect(save).toContain("chartSavePromiseRef.current = operationPromise");
    expect(save).toContain("chartSavePromiseRef.current === operationPromise");
    expect(deletion).toContain("if (!profileId || dataDeletingRef.current) return false;");
    expect(deletion).toContain("dataDeletingRef.current = true;");
    expect(saveAwaitIndex).toBeGreaterThanOrEqual(0);
    expect(deleteRequestIndex).toBeGreaterThan(saveAwaitIndex);
  });

  test("rejects a second chart save while one is in flight", () => {
    const provider = source("src/components/workspace/workspace-provider.tsx");
    const save = provider.slice(provider.indexOf("const saveChart"), provider.indexOf("const resetLocalChart"));

    expect(save).toContain("if (chartSavePromiseRef.current) return Promise.resolve(false);");
  });

  test("unifies restore and save chart operation ownership", () => {
    const provider = source("src/components/workspace/workspace-provider.tsx");
    const restore = provider.slice(provider.indexOf("const restoreTimer"), provider.indexOf("useEffect(() => () => chatAbortRef.current"));
    const save = provider.slice(provider.indexOf("const saveChart"), provider.indexOf("const resetLocalChart"));
    const deletion = provider.slice(provider.indexOf("const deleteAnonymousData"));

    expect(provider).toContain("chartOperationRevisionRef");
    expect(restore).toContain("chartOperationRevisionRef.current += 1");
    expect(restore).toContain("const restoreToken");
    expect(restore).toContain("isCurrentProfileOperation(restoreToken, currentOperation)");
    expect(restore).toContain("if (chartSavePromiseRef.current) return;");
    expect(save).toContain("chartOperationRevisionRef.current += 1");
    expect(save).toContain("const saveToken");
    expect(save).toContain("isCurrentProfileOperation(saveToken, currentOperation)");
    expect(deletion).toContain("chartOperationRevisionRef.current += 1");
  });

  test("settles the current profile when a chart save fails", () => {
    const provider = source("src/components/workspace/workspace-provider.tsx");
    const save = provider.slice(provider.indexOf("const saveChart"), provider.indexOf("const resetLocalChart"));
    const saveCatch = save.slice(save.indexOf("} catch"), save.indexOf("} finally"));

    expect(saveCatch).toContain("isCurrentProfileOperation(saveToken, currentOperation)");
    expect(saveCatch).toContain("setSettledProfileId(profileId);");
    expect(saveCatch).toContain("setChartError");
  });

  test("invalidates chart state only after deletion succeeds", () => {
    const provider = source("src/components/workspace/workspace-provider.tsx");
    const deletion = provider.slice(provider.indexOf("const deleteAnonymousData"));
    const deleteRequestIndex = deletion.indexOf("fetch(`/api/chat");
    const invalidationIndex = deletion.indexOf("revisionRef.current += 1;");
    const deletionCatch = deletion.slice(deletion.indexOf("} catch (error)"), deletion.indexOf("} finally"));

    expect(deleteRequestIndex).toBeGreaterThanOrEqual(0);
    expect(invalidationIndex).toBeGreaterThan(deleteRequestIndex);
    expect(deletionCatch).not.toContain("setChartLoading(false);");
    expect(deletionCatch).not.toContain("setSettledProfileId");
    expect(deletionCatch).not.toContain("setChartError");
  });

  test("connects default inspector deletion to the workspace operation", () => {
    const inspector = source("src/components/inspector-panel.tsx");

    expect(inspector).toContain("useWorkspace()");
    expect(inspector).toContain("deleteAnonymousData");
    expect(inspector).toContain("AlertDialog");
    expect(inspector).toContain("dataDeletionError");
  });
});
