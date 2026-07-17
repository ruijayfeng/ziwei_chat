import type { InsightAggregation, InsightReport } from "../../lib/insights/contracts";
import { InsightSources, insightSourceReferences } from "./insight-sources";

const accents = ["var(--emerald)", "var(--gold)", "var(--blue)"];

export function PatternList({ report, aggregation }: { report: InsightReport; aggregation: InsightAggregation }) {
  return (
    <section aria-labelledby="pattern-list-title">
      <h2 id="pattern-list-title" className="mb-4 text-xs text-muted-foreground">AI 观察到的模式</h2>
      <div className="flex flex-col gap-3">
        {report.patterns.map((pattern, index) => (
          <article key={pattern.id} className="surface rounded-xl p-5">
            <div className="flex items-start gap-4">
              <span aria-hidden="true" className="mt-1 block size-3 shrink-0 rounded-full" style={{ backgroundColor: accents[index % accents.length] }} />
              <div className="min-w-0 flex-1">
                <h3 className="text-[15px] font-medium leading-snug text-foreground">{pattern.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{pattern.detail}</p>
                <InsightSources sources={insightSourceReferences(aggregation, pattern.sourceIds)} />
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
