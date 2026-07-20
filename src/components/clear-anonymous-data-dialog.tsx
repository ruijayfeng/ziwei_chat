"use client";

import { useReducer } from "react";
import { Trash2 } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  dataDeletionDialogReducer,
  initialDataDeletionDialogState,
} from "@/lib/ui/data-deletion-dialog";

type ClearAnonymousDataDialogProps = {
  trigger: React.ReactElement;
  triggerContent: React.ReactNode;
  onConfirm: () => Promise<boolean>;
  deleting: boolean;
  error: string | null;
  pendingLabel?: string;
};

export function ClearAnonymousDataDialog({
  trigger,
  triggerContent,
  onConfirm,
  deleting,
  error,
  pendingLabel = "正在删除…",
}: ClearAnonymousDataDialogProps) {
  const [state, dispatch] = useReducer(dataDeletionDialogReducer, initialDataDeletionDialogState);
  const disabled = state.pending || deleting;

  async function confirm() {
    dispatch({ type: "confirm_started" });
    let success = false;
    try {
      success = await onConfirm();
    } catch {
      success = false;
    }
    dispatch({ type: "confirm_finished", success });
  }

  function handleOpenChange(open: boolean) {
    if (!open && disabled) return;
    dispatch({ type: "open_changed", open });
  }

  return (
    <AlertDialog open={state.open} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger disabled={disabled} render={trigger}>
        {disabled ? pendingLabel : triggerContent}
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive">
            <Trash2 />
          </AlertDialogMedia>
          <AlertDialogTitle>清除当前匿名 profile 的资料？</AlertDialogTitle>
          <AlertDialogDescription>
            这会删除命盘、对话、运行记录与当前浏览器模型设置。Beta 没有产品账号，因此这不是账号注销。
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error ? (
          <p
            className="rounded-xl border border-destructive/35 bg-destructive/10 px-3 py-2 text-sm leading-relaxed text-destructive"
            role="alert"
          >
            {error}
          </p>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={disabled}>取消</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-white hover:bg-destructive/85"
            disabled={disabled}
            onClick={() => void confirm()}
          >
            {disabled ? pendingLabel : "确认清除"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
