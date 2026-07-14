"use client";

/**
 * [INPUT]: Depends on selected topic callback from the app shell and shadcn Button
 * [OUTPUT]: Provides five MVP topic entry buttons
 * [POS]: Topic shortcut component for starting grounded Ziwei chat flows
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

import { Button } from "@/components/ui/button";
import { topicEntryGridClassName } from "@/lib/ui/topic-entry-layout";
import {
  BriefcaseBusiness,
  BookOpen,
  Coins,
  HeartHandshake,
  Sparkles,
  UserRoundSearch,
} from "lucide-react";

const topics = [
  {
    id: "recent_fortune",
    label: "近期运势",
    prompt: "我最近的重点是什么？",
    description: "最近状态如何",
    icon: Sparkles,
    tone: "text-[#b66d2f] bg-[#fff7ef]",
  },
  {
    id: "career",
    label: "事业工作",
    prompt: "我最近想换工作，适合动吗？",
    description: "工作发展与选择",
    icon: BriefcaseBusiness,
    tone: "text-primary bg-accent/70",
  },
  {
    id: "relationship",
    label: "感情关系",
    prompt: "我想看看最近的感情状态。",
    description: "亲密关系与情感",
    icon: HeartHandshake,
    tone: "text-[#a85662] bg-[#fff2f4]",
  },
  {
    id: "wealth",
    label: "财富节奏",
    prompt: "我最近的财务节奏适合注意什么？",
    description: "财务节奏与机会",
    icon: Coins,
    tone: "text-[#348269] bg-[#eff9f5]",
  },
  {
    id: "personality",
    label: "性格分析",
    prompt: "这张盘怎么看我的性格倾向？",
    description: "天赋与性格倾向",
    icon: UserRoundSearch,
    tone: "text-[#5b64a9] bg-[#f1f2ff]",
  },
  {
    id: "chart_explanation",
    label: "命盘解释",
    prompt: "请解释一下我的命盘重点。",
    description: "全面了解命盘",
    icon: BookOpen,
    tone: "text-[#67617f] bg-[#f5f3f8]",
  },
];

type TopicEntryProps = {
  onSelect: (prompt: string) => void;
};

export function TopicEntry({ onSelect }: TopicEntryProps) {
  return (
    <section className="grid gap-3">
      <div className={topicEntryGridClassName}>
        {topics.map((topic) => (
          <TopicButton key={topic.id} topic={topic} onSelect={onSelect} />
        ))}
      </div>
    </section>
  );
}

function TopicButton({
  topic,
  onSelect,
}: {
  topic: (typeof topics)[number];
  onSelect: (prompt: string) => void;
}) {
  const Icon = topic.icon;

  return (
    <Button
      className="group h-auto min-h-16 justify-start overflow-hidden bg-card px-3 py-3 text-left transition-transform duration-300 ease-out hover:-translate-y-0.5 hover:border-primary/35"
      onClick={() => onSelect(topic.prompt)}
      type="button"
      variant="outline"
    >
      <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${topic.tone}`}><Icon className="size-4 transition-transform duration-500 ease-out group-hover:scale-110" /></span>
      <span className="grid gap-0.5"><span>{topic.label}</span><span className="text-xs font-normal text-muted-foreground">{topic.description ?? topic.prompt}</span></span>
    </Button>
  );
}
