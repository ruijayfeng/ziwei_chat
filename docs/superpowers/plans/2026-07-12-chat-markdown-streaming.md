# Chat Markdown and Reveal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` to implement task-by-task with TDD.

**Goal:** Make critic-approved answers appear progressively and render safe, readable Markdown in the chat workspace.

**Architecture:** Keep the server-side critic gate unchanged. The client receives approved chunks, reveals pending text at a controlled cadence, and renders the visible text through a dependency-free Markdown AST renderer; protocol-shaped replies retain their report treatment.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, Vitest.

## Tasks

### Task 1: Define renderer and reveal behavior

**Files:**
- Create: `src/lib/ui/markdown.ts`
- Create: `src/lib/ui/streaming-reveal.ts`
- Test: `tests/ui/markdown.test.ts`
- Test: `tests/ui/streaming-reveal.test.ts`

- [ ] Write failing tests for headings, emphasis, lists, blockquotes, horizontal rules, inline code, and escaped plain text.
- [ ] Write failing tests proving that reveal progress consumes a bounded number of Unicode characters and reaches the complete string.
- [ ] Implement the smallest parser and reveal helpers that satisfy the tests.

### Task 2: Render and reveal replies

**Files:**
- Create: `src/components/markdown-message.tsx`
- Modify: `src/components/report-message.tsx`
- Modify: `src/components/chat-panel.tsx`

- [ ] Add a reusable safe Markdown renderer without raw HTML support.
- [ ] Prefer the existing protocol report layout only once the complete five-part response is present; otherwise render the partial Markdown progressively.
- [ ] Add a restrained active cursor, incoming-content status, and reduced-motion fallback.

### Task 3: Document and verify

**Files:**
- Modify: `src/components/AGENTS.md`
- Modify: `src/app/globals.css`

- [ ] Document the new renderer and reveal hook.
- [ ] Verify UI unit tests, typecheck, lint, and local browser rendering.
