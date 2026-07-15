import Link from "next/link";

export default function HomePage() {
  return (
    <section className="mx-auto flex min-h-[calc(100dvh-9rem)] max-w-5xl flex-col justify-center py-10">
      <p className="text-sm text-cinnabar">对话工作台</p>
      <h1 className="mt-5 max-w-3xl font-serif text-4xl font-bold leading-tight tracking-[-0.02em] sm:text-6xl">
        从真实命盘出发，慢慢把问题说清楚。
      </h1>
      <p className="mt-6 max-w-2xl text-base leading-8 text-muted-foreground">
        新版对话区正在接入已经跑通的 Agent 流程。命盘、工具、知识来源与检查结果仍会完整保留。
      </p>
      <div className="mt-10 flex flex-wrap gap-3">
        <Link className="rounded-xl bg-cinnabar px-5 py-3 text-sm font-bold text-white" href="/chart">
          先查看命盘
        </Link>
        <Link className="rounded-xl border border-border px-5 py-3 text-sm text-foreground" href="/settings">
          配置回答模型
        </Link>
      </div>
    </section>
  );
}
