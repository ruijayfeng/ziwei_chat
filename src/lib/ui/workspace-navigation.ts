/**
 * [INPUT]: Depends on chart input shape and Lucide navigation icons
 * [OUTPUT]: Provides workspace view metadata and greeting copy
 * [POS]: Pure UI helper shared by the fixed sidebar and workspace shell
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

import type { LucideIcon } from "lucide-react";
import { CircleDashed, History, MessageCircle, PanelsTopLeft, Settings2 } from "lucide-react";

import type { CreateChartInput } from "@/lib/domain/chart";

export type WorkspaceView = "chat" | "chart" | "topics" | "records" | "settings";

export type WorkspaceNavigationItem = {
  id: WorkspaceView;
  label: string;
  icon: LucideIcon;
};

export const workspaceNavigation: readonly WorkspaceNavigationItem[] = [
  { id: "chat", label: "对话", icon: MessageCircle },
  { id: "chart", label: "命盘", icon: CircleDashed },
  { id: "topics", label: "主题", icon: PanelsTopLeft },
  { id: "records", label: "记录", icon: History },
  { id: "settings", label: "设置", icon: Settings2 },
];

export function greetingForChart(chart: CreateChartInput | null) {
  const name = chart?.name.trim();
  return name && name !== "我的命盘" ? `你好，${name}` : "你好，欢迎回来";
}
