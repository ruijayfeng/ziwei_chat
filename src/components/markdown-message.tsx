/**
 * [INPUT]: Depends on the safe Markdown tree from lib/ui/markdown
 * [OUTPUT]: Provides readable, HTML-free Markdown answer rendering
 * [POS]: Ordinary-prose fallback and progressive answer renderer for chat
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

import { Fragment } from "react";

import { parseMarkdown, type MarkdownInline } from "@/lib/ui/markdown";

export function MarkdownMessage({ content }: { content: string }) {
  return (
    <article className="chat-markdown max-w-[70ch] text-[0.9375rem] leading-7 text-foreground">
      {parseMarkdown(content).map((block, index) => {
        if (block.type === "heading") {
          const Tag = block.depth === 1 ? "h3" : block.depth === 2 ? "h4" : "h5";
          return <Tag className="mt-7 text-balance font-semibold text-foreground first:mt-0" key={index}>{renderInline(block.children)}</Tag>;
        }
        if (block.type === "list") {
          return <ul className="my-4 grid gap-2 pl-5 marker:text-primary" key={index}>{block.items.map((item, itemIndex) => <li className="pl-1" key={itemIndex}>{renderInline(item)}</li>)}</ul>;
        }
        if (block.type === "quote") {
          return <blockquote className="my-5 border-l-2 border-primary/45 bg-accent/45 py-2 pl-4 text-muted-foreground" key={index}>{renderInline(block.children)}</blockquote>;
        }
        if (block.type === "divider") {
          return <hr className="my-6 border-border" key={index} />;
        }
        return <p className="my-4 whitespace-pre-wrap first:mt-0 last:mb-0" key={index}>{renderInline(block.children)}</p>;
      })}
    </article>
  );
}

function renderInline(nodes: MarkdownInline[]) {
  return nodes.map((node, index) => {
    if (node.type === "strong") return <strong className="font-semibold text-foreground" key={index}>{renderInline(node.children)}</strong>;
    if (node.type === "emphasis") return <em key={index}>{renderInline(node.children)}</em>;
    if (node.type === "code") return <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.82em] text-primary-strong" key={index}>{node.value}</code>;
    return <Fragment key={index}>{node.value}</Fragment>;
  });
}
