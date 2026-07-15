import Link from "next/link";

import { cn } from "@/lib/utils";

export function ZiweiLogotype({ className }: { className?: string }) {
  return (
    <Link className={cn("inline-flex items-center gap-3", className)} href="/">
      <span className="flex size-9 items-center justify-center rounded-full border border-cinnabar/45 text-sm font-bold text-cinnabar">
        紫
      </span>
      <span className="font-serif text-xl font-bold tracking-[0.08em] text-foreground">
        紫微知道
      </span>
    </Link>
  );
}
