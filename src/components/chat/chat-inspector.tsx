'use client'

import { Shield } from 'lucide-react'
import { BrandMark } from '@/components/brand-mark'
import { EvidenceInspector } from '@/components/chat/evidence-inspector'
import { InspectorPanel } from '@/components/inspector-panel'
import { useChatSession } from '@/components/chat/chat-session'

/**
 * Right rail for the 对话 page. While idle it shows the quiet default panel;
 * once a question is asked it becomes the traceability surface, listing the
 * exact palaces / stars each reply draws on — the product's honesty promise.
 */
export function ChatInspector() {
  const { phase, evidence, modelSettings } = useChatSession()

  if (phase === 'idle') return <InspectorPanel />

  return (
    <aside className="flex h-full w-[320px] shrink-0 flex-col overflow-y-auto px-6 py-6">
      <div className="mb-5 flex items-start gap-3">
        <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full border border-primary/25 bg-primary/10 text-primary">
          <BrandMark className="size-4" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">本次分析依据</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            这次回答引用了你命盘中的以下线索，每一句都可被追溯。
          </p>
        </div>
      </div>

      <div className="surface overflow-hidden rounded-2xl px-4">
        <EvidenceInspector evidence={evidence} modelSettings={modelSettings} />
      </div>

      <div className="mt-auto pt-6">
        <div className="flex items-center gap-2 text-xs leading-relaxed text-muted-foreground">
          <Shield className="size-3.5 shrink-0 text-primary" strokeWidth={1.75} />
          分析仅供参考，真正的决定仍在你手里。
        </div>
      </div>
    </aside>
  )
}
