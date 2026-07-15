import { CheckCircle2, Circle, Loader2, XCircle } from "lucide-react";

import {
  evidenceGenerationTone,
  evidenceKnowledgeSourceLabel,
  evidenceRetrievalLabel,
  evidenceStepLabel,
  type EvidenceState,
  type EvidenceStep,
} from "@/lib/ui/chat-evidence";
import { retrievalLabel, runtimeLabel, type ModelSettingsDraft } from "@/lib/ui/model-settings";

export function EvidenceInspector({ evidence, modelSettings }: { evidence: EvidenceState; modelSettings: ModelSettingsDraft }) {
  const run = evidence.runs.at(-1);

  return (
    <div className="divide-y divide-border/75 text-sm">
      <InspectorSection title="分析过程">
        {run ? (
          <ol className="grid gap-3">
            {run.steps.map((step) => (
              <li className="grid grid-cols-[18px_minmax(0,1fr)] gap-2" key={step.id}>
                <StepIcon step={step} />
                <div><p>{step.label} · <span className="text-muted-foreground">{evidenceStepLabel(step)}</span></p>{step.detail ? <p className="mt-1 text-xs leading-5 text-muted-foreground">{step.detail}</p> : null}</div>
              </li>
            ))}
          </ol>
        ) : <EmptyText>发送问题后显示本次 Agent 运行步骤。</EmptyText>}
      </InspectorSection>

      <InspectorSection title="工具调用">
        {evidence.toolsUsed.length ? <TagList values={evidence.toolsUsed} /> : <EmptyText>尚未调用工具。</EmptyText>}
      </InspectorSection>

      <InspectorSection title="命盘事实">
        {evidence.chartFacts.length ? (
          <ul className="grid gap-3">{evidence.chartFacts.map((fact) => <li key={fact.id}><p className="font-bold">{fact.palace} · {fact.stars.join("、") || "宫位事实"}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{fact.rawText}</p></li>)}</ul>
        ) : <EmptyText>本次回答尚无命盘事实。</EmptyText>}
      </InspectorSection>

      <InspectorSection title="知识来源">
        {evidence.knowledgeSources.length ? (
          <ul className="grid gap-3">{evidence.knowledgeSources.map((source) => <li key={source.chunkId}><p className="font-bold">{source.title}</p><p className="mt-1 text-xs text-muted-foreground">{evidenceKnowledgeSourceLabel(source)}</p>{source.excerpt ? <p className="mt-1 line-clamp-3 text-xs leading-5 text-muted-foreground">{source.excerpt}</p> : null}</li>)}</ul>
        ) : <EmptyText>{evidenceRetrievalLabel(evidence) ?? "本次尚无知识来源。"}</EmptyText>}
      </InspectorSection>

      <InspectorSection title="critic 检查">
        <p className={evidence.critic.status === "passed" ? "text-success" : evidence.critic.status === "needs_review" ? "text-destructive" : "text-muted-foreground"}>
          {evidence.critic.status === "passed" ? "已通过事实与安全检查" : evidence.critic.status === "needs_review" ? "未通过，需要重试或复核" : "尚未运行"}
        </p>
        {evidence.critic.issues.length ? <ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-5 text-muted-foreground">{evidence.critic.issues.map((issue) => <li key={issue}>{issue}</li>)}</ul> : null}
      </InspectorSection>

      <InspectorSection title="生成状态">
        <dl className="grid gap-2 text-xs">
          <StatusRow label="回答模型" value={runtimeLabel(modelSettings)} />
          <StatusRow label="本次生成" value={generationLabel(evidence)} tone={evidenceGenerationTone(evidence.generation)} />
          <StatusRow label="知识检索" value={evidenceRetrievalLabel(evidence) ?? retrievalLabel(modelSettings)} />
        </dl>
        {evidence.generation.detail ? <p className="mt-3 text-xs leading-5 text-muted-foreground">{evidence.generation.detail}</p> : null}
      </InspectorSection>
    </div>
  );
}

function InspectorSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="py-5"><h2 className="mb-3 font-serif text-base font-bold">{title}</h2>{children}</section>;
}
function EmptyText({ children }: { children: React.ReactNode }) { return <p className="text-xs leading-5 text-muted-foreground">{children}</p>; }
function TagList({ values }: { values: string[] }) { return <ul className="flex flex-wrap gap-2">{values.map((value) => <li className="rounded-md border border-border px-2 py-1 font-mono text-[11px] text-muted-foreground" key={value}>{value}</li>)}</ul>; }
function StatusRow({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "success" | "pending" | "failed" | "neutral" }) { return <div className="flex items-center justify-between gap-3"><dt className="text-muted-foreground">{label}</dt><dd className="flex items-center gap-2 text-right"><span>{value}</span><span className={tone === "success" ? "size-2 rounded-full bg-success" : tone === "failed" ? "size-2 rounded-full bg-destructive" : tone === "pending" ? "size-2 rounded-full bg-primary" : "size-2 rounded-full bg-muted-foreground/40"} /></dd></div>; }
function StepIcon({ step }: { step: EvidenceStep }) { if (step.status === "running") return <Loader2 className="size-4 text-primary" />; if (step.status === "completed") return <CheckCircle2 className="size-4 text-success" />; if (step.status === "failed") return <XCircle className="size-4 text-destructive" />; return <Circle className="size-4 text-muted-foreground" />; }
function generationLabel(evidence: EvidenceState) { const mode = evidence.generation.mode; if (mode === "model") return "LLM 已生成"; if (mode === "model_pending") return "模型处理中"; if (mode === "model_required") return "等待配置模型"; if (mode === "model_failed") return "模型未完成"; if (mode === "deterministic_fallback") return "确定性回退"; return "未生成"; }
