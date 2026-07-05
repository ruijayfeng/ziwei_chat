"use client";

/**
 * [INPUT]: Depends on evidence state from the app shell and shadcn UI primitives
 * [OUTPUT]: Provides visible tool, chart, knowledge, and critic evidence summary
 * [POS]: Audit panel for serious answers beside chat-panel
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

import { Badge } from "@/components/ui/badge";
import { BookOpenCheck, CheckCircle2, Database, FileText, Wrench } from "lucide-react";

export type EvidenceState = {
  toolsUsed: string[];
  chartFacts: string[];
  knowledgeSources: string[];
  critic: "not_run" | "passed" | "needs_review";
};

type EvidenceDrawerProps = {
  evidence: EvidenceState;
  compact?: boolean;
};

export function EvidenceDrawer({ evidence, compact = false }: EvidenceDrawerProps) {
  return (
    <div className={compact ? "grid gap-4" : "flex h-full min-h-0 flex-col"}>
      <div className={compact ? "" : "border-b border-border px-4 py-4"}>
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
            <BookOpenCheck size={18} strokeWidth={1.8} />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Evidence</p>
            <h2 className="mt-1 text-base font-semibold text-foreground">依据</h2>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">
              工具、命盘事实、知识来源和检查结果。
            </p>
          </div>
        </div>
      </div>

      <div className={compact ? "" : "min-h-0 flex-1 overflow-y-auto p-4"}>
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <EvidenceList icon={Wrench} title="工具调用" values={evidence.toolsUsed} />
          <EvidenceList icon={Database} title="命盘事实" values={evidence.chartFacts} />
          <EvidenceList icon={FileText} title="知识来源" values={evidence.knowledgeSources} />
          <CriticStatus status={evidence.critic} />
        </div>
      </div>
    </div>
  );
}

function EvidenceList({
  icon: Icon,
  title,
  values,
}: {
  icon: typeof Wrench;
  title: string;
  values: string[];
}) {
  return (
    <section className="border-b border-border p-3.5">
      <div className="flex items-center gap-2 font-medium text-foreground">
        <Icon className="size-4 text-muted-foreground" strokeWidth={1.8} />
        <h3 className="text-sm">{title}</h3>
      </div>
      <div className="mt-2">
        {values.length === 0 ? (
          <p className="text-xs leading-5 text-muted-foreground">
            发送一次命盘相关问题后，这里会显示依据。
          </p>
        ) : (
          <ul className="grid gap-2 text-xs">
            {values.map((value) => (
              <li className="rounded-md bg-muted px-3 py-2 leading-5" key={value}>
                {value}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function CriticStatus({ status }: { status: EvidenceState["critic"] }) {
  const state = criticText[status];

  return (
    <section className="p-3.5">
      <div className="flex items-center gap-2 font-medium text-foreground">
        <CheckCircle2 className="size-4 text-muted-foreground" strokeWidth={1.8} />
        <h3 className="text-sm">Critic 检查</h3>
      </div>
      <div className="mt-2">
        <Badge className={state.className} variant={state.variant}>
          {state.label}
        </Badge>
      </div>
    </section>
  );
}

const criticText: Record<
  EvidenceState["critic"],
  { label: string; className: string; variant: "secondary" | "outline" | "destructive" }
> = {
  not_run: {
    label: "尚未运行",
    className: "",
    variant: "outline",
  },
  passed: {
    label: "已通过检查",
    className: "bg-accent text-primary",
    variant: "secondary",
  },
  needs_review: {
    label: "需要复核",
    className: "",
    variant: "destructive",
  },
};
