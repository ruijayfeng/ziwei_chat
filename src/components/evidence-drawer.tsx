"use client";

/**
 * [INPUT]: Depends on evidence state from the app shell
 * [OUTPUT]: Provides visible tool, chart, knowledge, and critic evidence summary
 * [POS]: Audit panel for serious answers beside chat-panel
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

export type EvidenceState = {
  toolsUsed: string[];
  chartFacts: string[];
  knowledgeSources: string[];
  critic: "not_run" | "passed" | "needs_review";
};

type EvidenceDrawerProps = {
  evidence: EvidenceState;
};

export function EvidenceDrawer({ evidence }: EvidenceDrawerProps) {
  return (
    <aside className="rounded-md border border-zinc-300 bg-white p-5">
      <h2 className="text-lg font-semibold text-zinc-950">依据</h2>
      <div className="mt-4 grid gap-5 text-sm">
        <EvidenceList title="工具" values={evidence.toolsUsed} />
        <EvidenceList title="命盘事实" values={evidence.chartFacts} />
        <EvidenceList title="知识来源" values={evidence.knowledgeSources} />
        <div>
          <p className="font-medium text-zinc-800">Critic</p>
          <p className="mt-1 text-zinc-600">{criticText[evidence.critic]}</p>
        </div>
      </div>
    </aside>
  );
}

function EvidenceList({ title, values }: { title: string; values: string[] }) {
  return (
    <div>
      <p className="font-medium text-zinc-800">{title}</p>
      {values.length === 0 ? (
        <p className="mt-1 text-zinc-500">等待下一次 serious analysis。</p>
      ) : (
        <ul className="mt-2 grid gap-2">
          {values.map((value) => (
            <li className="rounded bg-zinc-100 px-3 py-2 text-zinc-700" key={value}>
              {value}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const criticText: Record<EvidenceState["critic"], string> = {
  not_run: "尚未运行",
  passed: "已通过",
  needs_review: "需要复核",
};
