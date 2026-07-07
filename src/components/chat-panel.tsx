"use client";

/**
 * [INPUT]: Depends on message state, shadcn UI primitives, prompt callbacks, streaming state, and chat error UI state
 * [OUTPUT]: Provides chat transcript, input controls, loading, retry, and evidence affordance
 * [POS]: Main conversation component coordinated by ziwei-chat-shell
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

import type { ChatErrorState } from "@/lib/ui/chat-errors";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, Loader2, RotateCcw, Send } from "lucide-react";

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
  onDraftChange: (value: string) => void;
  onSubmit: () => void;
};

export function ChatPanel({
  messages,
  draft,
  isStreaming,
  error,
  onRetry,
  onDraftChange,
  onSubmit,
}: ChatPanelProps) {
  return (
    <section className="flex h-full min-h-0 flex-col bg-card">
      <div className="flex min-h-16 items-center justify-between gap-4 border-b border-border px-4 sm:px-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Badge className="bg-accent text-primary" variant="secondary">
              Ziwei Chat
            </Badge>
            {isStreaming ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" />
                正在分析
              </span>
            ) : null}
          </div>
          <h2 className="mt-1 truncate text-base font-semibold text-foreground sm:text-lg">
            温和但有依据的命盘分析
          </h2>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-background px-4 py-5 sm:px-6">
        <div className="mx-auto flex max-w-3xl flex-col gap-4">
          {messages.length === 0 ? <EmptyChatState /> : null}
          {messages.map((message, index) => (
            <MessageBubble key={`${message.role}-${index}`} message={message} />
          ))}
        </div>
      </div>

      {error ? (
        <div className="border-t border-border bg-warning-muted px-4 py-3">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
            <div className="flex items-start gap-2 text-sm text-warning">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{error.message}</span>
            </div>
            {error.canRetry ? (
              <Button onClick={onRetry} size="sm" type="button" variant="outline">
                <RotateCcw data-icon="inline-start" />
                重试
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="border-t border-border bg-card px-4 py-3 sm:px-5">
        <div className="mx-auto grid max-w-3xl gap-2 sm:grid-cols-[1fr_auto]">
          <Textarea
            className="max-h-40 min-h-20 resize-none bg-background text-sm leading-6"
            onChange={(event) => onDraftChange(event.target.value)}
            placeholder="例如：我最近想换工作，适合动吗？"
            value={draft}
          />
          <Button
            className="h-10 bg-foreground text-white hover:bg-black sm:h-full sm:min-h-20 sm:w-24"
            disabled={isStreaming || draft.trim().length === 0}
            onClick={onSubmit}
            type="button"
          >
            {isStreaming ? (
              <>
                <Loader2 className="animate-spin" data-icon="inline-start" />
                分析中
              </>
            ) : (
              <>
                <Send data-icon="inline-start" />
                发送
              </>
            )}
          </Button>
        </div>
      </div>
    </section>
  );
}

function EmptyChatState() {
  return (
    <div className="rounded-lg border border-dashed border-border bg-card p-5 text-sm leading-6 text-muted-foreground">
      <p className="font-medium text-foreground">可以直接问一句自然语言问题。</p>
      <p className="mt-2">
        例如：我最近适合换工作吗？如果还没有命盘，系统会先提示你保存出生信息。
      </p>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  return (
    <div
      className={
        message.role === "user"
          ? "ml-auto max-w-[82%] rounded-lg bg-primary px-4 py-3 text-sm leading-6 text-primary-foreground"
          : "max-w-[92%] whitespace-pre-wrap rounded-lg border border-border bg-card px-4 py-3 text-sm leading-6 text-foreground"
      }
    >
      {message.content}
    </div>
  );
}
