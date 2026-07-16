import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

describe("reference settings presentation", () => {
  test("uses the reference shell and surface language", () => {
    const page = readFileSync(
      resolve(process.cwd(), "src/app/(workspace)/settings/page.tsx"),
      "utf8",
    );
    const panel = readFileSync(
      resolve(process.cwd(), "src/components/model-settings-panel.tsx"),
      "utf8",
    );

    expect(page).toContain("<AppLayout");
    expect(page).toContain("<PageHeader");
    expect(panel).toContain("surface");
    expect(panel).toContain("surface-well");
  });
});
