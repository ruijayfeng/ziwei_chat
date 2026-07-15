import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

const layoutSource = readFileSync(resolve(process.cwd(), "src/components/workspace/app-layout.tsx"), "utf8");
const providerSource = readFileSync(resolve(process.cwd(), "src/components/workspace/workspace-provider.tsx"), "utf8");

describe("workspace scrolling", () => {
  test("gives the switchable middle workspace its own vertical scroll container", () => {
    expect(layoutSource).toContain("min-h-0 flex-1 overflow-y-auto");
  });

  test("clears the browser chart session when the user resets their chart", () => {
    expect(providerSource).toContain("const resetLocalChart = useCallback(() => {");
    expect(providerSource).toContain("window.localStorage.removeItem(chartSessionStorageKey(profileId));");
  });
});
