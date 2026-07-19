# Chat Reveal And Markdown Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Unicode-safe progressive answer reveal and a distinctive semantic Markdown renderer to assistant messages.

**Architecture:** Keep transport state as the source of truth. A focused presentation hook derives visible content from the accumulated answer, while a dedicated Markdown component owns semantic rendering and styles.

**Tech Stack:** React 19, Motion, Tailwind CSS, react-markdown, remark-gfm, Vitest, Testing Library.

## Global Constraints

- Do not change API, critic, evidence, or chart-fact behavior.
- Respect `prefers-reduced-motion`.
- Preserve copy and retry behavior.
- Keep body text at least 1rem and prose within a readable measure.

### Task 1: Progressive Reveal

**Files:**
- Modify: `src/lib/ui/streaming-reveal.ts`
- Create: `src/components/chat/use-progressive-reveal.ts`
- Test: `tests/ui/streaming-reveal.test.ts`

- [ ] Add failing tests for adaptive Unicode-safe reveal progression.
- [ ] Run the focused test and verify the expected failure.
- [ ] Implement the reveal scheduler and React hook.
- [ ] Run the focused test and verify it passes.

### Task 2: Markdown Renderer

**Files:**
- Create: `src/components/chat/markdown-answer.tsx`
- Create: `tests/ui/markdown-answer.test.tsx`
- Modify: `package.json`

- [ ] Add failing semantic rendering tests for headings, lists, quotes, links, code, and tables.
- [ ] Install `react-markdown` and `remark-gfm`.
- [ ] Implement the renderer with project-specific component styles.
- [ ] Run the focused renderer tests and verify they pass.

### Task 3: Message Integration And Verification

**Files:**
- Modify: `src/components/chat/message-bubble.tsx`
- Modify: `src/components/AGENTS.md`
- Modify: `src/lib/AGENTS.md`

- [ ] Integrate progressive content and Markdown rendering in assistant messages.
- [ ] Keep copy actions bound to the complete answer and caret state bound to reveal completion.
- [ ] Run typecheck, full tests, build, and `git diff --check`.
- [ ] Restart the preview and verify desktop/mobile rendering and console state in the browser.
