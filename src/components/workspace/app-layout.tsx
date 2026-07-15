"use client";

import { usePathname } from "next/navigation";

import { ChatInspector } from "@/components/chat/chat-inspector";
import { useWorkspace } from "./workspace-provider";
import { WorkspaceSidebar } from "./sidebar";
import { WorkspaceTabBar, WorkspaceTopBar } from "./mobile-chrome";

function PlaceholderInspector() {
  const pathname = usePathname();
  return (
    <div className="py-5 text-sm leading-7 text-muted-foreground">
      <p className="font-bold text-foreground">当前上下文</p>
      <p className="mt-2">
        {pathname === "/"
          ? "发送问题后，这里会显示本次分析使用的真实命盘事实、工具、知识来源与检查结果。"
          : "该页面接入真实数据后，这里会显示与当前内容对应的可追溯依据。"}
      </p>
    </div>
  );
}

export function WorkspaceAppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { inspectorOpen, setInspectorOpen } = useWorkspace();
  const inspector = pathname === "/" ? <ChatInspector /> : <PlaceholderInspector />;

  return (
    <div className="grid min-h-[100dvh] grid-cols-1 bg-background text-foreground lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)_340px]">
      <WorkspaceSidebar />
      <div className="flex min-h-[100dvh] min-w-0 flex-col">
        <WorkspaceTopBar inspector={inspector} inspectorOpen={inspectorOpen} onInspectorOpenChange={setInspectorOpen} />
        <main className="min-h-0 flex-1 overflow-y-auto px-4 pb-24 pt-6 sm:px-7 lg:px-10 lg:pb-8 xl:px-12">
          {children}
        </main>
      </div>
      <aside className="hidden min-h-0 border-l border-border/70 bg-card/55 px-6 xl:block">
        {inspector}
      </aside>
      <WorkspaceTabBar />
    </div>
  );
}
