import { AppLayout } from '@/components/app-layout'
import { PageHeader, RingGlyph } from '@/components/workspace/page-header'
import { PatternList } from '@/components/workspace/pattern-list'
import { WeeklyLetter } from '@/components/workspace/weekly-letter'

export default function InsightsPage() {
  return (
    <AppLayout inspector={null}>
      <div className="mx-auto flex max-w-3xl flex-col gap-10 py-2">
        <PageHeader
          eyebrow="洞见"
          title={
            <>
              过去的你，
              <br />
              正在帮助未来的你。
            </>
          }
          subtitle="AI 根据最近的记录，发现了一些你自己可能没有注意到的变化。"
          aside={<RingGlyph className="size-28 opacity-80" />}
        />

        <WeeklyLetter />

        <PatternList />

        <p className="text-center text-xs text-muted-foreground/70">
          洞见来自你的对话与记录，仅供自我觉察，不构成决策依据。
        </p>
      </div>
    </AppLayout>
  )
}
