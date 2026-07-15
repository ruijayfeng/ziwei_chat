import { InsightsEmptyState } from "@/components/insights/insights-empty-state";

export default function InsightsPage() {
  return (
    <section className="mx-auto max-w-3xl py-8">
      <p className="text-sm text-cinnabar">洞见</p>
      <h1 className="mt-3 font-serif text-4xl font-bold">洞见尚未生成</h1>
      <p className="mt-4 leading-7 text-muted-foreground">这一页只接收有来源、有生成时间且通过检查的长期观察。</p>
      <InsightsEmptyState />
    </section>
  );
}
