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
          subtitle="AI 不只记住你的问题，也记住你的成长。点击任意一条，展开当时的解读。"
          aside={<RingGlyph className="size-28 opacity-80" />}
        />

        <LifeTimeline />
      </div>
    </AppLayout>
  )
}
