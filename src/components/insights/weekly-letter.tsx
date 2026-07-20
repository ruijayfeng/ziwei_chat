import type { InsightAggregation, InsightReport } from "../../lib/insights/contracts";
import { InsightSources, insightSourceReferences } from "./insight-sources";

export function WeeklyLetter({ report, aggregation }: { report: InsightReport; aggregation: InsightAggregation }) {
  return (
    <section className="surface relative overflow-hidden rounded-xl p-8 xl:p-10" aria-labelledby="weekly-letter-title">
      <RingSignature />
      <p className="relative mb-6 flex items-baseline gap-2.5">
        <span className="font-display text-base italic leading-none text-primary">本周</span>
        <span className="text-xs text-muted-foreground">来自已核验对话的周信</span>
      </p>
      <h2 id="weekly-letter-title" className="relative font-serif text-xl font-medium text-foreground xl:text-2xl">{report.weeklyLetter.greeting}</h2>
      <div className="relative mt-5 max-w-2xl space-y-4">
        {report.weeklyLetter.paragraphs.map((paragraph, index) => (
          <div key={`${index}-${paragraph.text}`}>
            <p className="text-pretty text-[15px] leading-[1.9] text-foreground/85">{paragraph.text}</p>
            <InsightSources sources={insightSourceReferences(aggregation, paragraph.sourceIds)} />
          </div>
        ))}
      </div>
      <p className="relative mt-6 font-serif text-sm text-primary/90">{report.weeklyLetter.signoff}</p>
    </section>
  );
}

function RingSignature() {
  return <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 size-64 opacity-45">
    <svg viewBox="0 0 200 200" className="size-full">
      {[90, 72, 54].map((radius, index) => <circle key={radius} cx="100" cy="100" r={radius} fill="none" stroke="oklch(0.85 0.05 292)" strokeOpacity={0.1 + index * 0.03} strokeWidth="0.8" />)}
      {Array.from({ length: 12 }, (_, index) => {
        const angle = (index * 30 - 90) * (Math.PI / 180);
        return <line key={index} x1={100 + 90 * Math.cos(angle)} y1={100 + 90 * Math.sin(angle)} x2={100 + 96 * Math.cos(angle)} y2={100 + 96 * Math.sin(angle)} stroke="oklch(0.85 0.05 292)" strokeOpacity="0.2" strokeWidth="0.8" />;
      })}
    </svg>
  </div>;
}
