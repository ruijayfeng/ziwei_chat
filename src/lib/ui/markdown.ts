/**
 * [INPUT]: Depends on plain assistant response text
 * [OUTPUT]: Provides a small, HTML-free Markdown syntax tree for chat rendering
 * [POS]: UI safety boundary shared by progressive and final answer renderers
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

export type MarkdownInline =
  | { type: "text"; value: string }
  | { type: "strong"; children: MarkdownInline[] }
  | { type: "emphasis"; children: MarkdownInline[] }
  | { type: "code"; value: string };

export type MarkdownBlock =
  | { type: "heading"; depth: number; children: MarkdownInline[] }
  | { type: "paragraph"; children: MarkdownInline[] }
  | { type: "list"; items: MarkdownInline[][] }
  | { type: "quote"; children: MarkdownInline[] }
  | { type: "divider" };

export function parseMarkdown(content: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  const lines = content.replace(/\r\n?/g, "\n").split("\n");
  let paragraph: string[] = [];
  let listItems: MarkdownInline[][] = [];

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      blocks.push({ type: "paragraph", children: parseInline(paragraph.join("\n")) });
      paragraph = [];
    }
  };
  const flushList = () => {
    if (listItems.length > 0) {
      blocks.push({ type: "list", items: listItems });
      listItems = [];
    }
  };

  for (const line of lines) {
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    const list = line.match(/^[-*+]\s+(.+)$/);
    const quote = line.match(/^>\s?(.*)$/);

    if (!line.trim()) {
      flushParagraph();
      flushList();
      continue;
    }
    if (line.trim() === "---") {
      flushParagraph();
      flushList();
      blocks.push({ type: "divider" });
      continue;
    }
    if (heading) {
      flushParagraph();
      flushList();
      blocks.push({ type: "heading", depth: heading[1].length, children: parseInline(heading[2]) });
      continue;
    }
    if (list) {
      flushParagraph();
      listItems.push(parseInline(list[1]));
      continue;
    }
    if (quote) {
      flushParagraph();
      flushList();
      blocks.push({ type: "quote", children: parseInline(quote[1]) });
      continue;
    }
    flushList();
    paragraph.push(line);
  }

  flushParagraph();
  flushList();
  return blocks;
}

function parseInline(value: string): MarkdownInline[] {
  const nodes: MarkdownInline[] = [];
  const pattern = /(\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_|`[^`]+`)/g;
  let cursor = 0;

  for (const match of value.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > cursor) nodes.push({ type: "text", value: value.slice(cursor, index) });
    const token = match[0];
    if (token.startsWith("**") || token.startsWith("__")) {
      nodes.push({ type: "strong", children: parseInline(token.slice(2, -2)) });
    } else if (token.startsWith("`") && token.endsWith("`")) {
      nodes.push({ type: "code", value: token.slice(1, -1) });
    } else {
      nodes.push({ type: "emphasis", children: parseInline(token.slice(1, -1)) });
    }
    cursor = index + token.length;
  }

  if (cursor < value.length) nodes.push({ type: "text", value: value.slice(cursor) });
  return nodes;
}
