"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelRight } from "lucide-react";

import { ZiweiLogotype } from "@/components/brand/ziwei-logotype";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { workspaceNavItems } from "./nav-items";

export function WorkspaceTopBar({
  inspector,
  inspectorOpen,
  onInspectorOpenChange,
}: {
  inspector: React.ReactNode;
  inspectorOpen: boolean;
  onInspectorOpenChange: (open: boolean) => void;
}) {
  return (
    <header className="flex min-h-16 items-center justify-between border-b border-border/70 px-4 sm:px-6 xl:hidden">
      <ZiweiLogotype className="lg:invisible" />
      <Sheet open={inspectorOpen} onOpenChange={(open) => onInspectorOpenChange(open)}>
        <SheetTrigger render={<Button aria-label="打开分析依据" size="icon-lg" variant="ghost" />}>
          <PanelRight />
        </SheetTrigger>
        <SheetContent className="max-h-[88dvh] rounded-t-3xl border-border bg-card" side="bottom">
          <SheetHeader className="border-b border-border">
            <SheetTitle>分析依据</SheetTitle>
            <SheetDescription>查看当前页面对应的命盘事实与运行状态。</SheetDescription>
          </SheetHeader>
          <div className="min-h-0 overflow-y-auto px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            {inspector}
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}

export function WorkspaceTabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="移动导航"
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-background/95 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
    >
      {workspaceNavItems.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-16 flex-col items-center justify-center gap-1 text-[11px]",
              active ? "text-foreground" : "text-muted-foreground",
            )}
            href={item.href}
            key={item.id}
          >
            <Icon className="size-[18px]" strokeWidth={1.6} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
