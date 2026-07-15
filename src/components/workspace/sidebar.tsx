"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ZiweiLogotype } from "@/components/brand/ziwei-logotype";
import { cn } from "@/lib/utils";
import { workspaceNavItems } from "./nav-items";

export function WorkspaceSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden min-h-0 border-r border-border/70 bg-sidebar/90 px-5 py-7 lg:flex lg:flex-col">
      <ZiweiLogotype className="px-2" />
      <nav aria-label="主要导航" className="mt-12 grid gap-1.5">
        {workspaceNavItems.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
              href={item.href}
              key={item.id}
            >
              <Icon className="size-[18px]" strokeWidth={1.6} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto border-t border-border/70 px-2 pt-5 text-xs leading-5 text-muted-foreground">
        匿名使用 · 命盘事实来自 iztro
      </div>
    </aside>
  );
}
