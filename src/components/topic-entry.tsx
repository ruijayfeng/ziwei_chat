"use client";

/**
 * [INPUT]: Depends on selected topic callback from the app shell
 * [OUTPUT]: Provides five MVP topic entry buttons
 * [POS]: Topic shortcut component for starting grounded Ziwei chat flows
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

const topics = [
  { id: "recent_fortune", label: "近期运势", prompt: "我最近的重点是什么？" },
  { id: "career", label: "事业工作", prompt: "我最近想换工作，适合动吗？" },
  { id: "relationship", label: "感情关系", prompt: "我想看看最近的感情状态。" },
  { id: "wealth", label: "财富节奏", prompt: "我最近的财务节奏适合注意什么？" },
  { id: "personality", label: "性格分析", prompt: "这张盘怎么看我的性格倾向？" },
];

type TopicEntryProps = {
  onSelect: (prompt: string) => void;
};

export function TopicEntry({ onSelect }: TopicEntryProps) {
  return (
    <div className="grid gap-2">
      <h2 className="text-sm font-semibold text-zinc-950">主题入口</h2>
      <div className="flex flex-wrap gap-2">
        {topics.map((topic) => (
          <button
            className="h-9 rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-800 transition hover:border-teal-700 hover:text-teal-800"
            key={topic.id}
            onClick={() => onSelect(topic.prompt)}
            type="button"
          >
            {topic.label}
          </button>
        ))}
      </div>
    </div>
  );
}
