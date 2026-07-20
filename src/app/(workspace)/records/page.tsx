import { AppLayout } from '@/components/app-layout'
import { LifeTimeline } from '@/components/workspace/life-timeline'
import { PageHeader, RingGlyph } from '@/components/workspace/page-header'

export default function RecordsPage() {
  return (
    <AppLayout inspector={null}>
      <div className="mx-auto flex max-w-3xl flex-col gap-10 py-2">
        <PageHeader
          eyebrow="对话记忆"
          title={
            <>
              你关心过的事，
              <br />
              可以从这里继续。
            </>
          }
          subtitle="这里保留当前匿名空间中的真实对话。打开一段记录回看重点，或直接回到原来的上下文继续聊。"
          aside={<RingGlyph className="size-28 opacity-80" />}
        />

        <LifeTimeline />
      </div>
    </AppLayout>
  )
}
