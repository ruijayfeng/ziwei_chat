import type { ConversationListItem, ConversationMessageItem } from "@/lib/ui/conversation-records";
import { cn } from "@/lib/utils";

export function LifeTimeline({
  conversations,
  currentConversationId,
  messages,
  onSelect,
  selectedId,
}: {
  conversations: ConversationListItem[];
  currentConversationId?: string;
  messages: ConversationMessageItem[];
  onSelect: (conversationId: string) => void;
  selectedId: string;
}) {
  if (!conversations.length) {
    return <div className="mt-8 border-t border-border py-10 text-sm leading-7 text-muted-foreground">还没有真实对话记录。完成一次对话后，当前匿名空间的记录会显示在这里。</div>;
  }

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[16rem_minmax(0,1fr)]">
      <nav aria-label="历史对话" className="border-t border-border">
        {conversations.map((conversation) => (
          <button
            aria-current={conversation.id === selectedId ? "true" : undefined}
            className={cn("block min-h-16 w-full border-b border-border px-2 py-4 text-left transition-colors", conversation.id === selectedId ? "text-foreground" : "text-muted-foreground hover:text-foreground")}
            key={conversation.id}
            onClick={() => onSelect(conversation.id)}
            type="button"
          >
            <span className="block line-clamp-2 text-sm font-bold leading-6">{conversation.title}</span>
            <span className="mt-1 block text-[11px]">{conversation.id === currentConversationId ? "当前浏览器会话" : formatDate(conversation.lastMessageAt)}</span>
          </button>
        ))}
      </nav>
      <section aria-label="对话内容" className="min-w-0 border-l border-border pl-6">
        {messages.length ? (
          <ol className="grid gap-6">
            {messages.filter((message) => message.role === "user" || message.role === "assistant").map((message) => (
              <li className="grid grid-cols-[3rem_minmax(0,1fr)] gap-4" key={message.id}>
                <span className="pt-1 text-xs text-muted-foreground">{message.role === "user" ? "你" : "紫微"}</span>
                <p className="whitespace-pre-wrap text-sm leading-7 text-foreground/90">{message.content}</p>
              </li>
            ))}
          </ol>
        ) : <p className="text-sm text-muted-foreground">正在读取这段对话，或该对话尚无可显示内容。</p>}
      </section>
    </div>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "时间未知" : new Intl.DateTimeFormat("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}
