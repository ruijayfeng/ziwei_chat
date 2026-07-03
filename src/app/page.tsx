/**
 * [INPUT]: Depends on Next.js App Router rendering and global Tailwind styles
 * [OUTPUT]: Provides the Ziwei Chat MVP entry page
 * [POS]: App shell placeholder before dedicated onboarding and chat components exist
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

const foundationItems = [
  "匿名 profile/workspace",
  "iztro 确定性排盘",
  "Intent Router + Planner + Tool Runner",
  "本地 Markdown/关键词知识检索",
  "结论、命盘依据、现实解释、建议、追问",
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f7f4ed] text-[#1f2933]">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-10 sm:px-10 lg:px-12">
        <header className="flex items-center justify-between border-b border-[#d8d0c2] pb-5">
          <span className="text-sm font-semibold uppercase tracking-[0.18em] text-[#6f5d48]">
            Ziwei Chat
          </span>
          <span className="text-sm text-[#5c6670]">Open-source MVP</span>
        </header>

        <div className="grid flex-1 items-center gap-10 py-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="max-w-2xl">
            <p className="mb-4 text-sm font-medium text-[#7c4d2b]">
              紫微斗数垂直 Agent
            </p>
            <h1 className="text-4xl font-semibold leading-tight text-[#17202a] sm:text-5xl">
              先排盘，再分析；先给依据，再给建议。
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-[#4f5d68]">
              Ziwei Chat 的首版目标是跑通匿名命盘、工具调用、本地知识检索、回答自检和会话保存，而不是做一个只靠提示词的聊天壳。
            </p>
          </div>

          <div className="grid gap-3 rounded border border-[#d8d0c2] bg-white/70 p-5 shadow-sm">
            {foundationItems.map((item) => (
              <div
                className="flex items-center justify-between gap-4 border-b border-[#ebe4d8] py-3 last:border-b-0"
                key={item}
              >
                <span className="text-sm text-[#33414d]">{item}</span>
                <span className="text-xs font-semibold uppercase text-[#8a5a35]">
                  planned
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
