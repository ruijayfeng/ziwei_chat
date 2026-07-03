"use client";

/**
 * [INPUT]: Depends on message state, prompt callback, and streaming submit status
 * [OUTPUT]: Provides chat transcript and input controls
 * [POS]: Main conversation component coordinated by ziwei-chat-shell
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type ChatPanelProps = {
  messages: ChatMessage[];
  draft: string;
  isStreaming: boolean;
  onDraftChange: (value: string) => void;
  onSubmit: () => void;
};

export function ChatPanel({
  messages,
  draft,
  isStreaming,
  onDraftChange,
  onSubmit,
}: ChatPanelProps) {
  return (
    <section className="flex min-h-[560px] flex-col rounded-md border border-zinc-300 bg-white">
      <div className="border-b border-zinc-200 px-5 py-4">
        <h2 className="text-lg font-semibold text-zinc-950">Ziwei Chat</h2>
        <p className="mt-1 text-sm text-zinc-600">
          先跑工具，再给回答； serious analysis 会经过 critic。
        </p>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
        {messages.length === 0 ? (
          <div className="rounded-md border border-dashed border-zinc-300 p-5 text-sm leading-6 text-zinc-600">
            选一个主题，或直接问一句自然语言问题。没有命盘时，系统会先提示创建命盘。
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              className={
                message.role === "user"
                  ? "ml-auto max-w-[85%] rounded-md bg-teal-800 px-4 py-3 text-sm leading-6 text-white"
                  : "max-w-[92%] whitespace-pre-wrap rounded-md bg-zinc-100 px-4 py-3 text-sm leading-6 text-zinc-900"
              }
              key={`${message.role}-${index}`}
            >
              {message.content}
            </div>
          ))
        )}
      </div>

      <div className="border-t border-zinc-200 p-4">
        <div className="flex gap-2">
          <textarea
            className="min-h-20 flex-1 resize-none rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm leading-6 text-zinc-950 outline-none focus:border-teal-700"
            onChange={(event) => onDraftChange(event.target.value)}
            placeholder="例如：我最近想换工作，适合动吗？"
            value={draft}
          />
          <button
            className="h-20 w-24 rounded-md bg-zinc-950 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
            disabled={isStreaming || draft.trim().length === 0}
            onClick={onSubmit}
            type="button"
          >
            {isStreaming ? "生成中" : "发送"}
          </button>
        </div>
      </div>
    </section>
  );
}
