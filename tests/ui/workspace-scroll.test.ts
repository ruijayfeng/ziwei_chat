import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

const shellSource = readFileSync(resolve(process.cwd(), "src/components/ziwei-chat-shell.tsx"), "utf8");

describe("workspace scrolling", () => {
  test("gives the switchable middle workspace its own vertical scroll container", () => {
    expect(shellSource).toContain('<div className="min-h-0 overflow-y-auto">{mainWorkspace}</div>');
  });

  test("clears the browser chart session when the user resets their chart", () => {
    expect(shellSource).toContain("function resetChartDraft() {");
    expect(shellSource).toContain("window.localStorage.removeItem(chartSessionStorageKey(profileId));");
  });
});
