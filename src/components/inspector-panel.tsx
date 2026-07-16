'use client'

import { cn } from '@/lib/utils'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronDown, Compass, Shield, Trash2 } from 'lucide-react'
import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useWorkspace } from '@/components/workspace/workspace-provider'

function Section({
  title,
  defaultOpen = false,
  children,
}: {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-border/60 py-3.5 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="group flex w-full items-center gap-2.5 text-left"
      >
        <span
          className={cn(
            'h-3.5 w-[2px] shrink-0 rounded-full transition-all duration-300',
            open ? 'bg-primary' : 'bg-muted-foreground/30 group-hover:bg-muted-foreground/60',
          )}
        />
        <span className="flex-1 text-sm font-medium text-foreground">{title}</span>
        <ChevronDown
          className={cn(
            'size-3.5 text-muted-foreground/70 transition-transform duration-300',
            open ? 'rotate-180 text-primary' : 'group-hover:text-foreground',
          )}
          strokeWidth={2}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="pl-[14px] pt-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function InspectorPanel() {
  const { deleteAnonymousData, dataDeleting, dataDeletionError } = useWorkspace()

  return (
    <aside className="flex h-full w-[320px] shrink-0 flex-col overflow-y-auto px-6 py-6">
      {/* Quiet companion intro — honest about what this panel is for */}
      <div className="mb-5 flex items-start gap-3">
        <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full border border-primary/25 bg-primary/10">
          <Compass className="size-4 text-primary" strokeWidth={1.75} />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">分析助手</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            提出问题后，这里会展示分析所依据的命盘线索。
          </p>
        </div>
      </div>

      <Section title="本次分析依据" defaultOpen>
        <p className="text-xs leading-relaxed text-muted-foreground">
          当你提出一个命盘相关的问题，这里会列出本次分析引用到的宫位、星曜与四化，让每一句结论都可以被追溯。
        </p>
      </Section>

      <Section title="可以这样问">
        <ul className="flex flex-col gap-2 text-xs leading-relaxed text-muted-foreground">
          {['今年的事业该如何布局？', '我的性格里有哪些优势？', '这段关系适合长期投入吗？'].map((q) => (
            <li key={q} className="flex items-start gap-2">
              <Compass className="mt-0.5 size-3.5 shrink-0 text-primary/70" strokeWidth={1.75} />
              <span>{q}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="隐私与本地资料" defaultOpen>
        <div className="mb-3 flex items-center gap-2 text-xs leading-relaxed text-muted-foreground">
          <Shield className="size-3.5 shrink-0 text-primary" strokeWidth={1.75} />
          当前为匿名使用，资料仅保存在此浏览器。
        </div>
        <AlertDialog>
          <AlertDialogTrigger
            disabled={dataDeleting}
            render={
              <button
                type="button"
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card/40 py-2.5 text-xs font-medium text-muted-foreground transition-colors duration-300 hover:border-destructive/40 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-60"
              />
            }
          >
            <Trash2 className="size-3.5" strokeWidth={1.75} />
            {dataDeleting ? '正在删除…' : '清除匿名资料数据'}
          </AlertDialogTrigger>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogMedia className="bg-destructive/10 text-destructive">
                <Trash2 />
              </AlertDialogMedia>
              <AlertDialogTitle>清除当前匿名 profile 的资料？</AlertDialogTitle>
              <AlertDialogDescription>
                这会删除命盘、对话、运行记录与当前浏览器模型设置。Beta 没有产品账号，因此这不是账号注销。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={dataDeleting}>取消</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-white hover:bg-destructive/85"
                disabled={dataDeleting}
                onClick={() => void deleteAnonymousData()}
              >
                {dataDeleting ? '正在删除…' : '确认清除'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        {dataDeletionError ? (
          <p
            className="mt-3 rounded-xl border border-destructive/35 bg-destructive/10 px-3 py-2 text-xs leading-relaxed text-destructive"
            role="alert"
          >
            {dataDeletionError}
          </p>
        ) : null}
      </Section>
    </aside>
  )
}
