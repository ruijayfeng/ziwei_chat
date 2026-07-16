import { AppLayout } from '@/components/app-layout'
import { LifeTimeline } from '@/components/workspace/life-timeline'
import { PageHeader, RingGlyph } from '@/components/workspace/page-header'

export default function RecordsPage() {
  return (
    <AppLayout inspector={null}>
      <div className="mx-auto flex max-w-3xl flex-col gap-10 py-2">
        <PageHeader
          eyebrow="记录"
          title={
            <>
              你的人生，
              <br />
              正在一点一点被记录。
            </>
          }
          subtitle="这里保留当前匿名空间中的真实对话。点击任意一条，展开当时的完整交流。"
          aside={<RingGlyph className="size-28 opacity-80" />}
        />

        <LifeTimeline />
      </div>
    </AppLayout>
  )
}
