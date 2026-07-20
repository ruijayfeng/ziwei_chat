import Link from "next/link";
import type { insightEligibility } from "../../lib/insights/source";

export function InsightsEmptyState({ eligibility }: { eligibility?: ReturnType<typeof insightEligibility> }) {
  return (
    <section role="status" aria-live="polite" className="border-y border-border py-10">
      <h2 className="font-serif text-2xl font-bold">还没有足够的真实记录</h2>
      <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
        完成几次跨天对话后，这里会整理重复出现的话题，并标出每条观察来自哪些记录。
      </p>
      {eligibility && <p className="mt-3 text-xs text-muted-foreground">当前已有 {eligibility.conversationCount} 段对话、{eligibility.userMessageCount} 条用户消息，覆盖 {eligibility.activityDayCount} 天。</p>}
      <Link className="mt-6 inline-flex min-h-11 items-center border-b border-cinnabar text-sm font-bold text-cinnabar" href="/">
        回到对话
      </Link>
    </section>
  );
}
