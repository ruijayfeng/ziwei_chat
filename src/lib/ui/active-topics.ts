/**
 * [INPUT]: Depends on shared Intent and SkillId contracts plus Lucide icons
 * [OUTPUT]: Provides the canonical six chat-composer topic entries and their safe-copy validator
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

const UNSAFE_STARTER_PATTERNS: ReadonlyArray<{
  issue: string;
  pattern: RegExp;
}> = [
  { issue: "guaranteed outcome", pattern: /保证|一定|必然|百分之百|肯定会/ },
  { issue: "irreversible decision", pattern: /必须.{0,8}(辞职|离婚|创业|退学)|该不该.{0,8}(辞职|离婚|创业|退学)/ },
  { issue: "investment instruction", pattern: /股票|基金|加仓|减仓|买入|卖出|投资建议/ },
  { issue: "medical instruction", pattern: /诊断|治疗方案|处方|用药/ },
  { issue: "legal instruction", pattern: /起诉|法律意见|律师建议/ },
  { issue: "exact future date", pattern: /(?:20\d{2})\s*年\s*(?:1[0-2]|0?[1-9])\s*月\s*(?:3[01]|[12]?\d)\s*日/ },
  { issue: "annual or multi-year report", pattern: /年度.{0,8}报告|(?:未来|连续|完整)?[一二三四五六七八九十\d]+年.{0,8}(运势|报告)/ },
];

export function starterQuestionSafetyIssues(question: string): string[] {
  return UNSAFE_STARTER_PATTERNS
    .filter(({ pattern }) => pattern.test(question))
    .map(({ issue }) => issue);
}

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
