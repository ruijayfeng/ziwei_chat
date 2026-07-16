import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

const header = source("src/components/hero-header.tsx");
const composer = source("src/components/chat-composer.tsx");

describe("reference chat presentation", () => {
  test("uses a mounted deterministic calendar and supported composer controls", () => {
    expect(header).toContain("currentCalendarDisplay");
    expect(header).not.toContain("2025骞?5鏈?4鏃?");
    expect(header).not.toContain("鑳屾櫙闊充箰");
    expect(composer).not.toContain("娣诲姞闄勪欢");
    expect(composer).not.toContain("Paperclip");
  });

  test("uses the reference hero composition", () => {
    const experience = source("src/components/chat/chat-experience.tsx");

    expect(experience).toContain("<HeroHeader />");
    expect(experience).toContain("<DestinyRing />");
    expect(experience).toContain('<ChatComposer variant="hero"');
  });

  test("keeps the reference conversation transition and thinking state", () => {
    const experience = source("src/components/chat/chat-experience.tsx");
    const bubble = source("src/components/chat/message-bubble.tsx");

    expect(experience).toContain("<DestinyRing hideCenter");
    expect(experience).toContain("<ThinkingIndicator />");
    expect(bubble).toContain("ziwei-shimmer");
  });

  test("calls reduced-motion hooks before role-specific returns", () => {
    const bubble = source("src/components/chat/message-bubble.tsx");

    expect(bubble.indexOf("const reduceMotion = useReducedMotion()"))
      .toBeLessThan(bubble.indexOf("if (isUser)"));
  });

  test("backs the reference provider with the real workspace transport", () => {
    const session = source("src/components/chat/chat-session.tsx");

    expect(session).toContain("useWorkspace()");
    expect(session).toContain("referenceChatMessages(chatSession)");
    expect(session).not.toMatch(/DEMO_REPLY|DEMO_REFS|setInterval|setTimeout/);
  });

  test("disables the unchanged composer while a real request is active", () => {
    const composer = source("src/components/chat-composer.tsx");
    const experience = source("src/components/chat/chat-experience.tsx");

    expect(composer).toContain("disabled = false");
    expect(composer).toContain("disabled={disabled || !value.trim()}");
    expect(experience).toContain("disabled={busy}");
  });

  test("renders real evidence inside the reference inspector rail", () => {
    const session = source("src/components/chat/chat-session.tsx");
    const inspector = source("src/components/chat/chat-inspector.tsx");

    expect(session).toContain("selectedEvidence");
    expect(session).toContain("modelSettings");
    expect(inspector).toContain("<EvidenceInspector");
    expect(inspector).not.toContain("refs.map");
  });
});
