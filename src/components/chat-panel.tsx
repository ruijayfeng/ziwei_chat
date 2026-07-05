"use client";

/**
 * [INPUT]: Depends on message state, prompt callbacks, streaming state, and chat error UI state
 * [OUTPUT]: Provides chat transcript, input controls, loading, retry, and mobile evidence affordance
 * [POS]: Main conversation component coordinated by ziwei-chat-shell
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

import type { ChatErrorState } from "@/lib/ui/chat-errors";
import { AlertCircle, BookOpenCheck, Loader2, RotateCcw, Send } from "lucide-react";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type ChatPanelProps = {
  messages: ChatMessage[];
  draft: string;
  isStreaming: boolean;
  error: ChatErrorState | null;
  onRetry: () => void;
  onOpenEvidence: () => void;
  onDraftChange: (value: string) => void;
  onSubmit: () => void;
};

export function ChatPanel({
  messages,
  draft,
  isStreaming,
  error,
  onRetry,
  onOpenEvidence,
  onDraftChange,
  onSubmit,
}: ChatPanelProps) {
  return (
    <section className="flex min-h-[640px] flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-[0_1px_0_rgba(24,24,22,0.04)]">
      <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
        <div>
          <p className="text-xs font-medium text-primary">Ziwei Chat</p>
          <h2 className="mt-1 text-lg font-semibold text-foreground">温和但有依据的分析</h2>
          <p className="mt-1 text-sm leading-5 text-muted">
            先看命盘和知识依据，再给出能落到现实里的回答。
          </p>
        </div>
        <button
          className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground transition hover:border-primary hover:text-primary lg:hidden"
          onClick={onOpenEvidence}
          type="button"
        >
          <BookOpenCheck size={16} strokeWidth={1.8} />
          依据
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto bg-background/45 px-5 py-5">
        {messages.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-surface p-5 text-sm leading-6 text-muted">
            <p className="font-medium text-foreground">可以直接问一句自然语言问题。</p>
            <p className="mt-2">
              例如：我最近适合换工作吗？如果还没有命盘，系统会先提示你保存出生信息。
            </p>
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              className={
                message.role === "user"
                  ? "ml-auto max-w-[85%] rounded-lg bg-primary px-4 py-3 text-sm leading-6 text-white"
                  : "max-w-[92%] whitespace-pre-wrap rounded-lg border border-border bg-surface px-4 py-3 text-sm leading-6 text-foreground"
              }
              key={`${message.role}-${index}`}
            >
              {message.content}
            </div>
          ))
        )}
        {isStreaming ? (
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted">
            <Loader2 className="animate-spin" size={14} strokeWidth={1.8} />
            正在分析
          </div>
        ) : null}
      </div>

      {error ? (
        <div className="border-t border-border bg-warning-muted px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-start gap-2 text-sm text-warning">
              <AlertCircle className="mt-0.5 shrink-0" size={16} strokeWidth={1.8} />
              <span>{error.message}</span>
            </div>
            {error.canRetry ? (
              <button
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-warning/30 bg-surface px-3 py-1.5 text-xs font-semibold text-warning transition hover:border-warning"
                onClick={onRetry}
                type="button"
              >
                <RotateCcw size={14} strokeWidth={1.8} />
                重试
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="border-t border-border bg-surface p-4">
        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <textarea
            className="min-h-24 resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm leading-6 text-foreground outline-none transition placeholder:text-muted focus:border-primary"
            onChange={(event) => onDraftChange(event.target.value)}
            placeholder="例如：我最近想换工作，适合动吗？"
            value={draft}
          />
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-foreground px-4 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:bg-border disabled:text-muted sm:h-24 sm:w-28"
            disabled={isStreaming || draft.trim().length === 0}
            onClick={onSubmit}
            type="button"
          >
            {isStreaming ? (
              <>
                <Loader2 className="animate-spin" size={16} strokeWidth={1.8} />
                分析中
              </>
            ) : (
              <>
                <Send size={16} strokeWidth={1.8} />
                发送
              </>
            )}
          </button>
        </div>
      </div>
    </section>
  );
}
