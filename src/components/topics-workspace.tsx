/**
 * [INPUT]: Depends on the shared topic-entry callback
 * [OUTPUT]: Provides the dedicated topic-selection workspace
 * [POS]: Main workspace view that returns users to chat with a prefilled prompt
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

import { TopicEntry } from "./topic-entry";

export function TopicsWorkspace({ onSelect }: { onSelect: (prompt: string) => void }) {
  return <section className="mx-auto w-full max-w-4xl px-5 py-8 sm:px-10"><header><h2 className="font-serif text-3xl font-medium">主题</h2><p className="mt-3 text-muted-foreground">选择主题后将在对话中预填问题。</p></header><div className="mt-8"><TopicEntry onSelect={onSelect} /></div></section>;
}
