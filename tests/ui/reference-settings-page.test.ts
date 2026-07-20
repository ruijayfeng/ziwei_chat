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
    expect(page).toContain("ClearAnonymousDataDialog");
    expect(page).not.toContain("function ClearDataDialog");
    expect(panel).toContain("surface");
    expect(panel).toContain("surface-well");
  });

  test("shares a boolean-aware controlled deletion dialog", () => {
    const dialog = readFileSync(
      resolve(process.cwd(), "src/components/clear-anonymous-data-dialog.tsx"),
      "utf8",
    );

    expect(dialog).toContain("dataDeletionDialogReducer");
    expect(dialog).toContain("open={state.open}");
    expect(dialog).toContain("await onConfirm()");
    expect(dialog).toContain("confirm_finished");
    expect(dialog).toContain('role="alert"');
  });
});
