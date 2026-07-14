"use client";

/**
 * [INPUT]: Depends on message state, topic controls, report rendering, and chat callbacks
 * [OUTPUT]: Provides the central conversation workspace
 * [POS]: Chat-first main panel coordinated by ziwei-chat-shell
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

import { useEffect, useState } from "react";
import { AlertCircle, Loader2, Paperclip, RotateCcw, Send, Sparkles, UserRound } from "lucide-react";

import type { ChatErrorState } from "@/lib/ui/chat-errors";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { nextRevealLength, revealStepForContent, sliceByCharacters } from "@/lib/ui/streaming-reveal";
import { ReportMessage } from "./report-message";
import { TopicEntry } from "./topic-entry";
import type { ChartDiscMotionPhase } from "./chart-disc-motion";
import type { ChartVisualModel } from "@/lib/ui/chart-visual";

export type ChatMessage = { role: "user" | "assistant"; content: string };

type ChatPanelProps = {
  messages: ChatMessage[];
  draft: string;
  isStreaming: boolean;
  error: ChatErrorState | null;
  greeting: string;
  onRetry: () => void;
  onDraftChange: (value: string) => void;
  onSubmit: () => void;
  onTopicSelect: (prompt: string) => void;
  chartVisualModel: ChartVisualModel | null;
  chartMotionPhase: ChartDiscMotionPhase;
};

export function ChatPanel({ messages, draft, isStreaming, error, greeting, onRetry, onDraftChange, onSubmit, onTopicSelect, chartVisualModel, chartMotionPhase }: ChatPanelProps) {
  const empty = messages.length === 0;
  return <section className="flex h-full min-h-0 flex-col bg-background">
    <div className="min-h-0 flex-1 overflow-y-auto px-5 py-8 sm:px-10 lg:px-12">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-7">
        <header className={empty ? "pt-1" : "border-b border-border pb-5"}>
          <div className="max-w-xl"><h2 className="font-serif text-3xl font-medium text-foreground sm:text-4xl">{greeting}</h2><p className="mt-3 text-base text-muted-foreground">{empty ? "今天想从哪里开始了解自己？" : "继续围绕命盘与现实问题展开。"}</p>{empty && chartVisualModel ? <p className="mt-5 max-w-md text-sm leading-6 text-muted-foreground">当前命盘已经就绪。选择一个现实问题，分析会沿着实际使用的宫位逐步展开。</p> : null}</div>
        </header>
        {empty ? <section><p className="mb-3 text-sm font-medium text-foreground">你可以试着问</p><TopicEntry onSelect={onTopicSelect} /></section> : null}
        {messages.map((message, index) => message.role === "user" ? <UserQuestion content={message.content} key={`user-${index}`} /> : <AssistantAnswer content={message.content} key={`assistant-${index}`} streaming={isStreaming && index === messages.length - 1} />)}
      </div>
    </div>
    {error ? <div className="border-t border-warning/25 bg-warning-muted px-5 py-3"><div className="mx-auto flex max-w-4xl items-center justify-between gap-3"><p className="flex items-center gap-2 text-sm text-warning"><AlertCircle className="size-4" />{error.message}</p>{error.canRetry ? <Button onClick={onRetry} size="sm" type="button" variant="outline"><RotateCcw data-icon="inline-start" />重试</Button> : null}</div></div> : null}
    <div className="border-t border-border bg-background px-5 py-4 sm:px-10"><div className="mx-auto max-w-4xl"><div className="rounded-xl border border-primary/40 bg-card p-3 shadow-[0_5px_14px_rgba(39,50,90,0.05)]"><Textarea className="min-h-16 resize-none border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0" onChange={(event) => onDraftChange(event.target.value)} placeholder="继续提问，例如：今年感情会有进展吗？" value={draft} /><div className="mt-2 flex items-center justify-between"><Button className="text-muted-foreground" size="icon-sm" title="附件功能暂未开放" type="button" variant="ghost"><Paperclip /></Button><Button className="size-10 rounded-full" disabled={isStreaming || !draft.trim()} onClick={onSubmit} size="icon" title="发送" type="button">{isStreaming ? <Loader2 className="animate-spin" /> : <Send />}</Button></div></div><p className="mt-2 text-center text-xs text-muted-foreground">回答仅供参考，不构成决策依据</p></div></div>
  </section>;
}

function UserQuestion({ content }: { content: string }) { return <div className="flex items-start gap-3"><div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"><UserRound className="size-5" /></div><div className="flex-1 rounded-xl border border-primary/25 bg-accent/45 px-5 py-4 text-sm leading-6 text-foreground">{content}</div></div>; }
function AssistantAnswer({ content, streaming }: { content: string; streaming: boolean }) {
  const { visibleContent, revealing } = useProgressiveReveal(content, streaming);
  const active = streaming || revealing;

  return <div className="flex items-start gap-3"><div className={`flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-white ${active ? "answer-orb-active" : ""}`}><Sparkles className="size-5 fill-current" /></div><div className="min-w-0 flex-1">{visibleContent ? <ReportMessage content={visibleContent} streaming={active} /> : <AnalysisPending />}{active ? <p aria-live="polite" className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><span className="answer-status-dot" /><span>{streaming && !content ? "正在核对命盘依据与知识来源" : "正在呈现分析内容"}</span></p> : null}</div></div>;
}

function AnalysisPending() {
  return <div className="overflow-hidden rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground"><div className="flex items-center gap-2"><Loader2 className="size-4 animate-spin text-primary" />正在分析</div><div aria-hidden="true" className="mt-4 grid gap-2"><span className="answer-skeleton w-4/5" /><span className="answer-skeleton w-full" /><span className="answer-skeleton w-3/5" /></div></div>;
}

function useProgressiveReveal(content: string, streaming: boolean) {
  const [visibleLength, setVisibleLength] = useState(0);
  const contentLength = Array.from(content).length;

  useEffect(() => {
    if (visibleLength >= contentLength) return;
    const timer = window.setTimeout(() => {
      setVisibleLength((current) => nextRevealLength(content, current, revealStepForContent(contentLength)));
    }, 24);
    return () => window.clearTimeout(timer);
  }, [content, contentLength, visibleLength]);

  return {
    visibleContent: sliceByCharacters(content, visibleLength),
    revealing: visibleLength < contentLength && !streaming,
  };
}
