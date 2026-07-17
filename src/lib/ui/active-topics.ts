/**
 * [INPUT]: Depends on shared Intent and SkillId contracts plus Lucide icons
 * [OUTPUT]: Provides the canonical six chat-composer topic entries
 * [POS]: UI entry contract that binds consumer prompts to existing agent routes and skills
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

import {
  Briefcase,
  CircleDollarSign,
  Compass,
  Heart,
  Sparkles,
  type LucideIcon,
  ScrollText,
} from "lucide-react";

import type { Intent } from "../domain/analysis";
import type { SkillId } from "../knowledge/skill-loader";

export type ActiveTopicId =
  | "recent_fortune"
  | "career"
  | "relationship"
  | "wealth"
  | "personality"
  | "chart_explanation";

export type ActiveTopic = {
  [Id in ActiveTopicId]: {
    id: Id;
    label: string;
    question: string;
    icon: LucideIcon;
    accent: "var(--gold)" | "var(--violet)" | "var(--blue)" | "var(--emerald)";
    intent: Extract<Intent, Id>;
    skillId: Extract<SkillId, Id>;
  };
}[ActiveTopicId];

export const ACTIVE_TOPICS: readonly ActiveTopic[] = [
  {
    id: "recent_fortune",
    label: "近期运势",
    question: "我最近的状态和重点，适合如何安排？",
    icon: Compass,
    accent: "var(--gold)",
    intent: "recent_fortune",
    skillId: "recent_fortune",
  },
  {
    id: "career",
    label: "事业",
    question: "我目前的事业方向，适合关注什么？",
    icon: Briefcase,
    accent: "var(--violet)",
    intent: "career",
    skillId: "career",
  },
  {
    id: "relationship",
    label: "关系",
    question: "我和重要的人相处时，关系模式有什么特点？",
    icon: Heart,
    accent: "var(--blue)",
    intent: "relationship",
    skillId: "relationship",
  },
  {
    id: "wealth",
    label: "财富",
    question: "我在财富与收入上，更适合注意哪些趋势？",
    icon: CircleDollarSign,
    accent: "var(--emerald)",
    intent: "wealth",
    skillId: "wealth",
  },
  {
    id: "personality",
    label: "性格",
    question: "我的性格优势和容易忽略的地方是什么？",
    icon: Sparkles,
    accent: "var(--violet)",
    intent: "personality",
    skillId: "personality",
  },
  {
    id: "chart_explanation",
    label: "命盘解读",
    question: "命盘中的主要宫位和星曜分别说明什么？",
    icon: ScrollText,
    accent: "var(--blue)",
    intent: "chart_explanation",
    skillId: "chart_explanation",
  },
];
