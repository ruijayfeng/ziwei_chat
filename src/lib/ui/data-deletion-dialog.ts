/**
 * [INPUT]: Depends on deletion result and dialog open-change events
 * [OUTPUT]: Provides pure state and reducer for a confirmed anonymous-data deletion dialog
 * [POS]: Shared UI state boundary used by the clear-anonymous-data dialog component
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

export type DataDeletionDialogState = {
  open: boolean;
  pending: boolean;
};

export type DataDeletionDialogAction =
  | { type: "open_changed"; open: boolean }
  | { type: "confirm_started" }
  | { type: "confirm_finished"; success: boolean };

export const initialDataDeletionDialogState: DataDeletionDialogState = {
  open: false,
  pending: false,
};

export function dataDeletionDialogReducer(
  state: DataDeletionDialogState,
  action: DataDeletionDialogAction,
): DataDeletionDialogState {
  if (action.type === "open_changed") {
    if (!action.open && state.pending) return state;
    return { ...state, open: action.open };
  }

  if (action.type === "confirm_started") return { open: true, pending: true };
  if (action.success) return initialDataDeletionDialogState;
  return { open: true, pending: false };
}
