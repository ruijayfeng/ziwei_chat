# Reference Chat Backend Adapter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect the accepted reference chat and inspector UI to the existing `/api/chat`, Agent, evidence, critic, model-settings, retry, and reset pipeline without changing the reference layout.

**Architecture:** `WorkspaceProvider` remains the single owner of real chat transport and state. The reference `ChatProvider` becomes a thin adapter over `useWorkspace`, while a pure `reference-chat` module converts existing session messages into the small presentation model expected by `ChatExperience` and `MessageBubble`. `ChatInspector` keeps its reference rail composition and renders real evidence inside it.

**Tech Stack:** React 19 context/hooks, Next.js App Router, TypeScript, existing `/api/chat` event stream, Vitest, Motion.

## Global Constraints

- Do not change the accepted `AppLayout`, home composition, destiny-ring geometry, conversation widths, typography, or motion choreography.
- Remove `DEMO_REPLY`, `DEMO_REFS`, timer-based fake streaming, and local demo message IDs.
- Reuse `WorkspaceProvider.sendMessage`, `retryLastMessage`, `resetChat`, `chatSession`, `selectedEvidence`, and `modelSettings`.
- Do not duplicate network transport inside presentation components.
- Preserve API-key locality and never log model settings.
- End each task with focused tests and a small commit.

---

### Task 1: Add the pure reference chat presentation adapter

**Files:**
- Create: `src/lib/ui/reference-chat.ts`
- Create: `tests/ui/reference-chat.test.ts`
- Modify: `src/lib/AGENTS.md`

**Interfaces:**
- Consumes: `ChatSessionState` and `ChatSessionMessage` from `src/lib/ui/chat-session.ts`.
- Produces: `ReferenceChatMessage`, `referenceChatMessages`, `referenceChatPhase`, and `referenceChatThinking`.

- [ ] **Step 1: Write failing adapter tests**

Create tests covering:

```ts
expect(referenceChatPhase(initialChatSessionState)).toBe("idle");
expect(referenceChatMessages(thinkingState)).toEqual([
  { id: "u1", role: "user", content: "事业", streaming: false, failed: false },
]);
expect(referenceChatMessages(streamingState)[1]).toMatchObject({
  id: "a1",
  role: "assistant",
  content: "正在分析",
  streaming: true,
  failed: false,
});
expect(referenceChatMessages(failedState)[1]).toMatchObject({
  content: "分析没有完成，请重试。",
  failed: true,
});
expect(referenceChatThinking(thinkingState)).toBe(true);
```

- [ ] **Step 2: Run the test and verify missing-module failure**

```powershell
npx vitest run tests/ui/reference-chat.test.ts
```

- [ ] **Step 3: Implement the adapter**

Implement these exact presentation rules:

```ts
export type ReferenceChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming: boolean;
  failed: boolean;
};

export function referenceChatPhase(state: ChatSessionState) {
  return state.messages.some((message) => message.role === "user") ? "active" as const : "idle" as const;
}

export function referenceChatThinking(state: ChatSessionState) {
  return state.messages.some(
    (message) => message.role === "assistant" && message.status === "thinking",
  );
}

export function referenceChatMessages(state: ChatSessionState): ReferenceChatMessage[] {
  return state.messages
    .filter((message) => !(message.role === "assistant" && message.status === "thinking"))
    .map((message) => ({
      id: message.id,
      role: message.role,
      content:
        message.status === "failed"
          ? message.error?.message || "分析没有完成，请重试。"
          : message.content,
      streaming: message.status === "streaming",
      failed: message.status === "failed",
    }));
}
```

- [ ] **Step 4: Run focused tests**

```powershell
npx vitest run tests/ui/reference-chat.test.ts tests/ui/chat-session.test.ts
npm run typecheck
```

- [ ] **Step 5: Commit**

```powershell
git add src/lib/ui/reference-chat.ts tests/ui/reference-chat.test.ts src/lib/AGENTS.md
git commit -m "feat(chat): add reference presentation adapter"
```

---

### Task 2: Replace the demo ChatProvider with WorkspaceProvider state

**Files:**
- Modify: `src/components/chat/chat-session.tsx`
- Modify: `src/components/chat/chat-experience.tsx`
- Modify: `src/components/chat/message-bubble.tsx`
- Modify: `src/components/chat-composer.tsx`
- Modify: `tests/ui/redesigned-chat.test.ts`

**Interfaces:**
- Consumes: Task 1 adapter and `useWorkspace`.
- Produces: the existing reference `useChatSession` API backed by real messages, send, retry, reset, and busy state.

- [ ] **Step 1: Add failing source and behavior contracts**

Assert that `chat-session.tsx`:

```ts
expect(sessionSource).toContain("useWorkspace()");
expect(sessionSource).toContain("referenceChatMessages(chatSession)");
expect(sessionSource).not.toMatch(/DEMO_REPLY|DEMO_REFS|setInterval|setTimeout/);
```

Assert that the composer receives and applies `disabled`:

```ts
expect(composerSource).toContain("disabled = false");
expect(composerSource).toContain("disabled={disabled || !value.trim()}");
expect(experienceSource).toContain("disabled={busy}");
```

- [ ] **Step 2: Verify the contracts fail**

```powershell
npx vitest run tests/ui/redesigned-chat.test.ts
```

- [ ] **Step 3: Implement the real ChatProvider adapter**

The context value must be:

```ts
type ChatSession = {
  phase: "idle" | "active";
  messages: ReferenceChatMessage[];
  thinking: boolean;
  busy: boolean;
  send: (text: string) => void;
  retry: () => void;
  reset: () => void;
};
```

Inside `ChatProvider`, call `useWorkspace()` and derive:

```ts
const value = {
  phase: referenceChatPhase(chatSession),
  messages: referenceChatMessages(chatSession),
  thinking: referenceChatThinking(chatSession),
  busy: chatSession.activeRequestId !== null,
  send: (text: string) => void sendMessage(text),
  retry: () => void retryLastMessage(),
  reset: resetChat,
};
```

- [ ] **Step 4: Preserve the reference UI while handling failure and busy state**

- Pass `disabled={busy}` to hero and docked composers.
- Add `disabled?: boolean` to `ChatComposer`; disable textarea, attachment button, and send button without changing dimensions.
- In `MessageBubble`, keep the same assistant typography; allow retry only when `message.failed || isLast` and never show the copy action for an empty response.

- [ ] **Step 5: Run focused tests and build**

```powershell
npx vitest run tests/ui/reference-chat.test.ts tests/ui/redesigned-chat.test.ts tests/ui/chat-client.test.ts tests/ui/chat-session.test.ts
npm run typecheck
npm run build
```

- [ ] **Step 6: Commit**

```powershell
git add src/components/chat/chat-session.tsx src/components/chat/chat-experience.tsx src/components/chat/message-bubble.tsx src/components/chat-composer.tsx tests/ui/redesigned-chat.test.ts
git commit -m "feat(chat): connect reference UI to real transport"
```

---

### Task 3: Render real evidence inside the reference inspector

**Files:**
- Modify: `src/components/chat/chat-session.tsx`
- Modify: `src/components/chat/chat-inspector.tsx`
- Modify: `src/components/chat/evidence-inspector.tsx`
- Modify: `tests/ui/redesigned-chat.test.ts`

**Interfaces:**
- Consumes: `WorkspaceProvider.selectedEvidence`, `modelSettings`, and existing `EvidenceInspector`.
- Produces: real tools, chart facts, knowledge sources, critic, generation, and run status inside the accepted 320px reference rail.

- [ ] **Step 1: Add failing evidence contracts**

```ts
expect(sessionSource).toContain("selectedEvidence");
expect(sessionSource).toContain("modelSettings");
expect(inspectorSource).toContain("<EvidenceInspector");
expect(inspectorSource).not.toContain("refs.map");
```

- [ ] **Step 2: Verify the contracts fail**

```powershell
npx vitest run tests/ui/redesigned-chat.test.ts
```

- [ ] **Step 3: Extend the context without changing layout ownership**

Add these fields to `ChatSession`:

```ts
evidence: EvidenceState;
modelSettings: ModelSettingsDraft;
```

Populate them directly from `useWorkspace()`.

- [ ] **Step 4: Replace demo cards with the real inspector body**

Keep the existing reference `<aside>`, heading, BrandMark, explanatory copy, and footer. Replace the `refs.map` body with:

```tsx
<div className="surface overflow-hidden rounded-2xl px-4">
  <EvidenceInspector evidence={evidence} modelSettings={modelSettings} />
</div>
```

Keep the idle branch returning `<InspectorPanel />`.

- [ ] **Step 5: Run evidence and UI tests**

```powershell
npx vitest run tests/ui/redesigned-chat.test.ts tests/ui/chat-evidence.test.ts tests/app/chat-route.test.ts
npm run typecheck
npm run build
```

- [ ] **Step 6: Commit**

```powershell
git add src/components/chat/chat-session.tsx src/components/chat/chat-inspector.tsx src/components/chat/evidence-inspector.tsx tests/ui/redesigned-chat.test.ts
git commit -m "feat(chat): show real evidence in reference inspector"
```

---

### Task 4: Verify the live chat boundary and update the gap list

**Files:**
- Modify: `docs/development/ui-backend-gap-list.md`
- Modify: `docs/development/project-status.md`
- Modify: `src/components/AGENTS.md`

**Interfaces:**
- Consumes: completed real chat and evidence integration.
- Produces: verified P0 chat closure and the remaining chart/records backlog.

- [ ] **Step 1: Run the full gate**

```powershell
npm run lint
npm run typecheck
npm run test
npm run eval:agent
npm run build
```

- [ ] **Step 2: Run browser QA without exposing secrets**

- Confirm idle home matches the accepted reference UI.
- Send one non-sensitive prompt using the configured provider if available; otherwise verify the explicit model-required failure state.
- Confirm thinking, streamed/revealed assistant content, retry/reset, and real evidence sections.
- Check 390px and 1440px with zero horizontal overflow and zero console errors.
- Do not read or print password input values or localStorage API-key values.

- [ ] **Step 3: Update documentation**

- Move real chat transport and evidence rows from P0/P1 to `Connected Today`.
- Leave chart, records, sidebar, and insights rows unchanged.
- Update component map descriptions for the real adapter-backed ChatProvider and inspector.

- [ ] **Step 4: Commit**

```powershell
git add docs/development/ui-backend-gap-list.md docs/development/project-status.md src/components/AGENTS.md
git commit -m "docs(chat): close reference UI integration gaps"
```
