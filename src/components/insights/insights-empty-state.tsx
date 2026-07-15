import Link from "next/link";

export function InsightsEmptyState() {
  return (
    <div className="mt-10 border-y border-border py-10">
      <h2 className="font-serif text-2xl font-bold">这里暂时不生成个性化结论</h2>
      <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
        周信、月度反思和长期模式需要真实历史记录、可解释的聚合规则与独立 critic。当前后端还没有这条来源链，因此不会用静态内容冒充你的洞见。
      </p>
      <Link className="mt-6 inline-flex min-h-11 items-center border-b border-cinnabar text-sm font-bold text-cinnabar" href="/">回到对话</Link>
      {/* TODO(insights-pipeline): connect only after sourced aggregation and critic contracts exist. */}
    </div>
  );
}
