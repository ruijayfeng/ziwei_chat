"use client";

/**
 * [INPUT]: Depends on evidence state from the app shell
 * [OUTPUT]: Provides visible tool, chart, knowledge, and critic evidence summary
 * [POS]: Audit panel for serious answers beside chat-panel
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

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
    <aside
      className={
        compact
          ? "grid gap-4"
          : "rounded-lg border border-border bg-surface p-4 shadow-[0_1px_0_rgba(24,24,22,0.04)]"
      }
    >
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-success-muted text-primary">
          <BookOpenCheck size={18} strokeWidth={1.8} />
        </div>
        <div>
          <p className="text-xs font-medium text-muted">Evidence</p>
          <h2 className="mt-1 text-base font-semibold text-foreground">依据</h2>
          <p className="mt-1 text-sm leading-5 text-muted">
            工具、命盘事实、知识来源和检查结果会集中在这里。
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 text-sm">
        <EvidenceList icon={Wrench} title="工具调用" values={evidence.toolsUsed} />
        <EvidenceList icon={Database} title="命盘事实" values={evidence.chartFacts} />
        <EvidenceList icon={FileText} title="知识来源" values={evidence.knowledgeSources} />
        <CriticStatus status={evidence.critic} />
      </div>
    </aside>
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
    <section className="rounded-lg border border-border bg-background/55 p-3">
      <div className="flex items-center gap-2 font-medium text-foreground">
        <Icon size={15} strokeWidth={1.8} />
        <h3>{title}</h3>
      </div>
      {values.length === 0 ? (
        <p className="mt-2 text-xs leading-5 text-muted">
          发送一次命盘相关问题后，这里会显示依据。
        </p>
      ) : (
        <ul className="mt-2 grid gap-2 text-xs">
          {values.map((value) => (
            <li
              className="rounded-md border border-border bg-surface px-3 py-2 leading-5 text-foreground"
              key={value}
            >
              {value}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function CriticStatus({ status }: { status: EvidenceState["critic"] }) {
  const state = criticText[status];

  return (
    <section className="rounded-lg border border-border bg-background/55 p-3">
      <div className="flex items-center gap-2 font-medium text-foreground">
        <CheckCircle2 size={15} strokeWidth={1.8} />
        <h3>Critic 检查</h3>
      </div>
      <p className={`mt-2 rounded-full px-2.5 py-1 text-xs font-medium ${state.className}`}>
        {state.label}
      </p>
    </section>
  );
}

const criticText: Record<
  EvidenceState["critic"],
  { label: string; className: string }
> = {
  not_run: {
    label: "尚未运行",
    className: "bg-surface text-muted border border-border",
  },
  passed: {
    label: "已通过检查",
    className: "bg-success-muted text-primary",
  },
  needs_review: {
    label: "需要复核",
    className: "bg-warning-muted text-warning",
  },
};
