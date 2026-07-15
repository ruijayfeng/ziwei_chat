import {
  ChartNoAxesCombined,
  History,
  MessagesSquare,
  Settings,
  Telescope,
  type LucideIcon,
} from "lucide-react";

export type WorkspaceNavItem = {
  id: "chat" | "chart" | "records" | "insights" | "settings";
  label: string;
  href: string;
  icon: LucideIcon;
};

export const workspaceNavItems: WorkspaceNavItem[] = [
  { id: "chat", label: "对话", href: "/", icon: MessagesSquare },
  { id: "chart", label: "命盘", href: "/chart", icon: ChartNoAxesCombined },
  { id: "records", label: "记录", href: "/records", icon: History },
  { id: "insights", label: "洞见", href: "/insights", icon: Telescope },
  { id: "settings", label: "设置", href: "/settings", icon: Settings },
];
