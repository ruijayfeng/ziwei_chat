/**
 * [INPUT]: Depends on the current in-memory chat transcript
 * [OUTPUT]: Provides a truthful session record view without persistent-history claims
 * [POS]: Main workspace view for the records navigation item
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

import type { ChatMessage } from "./chat-panel";

export function RecordsWorkspace({ messages }: { messages: ChatMessage[] }) {
  return <section className="mx-auto w-full max-w-4xl px-5 py-8 sm:px-10"><header><h2 className="font-serif text-3xl font-medium">记录</h2><p className="mt-3 text-muted-foreground">本次浏览中的对话会显示在这里。</p></header>{messages.length === 0 ? <div className="mt-8 rounded-xl border border-dashed border-border bg-card p-8"><h3 className="font-medium">暂无分析记录</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">完成一次对话后，本次浏览会话会显示在这里。历史记录同步尚未开放。</p></div> : <ol className="mt-8 grid gap-3">{messages.map((message, index) => <li className="rounded-xl border border-border bg-card p-4" key={`${message.role}-${index}`}><p className="text-xs font-medium text-primary">{message.role === "user" ? "你的提问" : "分析回答"}</p><p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{message.content}</p></li>)}</ol>}</section>;
}
