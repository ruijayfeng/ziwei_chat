/**
 * [INPUT]: Depends on assistant message content and the response-protocol parser
 * [OUTPUT]: Provides report-style rendering for grounded Ziwei answers
 * [POS]: Presentation component used by the central chat workspace
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

import { Lightbulb, ListChecks, MessageCircleQuestion, Sparkles } from "lucide-react";

import { parseChatReport } from "@/lib/ui/chat-report";
import { MarkdownMessage } from "./markdown-message";

export function ReportMessage({ content, streaming = false }: { content: string; streaming?: boolean }) {
  const report = parseChatReport(content);

  if (!report || streaming) {
    return <MarkdownMessage content={content} />;
  }

  return (
    <article className="overflow-hidden rounded-xl border border-border bg-card" aria-label="命盘分析回答">
      <ReportSection icon={Sparkles} title="结论" className="border-b border-border">
        <p className="text-base font-semibold text-foreground">{report.conclusion}</p>
      </ReportSection>
      <div className="grid divide-y divide-border md:grid-cols-2 md:divide-x md:divide-y-0">
        <ReportSection icon={ListChecks} title="命盘依据">
          <ul className="grid gap-2 text-sm leading-6 text-muted-foreground">
            {report.chartBasis.map((fact) => <li className="flex gap-2" key={fact}><span className="text-primary">•</span><span>{fact}</span></li>)}
          </ul>
        </ReportSection>
        <ReportSection icon={Lightbulb} title="现实解释">
          <p className="text-sm leading-7 text-muted-foreground">{report.plainExplanation}</p>
        </ReportSection>
      </div>
      <div className="grid divide-y divide-border border-t border-border md:grid-cols-2 md:divide-x md:divide-y-0">
        <ReportSection icon={Lightbulb} title="建议">
          <p className="text-sm leading-7 text-muted-foreground">{report.suggestion}</p>
        </ReportSection>
        <ReportSection icon={MessageCircleQuestion} title="你可能还想问">
          <p className="text-sm leading-7 text-primary">{report.followUp}</p>
        </ReportSection>
      </div>
      <div className="border-t border-border px-5 py-3 text-center text-xs text-muted-foreground">回答来自命盘与知识库</div>
    </article>
  );
}

function ReportSection({ icon: Icon, title, children, className = "" }: { icon: typeof Sparkles; title: string; children: React.ReactNode; className?: string }) {
  return <section className={`min-w-0 p-5 ${className}`}><div className="mb-3 flex items-center gap-2 text-sm font-medium text-primary"><Icon className="size-4" />{title}</div>{children}</section>;
}
