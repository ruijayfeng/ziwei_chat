import { AppLayout } from '@/components/app-layout'
import { InsightsController } from '@/components/insights/insights-controller'
import { PageHeader, RingGlyph } from '@/components/workspace/page-header'

export default function InsightsPage() {
  return (
    <AppLayout inspector={null}>
      <div className="mx-auto flex max-w-3xl flex-col gap-10 py-2">
        <PageHeader
          eyebrow="洞见"
          title="从真实对话里，看见反复出现的线索。"
          subtitle="积累足够的真实记录后，这里会生成带来源的周信与观察。"
          aside={<RingGlyph className="size-28 opacity-80" />}
        />

        <InsightsController />
      </div>
    </AppLayout>
  )
}
