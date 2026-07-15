"use client";

import { EvidenceInspector } from "./evidence-inspector";
import { useWorkspace } from "@/components/workspace/workspace-provider";

export function ChatInspector() {
  const { selectedEvidence, modelSettings } = useWorkspace();

  return (
    <div className="pb-6">
      <header className="border-b border-border/75 py-5">
        <p className="font-serif text-lg font-bold">本次分析依据</p>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">依据跟随每一条回答保存，不会混入上一轮事实。</p>
      </header>
      <EvidenceInspector evidence={selectedEvidence} modelSettings={modelSettings} />
    </div>
  );
}
