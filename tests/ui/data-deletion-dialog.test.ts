import { describe, expect, test } from "vitest";

import {
  dataDeletionDialogReducer,
  initialDataDeletionDialogState,
} from "../../src/lib/ui/data-deletion-dialog";

describe("data deletion dialog state", () => {
  test("prevents closing while confirmation is pending", () => {
    const pending = dataDeletionDialogReducer(initialDataDeletionDialogState, {
      type: "confirm_started",
    });

    expect(dataDeletionDialogReducer(pending, { type: "open_changed", open: false })).toEqual({
      open: true,
      pending: true,
    });
  });

  test("keeps the dialog open when deletion fails", () => {
    const pending = dataDeletionDialogReducer({ open: true, pending: false }, {
      type: "confirm_started",
    });

    expect(dataDeletionDialogReducer(pending, { type: "confirm_finished", success: false })).toEqual({
      open: true,
      pending: false,
    });
  });

  test("closes the dialog when deletion succeeds", () => {
    const pending = dataDeletionDialogReducer({ open: true, pending: false }, {
      type: "confirm_started",
    });

    expect(dataDeletionDialogReducer(pending, { type: "confirm_finished", success: true })).toEqual({
      open: false,
      pending: false,
    });
  });
});
