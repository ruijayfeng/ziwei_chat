"use client";

/**
 * [INPUT]: Depends on evidence state from the app shell and shadcn UI primitives
 * [OUTPUT]: Provides visible tool, chart, knowledge, and critic evidence summary
 * [POS]: Audit panel for serious answers beside chat-panel
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

import {
  evidenceKnowledgeSourceLabel,
  type EvidenceState,
} from "@/lib/ui/chat-evidence";
import { Badge } from "@/components/ui/badge";
import { BookOpenCheck, CheckCircle2, Database, FileText, Wrench } from "lucide-react";

export type { EvidenceState } from "@/lib/ui/chat-evidence";

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
            <h2 className="mt-1 text-base font-semibold text-foreground">本次回答依据</h2>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">
              查看工具调用、命盘事实、知识来源和回答检查结果。
            </p>
          </div>
        </div>
      </div>

      <div className={compact ? "" : "min-h-0 flex-1 overflow-y-auto p-4"}>
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <ToolList values={evidence.toolsUsed} />
          <ChartFactList values={evidence.chartFacts} />
          <KnowledgeList values={evidence.knowledgeSources} />
          <CriticStatus critic={evidence.critic} />
        </div>
      </div>
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
          本次没有命中本地知识库内容；回答会只依据命盘事实保守表达。
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
