"use client";

/**
 * [INPUT]: Depends on evidence state from the app shell and shadcn UI primitives
 * [OUTPUT]: Provides dynamic evidence timeline plus tool, chart, knowledge, and critic details
 * [POS]: Audit panel for Agent runs beside chat-panel
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

import { useState } from "react";
import {
  BookOpenCheck,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  Database,
  FileText,
  Loader2,
  Wrench,
  XCircle,
} from "lucide-react";

import {
  evidenceKnowledgeSourceLabel,
  type EvidenceRun,
  type EvidenceState,
  type EvidenceStep,
} from "@/lib/ui/chat-evidence";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type { EvidenceState } from "@/lib/ui/chat-evidence";

type EvidenceDrawerProps = {
  evidence: EvidenceState;
  compact?: boolean;
};

export function EvidenceDrawer({ evidence, compact = false }: EvidenceDrawerProps) {
  const latestRunId = evidence.runs.at(-1)?.runId ?? "";
  const [openRunIds, setOpenRunIds] = useState<Set<string>>(() => new Set());
  const hasTimeline = evidence.runs.length > 0;

  function isRunOpen(run: EvidenceRun) {
    return openRunIds.has(run.runId) || run.runId === latestRunId || run.status === "running";
  }

  function toggleRun(runId: string) {
    setOpenRunIds((current) => {
      const next = new Set(current);
      if (next.has(runId)) {
        next.delete(runId);
      } else {
        next.add(runId);
      }
      return next;
    });
  }

  return (
    <div className={compact ? "grid gap-4" : "flex h-full min-h-0 flex-col"}>
      <div className={compact ? "" : "border-b border-border px-4 py-4"}>
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
            <BookOpenCheck size={18} strokeWidth={1.8} />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Evidence</p>
            <h2 className="mt-1 text-base font-semibold text-foreground">分析过程</h2>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">
              跟踪 Agent 如何读取命盘、调用工具、检索知识、交给模型分析并完成校验。
            </p>
          </div>
        </div>
      </div>

      <div className={compact ? "" : "min-h-0 flex-1 overflow-y-auto p-4"}>
        {hasTimeline ? (
          <div className="grid gap-3">
            {evidence.runs
              .slice()
              .reverse()
              .map((run) => (
                <RunCard
                  evidence={evidence}
                  isOpen={isRunOpen(run)}
                  key={run.runId}
                  onToggle={() => toggleRun(run.runId)}
                  run={run}
                />
              ))}
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-card p-4 text-sm leading-6 text-muted-foreground">
            发送命盘相关问题后，这里会动态显示本次分析流程。
          </div>
        )}
      </div>
    </div>
  );
}

function RunCard({
  run,
  evidence,
  isOpen,
  onToggle,
}: {
  run: EvidenceRun;
  evidence: EvidenceState;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const StatusIcon = run.status === "running" ? Loader2 : run.status === "failed" ? XCircle : CheckCircle2;

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card">
      <Button
        className="h-auto w-full justify-between rounded-none border-0 px-3.5 py-3 text-left"
        onClick={onToggle}
        type="button"
        variant="ghost"
      >
        <span className="flex min-w-0 items-start gap-3">
          <StatusIcon
            className={
              run.status === "running"
                ? "mt-0.5 size-4 animate-spin text-primary"
                : run.status === "failed"
                  ? "mt-0.5 size-4 text-destructive"
                  : "mt-0.5 size-4 text-primary"
            }
            strokeWidth={1.9}
          />
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium text-foreground">{run.title}</span>
            <span className="mt-1 block line-clamp-2 text-xs leading-5 text-muted-foreground">
              {run.summary}
            </span>
          </span>
        </span>
        {isOpen ? (
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        )}
      </Button>

      {isOpen ? (
        <div className="border-t border-border px-3.5 py-3">
          <StepTimeline steps={run.steps} />
          <EvidenceDetails evidence={evidence} />
        </div>
      ) : null}
    </section>
  );
}

function StepTimeline({ steps }: { steps: EvidenceStep[] }) {
  return (
    <ol className="grid gap-0">
      {steps.map((step, index) => (
        <li className="grid grid-cols-[18px_minmax(0,1fr)] gap-2" key={step.id}>
          <div className="flex flex-col items-center">
            <StepIcon step={step} />
            {index < steps.length - 1 ? <div className="mt-1 h-full min-h-4 w-px bg-border" /> : null}
          </div>
          <div className="pb-3">
            <div className="text-xs font-medium text-foreground">{step.label}</div>
            {step.detail ? (
              <div className="mt-0.5 text-xs leading-5 text-muted-foreground">{step.detail}</div>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

function StepIcon({ step }: { step: EvidenceStep }) {
  if (step.status === "running") {
    return <Loader2 className="size-4 animate-spin text-primary" strokeWidth={1.9} />;
  }

  if (step.status === "failed") {
    return <XCircle className="size-4 text-destructive" strokeWidth={1.9} />;
  }

  if (step.status === "completed") {
    return <CheckCircle2 className="size-4 text-primary" strokeWidth={1.9} />;
  }

  return <Circle className="size-4 text-muted-foreground" strokeWidth={1.7} />;
}

function EvidenceDetails({ evidence }: { evidence: EvidenceState }) {
  return (
    <div className="mt-1 overflow-hidden rounded-md border border-border">
      <ToolList values={evidence.toolsUsed} />
      <ChartFactList values={evidence.chartFacts} />
      <KnowledgeList values={evidence.knowledgeSources} />
      <CriticStatus critic={evidence.critic} />
    </div>
  );
}

function ToolList({ values }: { values: EvidenceState["toolsUsed"] }) {
  return (
    <EvidenceSection icon={Wrench} title="工具调用">
      {values.length === 0 ? (
        <EmptyEvidence />
      ) : (
        <ul className="grid gap-2 text-xs">
          {values.map((value, index) => (
            <li className="rounded-md bg-muted px-3 py-2 leading-5" key={`${value}-${index}`}>
              {toolLabels[value] ?? value}
            </li>
          ))}
        </ul>
      )}
    </EvidenceSection>
  );
}

function ChartFactList({ values }: { values: EvidenceState["chartFacts"] }) {
  return (
    <EvidenceSection icon={Database} title="命盘事实">
      {values.length === 0 ? (
        <EmptyEvidence />
      ) : (
        <ul className="grid gap-2 text-xs">
          {values.map((fact) => (
            <li className="rounded-md bg-muted px-3 py-2 leading-5" key={fact.id}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-foreground">{fact.palace}</span>
                <Badge variant="outline">{confidenceLabels[fact.confidence]}</Badge>
              </div>
              <p className="mt-1 text-muted-foreground">{fact.rawText}</p>
              {fact.stars.length > 0 ? (
                <p className="mt-1 text-muted-foreground">星曜：{fact.stars.join("、")}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </EvidenceSection>
  );
}

function KnowledgeList({ values }: { values: EvidenceState["knowledgeSources"] }) {
  return (
    <EvidenceSection icon={FileText} title="知识来源">
      {values.length === 0 ? (
        <p className="text-xs leading-5 text-muted-foreground">
          本次没有命中知识库内容；回答会只依据命盘事实保守表达。
        </p>
      ) : (
        <ul className="grid gap-2 text-xs">
          {values.map((source) => (
            <li className="rounded-md bg-muted px-3 py-2 leading-5" key={source.chunkId}>
              <div className="font-medium text-foreground">{source.title}</div>
              <p className="mt-1 text-muted-foreground">{evidenceKnowledgeSourceLabel(source)}</p>
              {source.sourcePath ? (
                <p className="mt-1 break-words text-[11px] text-muted-foreground">
                  来源路径：{source.sourcePath}
                </p>
              ) : null}
              <p className="mt-1 text-muted-foreground">{source.excerpt}</p>
            </li>
          ))}
        </ul>
      )}
    </EvidenceSection>
  );
}

function CriticStatus({ critic }: { critic: EvidenceState["critic"] }) {
  const state = criticText[critic.status];

  return (
    <EvidenceSection icon={CheckCircle2} title="回答检查" last>
      <Badge className={state.className} variant={state.variant}>
        {state.label}
      </Badge>
      {critic.issues.length > 0 ? (
        <ul className="mt-2 grid gap-1 text-xs leading-5 text-muted-foreground">
          {critic.issues.map((issue) => (
            <li key={issue}>{issue}</li>
          ))}
        </ul>
      ) : null}
    </EvidenceSection>
  );
}

function EvidenceSection({
  icon: Icon,
  title,
  children,
  last = false,
}: {
  icon: typeof Wrench;
  title: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <section className={last ? "p-3.5" : "border-b border-border p-3.5"}>
      <div className="flex items-center gap-2 font-medium text-foreground">
        <Icon className="size-4 text-muted-foreground" strokeWidth={1.8} />
        <h3 className="text-sm">{title}</h3>
      </div>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function EmptyEvidence() {
  return (
    <p className="text-xs leading-5 text-muted-foreground">
      发送一次命盘相关问题后，这里会显示依据。
    </p>
  );
}

const confidenceLabels: Record<EvidenceState["chartFacts"][number]["confidence"], string> = {
  high: "高置信",
  medium: "中置信",
  low: "低置信",
};

const toolLabels: Record<string, string> = {
  createChart: "创建命盘",
  getCurrentChart: "读取当前命盘",
  summarizeChartFacts: "提取命盘事实",
  getPalaceAnalysis: "分析宫位",
  getStarAnalysis: "分析星曜",
  getPatternAnalysis: "分析格局",
  getLuckCycle: "读取运限",
  createAnalysisPlan: "生成分析计划",
  loadSkill: "加载主题流程",
  searchKnowledge: "检索知识",
  runResponseCritic: "检查回答",
  generateModelResponse: "调用模型",
};

const criticText: Record<
  EvidenceState["critic"]["status"],
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
