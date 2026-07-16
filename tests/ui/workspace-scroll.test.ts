import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

const layoutPath = resolve(process.cwd(), "src/components/app-layout.tsx");
const layoutSource = existsSync(layoutPath) ? readFileSync(layoutPath, "utf8") : "";
const providerSource = readFileSync(resolve(process.cwd(), "src/components/workspace/workspace-provider.tsx"), "utf8");

describe("workspace scrolling", () => {
  test("gives the switchable middle workspace its own vertical scroll container", () => {
    expect(layoutSource).toContain("relative h-screen overflow-hidden");
    expect(layoutSource).toContain("mx-auto flex h-full max-w-[1600px]");
    expect(layoutSource).toContain("overflow-y-auto px-4 py-5");
    expect(layoutSource).toContain("<GradientBackground />");
  });

  test("clears the browser chart session when the user resets their chart", () => {
    expect(providerSource).toContain("const resetLocalChart = useCallback(() => {");
    expect(providerSource).toContain("window.localStorage.removeItem(chartSessionStorageKey(profileId));");
  });
});
