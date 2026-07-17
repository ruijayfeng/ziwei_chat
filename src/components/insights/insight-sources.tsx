import type { InsightAggregation } from "../../lib/insights/contracts";

export type InsightSourceReference = {
  id: string;
  title: string;
  createdAt: string;
  excerpt: string;
};

export function insightSourceReferences(aggregation: InsightAggregation, sourceIds: string[]): InsightSourceReference[] {
  const conversations = new Map(aggregation.sources.conversations.map((conversation) => [conversation.id, conversation]));
  const candidates = new Map(aggregation.candidates.map((candidate) => [candidate.sourceId, candidate]));

  return sourceIds.flatMap((id) => {
    const candidate = candidates.get(id);
    if (!candidate) return [];
    const conversation = conversations.get(candidate.conversationId);
    if (!conversation) return [];
    return [{ id, title: conversation.title, createdAt: candidate.createdAt, excerpt: candidate.excerpt }];
  });
}

export function InsightSources({ sources }: { sources: InsightSourceReference[] }) {
  return (
    <details className="mt-3 text-xs text-muted-foreground">
      <summary className="cursor-pointer select-none text-primary/90">来源依据</summary>
      {sources.length ? (
        <ul className="mt-2 grid gap-2 border-l border-border pl-3">
          {sources.map((source) => (
            <li key={source.id}>
              <p className="font-medium text-foreground/85">{source.title} {source.createdAt ? <time dateTime={source.createdAt}>{formatSourceTime(source.createdAt)}</time> : <span>当前浏览器会话，时间未持久化</span>}</p>
              <p className="mt-0.5 line-clamp-2 leading-relaxed">{source.excerpt}</p>
            </li>
          ))}
        </ul>
      ) : <p className="mt-2 leading-relaxed">当前记录中没有可展示的匹配来源。</p>}
    </details>
  );
}

function formatSourceTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("zh-CN", { month: "short", day: "numeric" }).format(date);
}
