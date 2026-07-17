import { BriefcaseBusiness, CalendarDays, Heart, UserRound, WalletCards, type LucideIcon } from "lucide-react";

import type { InsightAggregation, InsightReport } from "../../lib/insights/contracts";
import { InsightSources, insightSourceReferences } from "./insight-sources";

const topicPresentation: Record<string, { accent: string; Icon: LucideIcon }> = {
  career: { accent: "var(--emerald)", Icon: BriefcaseBusiness },
  relationship: { accent: "var(--gold)", Icon: Heart },
  wealth: { accent: "var(--blue)", Icon: WalletCards },
  personality: { accent: "var(--primary)", Icon: UserRound },
  recent_fortune: { accent: "var(--gold)", Icon: CalendarDays },
};

export function PatternList({ report, aggregation }: { report: InsightReport; aggregation: InsightAggregation }) {
  return (
    <section aria-labelledby="pattern-list-title">
      <h2 id="pattern-list-title" className="mb-4 text-xs text-muted-foreground">AI 观察到的模式</h2>
      <div className="flex flex-col gap-3">
        {report.patterns.map((pattern) => {
          const { accent, Icon } = topicPresentation[pattern.topic] ?? topicPresentation.personality;
          return (
          <article key={pattern.id} className="surface rounded-xl p-5">
            <div className="flex items-start gap-4">
              <span aria-hidden="true" className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl border" style={{ borderColor: `color-mix(in oklch, ${accent} 32%, transparent)`, background: `color-mix(in oklch, ${accent} 12%, transparent)` }}>
                <Icon className="size-5" strokeWidth={1.75} style={{ color: accent }} />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-[15px] font-medium leading-snug text-foreground">{pattern.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{pattern.detail}</p>
                <InsightSources sources={insightSourceReferences(aggregation, pattern.sourceIds)} />
              </div>
            </div>
          </article>
          );
        })}
      </div>
    </section>
  );
}
