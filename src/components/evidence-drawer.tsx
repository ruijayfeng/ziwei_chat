"use client";

/**
 * [INPUT]: Depends on evidence runs, chart facts, sources, critic state, and browser-local model settings
 * [OUTPUT]: Provides analysis process, evidence, runtime, and privacy panels
 * [POS]: Right context rail for the chat workspace and compact mobile evidence sheet
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

import { CheckCircle2, Circle, Loader2, ShieldCheck, XCircle } from "lucide-react";
import { retrievalLabel, runtimeLabel, type ModelSettingsDraft } from "@/lib/ui/model-settings";
import { evidenceGenerationTone, evidenceKnowledgeSourceLabel, evidenceRetrievalLabel, evidenceStepLabel, type EvidenceState, type EvidenceStep } from "@/lib/ui/chat-evidence";
import { Badge } from "@/components/ui/badge";

export type { EvidenceState } from "@/lib/ui/chat-evidence";

type EvidenceDrawerProps = { evidence: EvidenceState; modelSettings: ModelSettingsDraft; localDataActions: React.ReactNode; compact?: boolean };

export function EvidenceDrawer({ evidence, modelSettings, localDataActions, compact = false }: EvidenceDrawerProps) {
  const latestRun = evidence.runs.at(-1);
  const shellClass = compact ? "grid gap-4" : "evidence-rail flex h-full min-h-0 flex-col overflow-y-auto px-4 py-5";
  return <div className={shellClass}>
    <ProcessPanel compact={compact} run={latestRun} />
    <FactsPanel compact={compact} evidence={evidence} />
    <RuntimePanel compact={compact} evidence={evidence} modelSettings={modelSettings} />
    <section className={panelClass(compact)}>
      <div className="flex items-center gap-2"><ShieldCheck className="size-4 text-primary" /><h2 className="text-sm font-semibold">隐私与本地资料</h2></div>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">当前为匿名使用，模型配置与资料仅保存在当前浏览器。</p>
      <div className="mt-3">{localDataActions}</div>
    </section>
  </div>;
}

function ProcessPanel({ run, compact }: { run: EvidenceState["runs"][number] | undefined; compact: boolean }) {
  const completed = run?.status === "completed";
  return <section className={panelClass(compact)}>
    <div className="flex items-center justify-between gap-2"><h2 className="text-base font-semibold">分析过程</h2><span className={`flex items-center gap-1.5 text-xs ${completed ? "text-success" : "text-muted-foreground"}`}><span className={`size-2 rounded-full ${completed ? "bg-success" : "bg-muted-foreground/50"}`} />{completed ? "已完成" : run?.status === "running" ? "分析中" : run?.status === "failed" ? "未完成" : "等待提问"}</span></div>
    {run ? <><p className="mt-3 text-xs text-muted-foreground">本次问题：{run.summary}</p><ol className="mt-4 grid gap-3">{run.steps.map((step) => <li className="grid grid-cols-[18px_minmax(0,1fr)] gap-2" key={step.id}><div className="flex flex-col items-center"><StepIcon step={step} /></div><div><div className="flex items-center justify-between gap-2"><p className="text-sm font-medium">{step.label}</p><span className="text-xs text-muted-foreground">{evidenceStepLabel(step)}</span></div>{step.detail ? <p className="mt-1 text-xs leading-5 text-muted-foreground">{step.detail}</p> : null}</div></li>)}</ol></> : <p className="mt-4 text-sm leading-6 text-muted-foreground">发送命盘相关问题后，这里会显示本次分析过程。</p>}
  </section>;
}

function FactsPanel({ evidence, compact }: { evidence: EvidenceState; compact: boolean }) {
  return <section className={panelClass(compact)}><h2 className="text-sm font-semibold">本次分析依据</h2>{evidence.chartFacts.length > 0 ? <div className="mt-3 grid gap-2">{evidence.chartFacts.slice(0, 5).map((fact) => <div className="flex items-start justify-between gap-3 text-xs" key={fact.id}><div><span className="font-medium text-foreground">{fact.palace}</span><span className="ml-2 text-muted-foreground">{fact.stars.length > 0 ? fact.stars.join("、") : fact.rawText}</span></div><span className="shrink-0 text-muted-foreground">{confidenceLabel(fact.confidence)}</span></div>)}</div> : <p className="mt-3 text-xs leading-5 text-muted-foreground">完成一次命盘分析后，这里会展示被使用的命盘事实。</p>}{evidence.knowledgeSources.length > 0 ? <div className="mt-4 border-t border-border pt-4"><h3 className="text-sm font-medium">参考知识来源</h3><ul className="mt-2 grid gap-2">{evidence.knowledgeSources.slice(0, 4).map((source) => <li className="text-xs" key={source.chunkId}><p className="font-medium">{source.title}</p><p className="mt-0.5 line-clamp-2 leading-5 text-muted-foreground">{evidenceKnowledgeSourceLabel(source)}</p></li>)}</ul></div> : null}{evidence.critic.status !== "not_run" ? <div className="mt-4 border-t border-border pt-3"><Badge className={evidence.critic.status === "passed" ? "bg-success-muted text-success" : ""} variant={evidence.critic.status === "passed" ? "secondary" : "destructive"}>{evidence.critic.status === "passed" ? "已通过检查" : "需要复核"}</Badge></div> : null}</section>;
}

function RuntimePanel({ modelSettings, evidence, compact }: { modelSettings: ModelSettingsDraft; evidence: EvidenceState; compact: boolean }) {
  const tone = evidenceGenerationTone(evidence.generation);
  const rows = [
    ["运行模式", runtimeLabel(modelSettings), "neutral"],
    ["本次生成", generationLabel(evidence.generation), tone],
    ["知识检索", evidenceRetrievalLabel(evidence) ?? retrievalLabel(modelSettings), "neutral"],
    ["Embedding", modelSettings.embedding.provider === "disabled" ? "未配置" : "已配置", "neutral"],
  ] as const;
  return <section className={panelClass(compact)}><h2 className="text-sm font-semibold">模型与运行状态</h2><dl className="mt-3 grid gap-3">{rows.map(([label, value, rowTone]) => <div className="flex items-center justify-between gap-3 text-xs" key={label}><dt className="text-muted-foreground">{label}</dt><dd className="flex items-center gap-2 text-right text-foreground"><span>{value}</span><span className={`size-2 rounded-full ${runtimeToneClass(rowTone)}`} /></dd></div>)}</dl></section>;
}

function panelClass(compact: boolean) { return compact ? "rounded-xl border border-border bg-card p-4" : "border-b border-border/80 py-5 first:pt-0 last:border-b-0"; }
function generationLabel(generation: EvidenceState["generation"]) { if (generation.mode === "model") return "LLM 已生成"; if (generation.mode === "model_pending") return "LLM 生成中"; if (generation.mode === "model_required") return "等待配置 LLM"; if (generation.mode === "model_failed") return "LLM 未完成"; if (generation.mode === "deterministic_fallback") return "规则回退（已标注）"; return "未生成"; }
function runtimeToneClass(tone: "success" | "pending" | "failed" | "neutral") { return tone === "success" ? "bg-success" : tone === "pending" ? "bg-primary" : tone === "failed" ? "bg-destructive" : "bg-muted-foreground/45"; }
function StepIcon({ step }: { step: EvidenceStep }) { if (step.status === "running") return <Loader2 className="size-4 animate-spin text-primary" />; if (step.status === "completed") return <CheckCircle2 className="size-4 text-primary" />; if (step.status === "failed") return <XCircle className="size-4 text-destructive" />; return <Circle className="size-4 text-muted-foreground" />; }
function confidenceLabel(confidence: "high" | "medium" | "low") { return confidence === "high" ? "高置信" : confidence === "medium" ? "中置信" : "低置信"; }
