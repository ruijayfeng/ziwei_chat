"use client";

import { ArrowUp } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

const guidedQuestions = [
  "我想更了解自己的性格模式",
  "最近的事业选择该看哪些命盘线索？",
  "感情关系里，我容易重复什么模式？",
  "请解释我的命宫与三方四正",
];

export function ChatComposer({
  disabled,
  onSend,
  variant = "hero",
}: {
  disabled: boolean;
  onSend: (content: string) => void;
  variant?: "hero" | "docked";
}) {
  const [value, setValue] = useState("");

  function submit() {
    const content = value.trim();
    if (!content || disabled) return;
    onSend(content);
    setValue("");
  }

  return (
    <div className="w-full">
      {variant === "hero" ? (
        <div className="mb-4 flex flex-wrap gap-2" aria-label="常用问题">
          {guidedQuestions.map((question) => (
            <button
              className="min-h-11 rounded-xl border border-border/80 bg-card/45 px-3 text-left text-xs leading-5 text-muted-foreground transition-colors hover:border-primary/45 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              disabled={disabled}
              key={question}
              onClick={() => setValue(question)}
              type="button"
            >
              {question}
            </button>
          ))}
        </div>
      ) : null}

      <div className={cn(
        "flex items-end gap-3 rounded-2xl border border-border bg-card/75 p-3 transition-colors focus-within:border-primary/55",
        disabled && "opacity-70",
      )}>
        <textarea
          aria-label="输入命盘问题"
          className="max-h-40 min-h-11 flex-1 resize-none bg-transparent px-1 py-2.5 text-[15px] leading-6 text-foreground outline-none placeholder:text-muted-foreground"
          disabled={disabled}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              submit();
            }
          }}
          placeholder={disabled ? "正在完成本次分析…" : "从一件具体的事开始问"}
          rows={1}
          value={value}
        />
        <button
          aria-label="发送问题"
          className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-cinnabar text-white transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-30"
          disabled={disabled || !value.trim()}
          onClick={submit}
          type="button"
        >
          <ArrowUp className="size-[18px]" strokeWidth={2} />
        </button>
      </div>
      <p className="mt-2.5 text-center text-[11px] leading-5 text-muted-foreground">
        命盘分析用于观察倾向，不替代医疗、法律、投资等专业判断。
      </p>
    </div>
  );
}
