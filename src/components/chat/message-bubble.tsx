"use client";

import { Check, Copy, RotateCcw, Search } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";

import { ReportMessage } from "@/components/report-message";
import type { ChatSessionMessage } from "@/lib/ui/chat-session";

export function MessageBubble({
  message,
  onInspect,
  onRetry,
}: {
  message: ChatSessionMessage;
  onInspect?: () => void;
  onRetry?: () => void;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timer);
  }, [copied]);

  if (message.role === "user") {
    return (
      <motion.div animate={{ opacity: 1, y: 0 }} className="flex justify-end" initial={{ opacity: 0, y: 8 }}>
        <p className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-3 text-sm leading-6 text-primary-foreground">
          {message.content}
        </p>
      </motion.div>
    );
  }

  const thinking = message.status === "thinking" && !message.content;
  const streaming = message.status === "streaming";

  return (
    <motion.article
      animate={{ opacity: 1, y: 0 }}
      className="grid grid-cols-[2px_minmax(0,1fr)] gap-4"
      initial={{ opacity: 0, y: 8 }}
    >
      <div aria-hidden className="bg-cinnabar/55" />
      <div className="min-w-0">
        {thinking ? (
          <p className="py-1 font-serif text-sm tracking-wide text-muted-foreground" role="status">
            正在读取命盘事实与分析依据…
          </p>
        ) : message.content ? (
          <div aria-live={streaming ? "polite" : "off"}>
            <ReportMessage content={message.content} streaming={streaming} />
          </div>
        ) : null}

        {message.status === "failed" ? (
          <div className="rounded-xl border border-destructive/35 bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
            <p>{message.error?.message ?? "这次分析没有完成。"}</p>
            {message.error?.canRetry && onRetry ? (
              <button className="mt-2 inline-flex min-h-10 items-center gap-2 font-bold" onClick={onRetry} type="button">
                <RotateCcw className="size-4" />重新分析
              </button>
            ) : null}
          </div>
        ) : null}

        {message.status === "complete" && message.content ? (
          <div className="mt-2 flex flex-wrap items-center gap-1 text-muted-foreground">
            <ActionButton
              label={copied ? "已复制" : "复制回答"}
              onClick={() => void navigator.clipboard.writeText(message.content).then(() => setCopied(true)).catch(() => undefined)}
            >
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            </ActionButton>
            {onInspect ? (
              <ActionButton label="查看本条回答依据" onClick={onInspect}>
                <Search className="size-3.5" />
              </ActionButton>
            ) : null}
          </div>
        ) : null}
      </div>
    </motion.article>
  );
}

function ActionButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      aria-label={label}
      className="flex size-10 items-center justify-center rounded-lg transition-colors hover:bg-card hover:text-foreground"
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}
