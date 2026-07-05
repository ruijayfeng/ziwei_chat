"use client";

/**
 * [INPUT]: Depends on selected topic callback from the app shell and shadcn Button
 * [OUTPUT]: Provides five MVP topic entry buttons
 * [POS]: Topic shortcut component for starting grounded Ziwei chat flows
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

import { Button } from "@/components/ui/button";
import {
  BriefcaseBusiness,
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
    icon: Sparkles,
  },
  {
    id: "career",
    label: "事业工作",
    prompt: "我最近想换工作，适合动吗？",
    icon: BriefcaseBusiness,
  },
  {
    id: "relationship",
    label: "感情关系",
    prompt: "我想看看最近的感情状态。",
    icon: HeartHandshake,
  },
  {
    id: "wealth",
    label: "财富节奏",
    prompt: "我最近的财务节奏适合注意什么？",
    icon: Coins,
  },
  {
    id: "personality",
    label: "性格分析",
    prompt: "这张盘怎么看我的性格倾向？",
    icon: UserRoundSearch,
  },
];

type TopicEntryProps = {
  onSelect: (prompt: string) => void;
};

export function TopicEntry({ onSelect }: TopicEntryProps) {
  return (
    <section className="grid gap-3">
      <div>
        <p className="text-xs font-medium text-muted-foreground">Quick topics</p>
        <h2 className="mt-1 text-sm font-semibold text-foreground">主题入口</h2>
      </div>
      <div className="grid gap-2">
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
      className="justify-start"
      onClick={() => onSelect(topic.prompt)}
      type="button"
      variant="outline"
    >
      <Icon data-icon="inline-start" />
      {topic.label}
    </Button>
  );
}
