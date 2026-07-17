import { describe, expect, test, vi } from "vitest";

import { loadInsightSourceBundle } from "../../src/lib/ui/insight-sources";
import { initialEvidence } from "../../src/lib/ui/chat-evidence";

const profileId = "00000000-0000-4000-8000-000000000001";

describe("insight source loader", () => {
  test("loads no more than twenty conversations and propagates one signal to every request", async () => {
    const controller = new AbortController();
    const requests: Array<{ url: string; signal: AbortSignal | null | undefined }> = [];
    let activeDetails = 0;
    let peakDetails = 0;
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      requests.push({ url, signal: init?.signal });
      if (!url.includes("conversationId=")) {
        return Response.json({ conversations: Array.from({ length: 25 }, (_, index) => ({
          id: `conversation-${index}`,
          title: `Conversation ${index}`,
          lastMessageAt: `2026-07-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`,
        })) });
      }
      activeDetails += 1;
      peakDetails = Math.max(peakDetails, activeDetails);
      await Promise.resolve();
      activeDetails -= 1;
      const id = new URL(url, "https://ziwei.local").searchParams.get("conversationId")!;
      return Response.json({ messages: [{
        id: `message-${id}`,
        conversationId: id,
        role: "user",
        content: `Question ${id}`,
        createdAt: "2026-07-17T00:00:00.000Z",
      }] });
    });

    const result = await loadInsightSourceBundle(profileId, null, fetchImpl, controller.signal);

    expect(result.conversations).toHaveLength(20);
    expect(requests).toHaveLength(21);
    expect(requests.every((request) => request.signal === controller.signal)).toBe(true);
    expect(peakDetails).toBeLessThanOrEqual(4);
  });

  test("keeps a distinct current session inside the twenty-conversation cap", async () => {
    const currentSession = {
      conversationId: "conversation-current",
      messages: [{ id: "current-user", role: "user" as const, content: "Current", status: "complete" as const, evidence: initialEvidence }],
    };
    const result = await loadInsightSourceBundle(profileId, currentSession, async (input) => {
      if (!String(input).includes("conversationId=")) {
        return Response.json({ conversations: Array.from({ length: 20 }, (_, index) => ({
          id: `conversation-${index}`,
          title: `Conversation ${index}`,
          lastMessageAt: `2026-07-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`,
        })) });
      }
      const id = new URL(String(input), "https://ziwei.local").searchParams.get("conversationId")!;
      return Response.json({ messages: [{ id: `message-${id}`, conversationId: id, role: "user", content: "Saved", createdAt: "2026-07-17T00:00:00.000Z" }] });
    });

    expect(result.conversations).toHaveLength(20);
    expect(result.conversations[0]?.id).toBe("conversation-current");
    expect(result.conversations.some((conversation) => conversation.id === "conversation-19")).toBe(false);
  });

  test("rejects aborted list and detail requests", async () => {
    const listController = new AbortController();
    listController.abort();
    await expect(loadInsightSourceBundle(profileId, null, async (_input, init) => {
      expect(init?.signal?.aborted).toBe(true);
      throw new DOMException("Aborted", "AbortError");
    }, listController.signal)).rejects.toThrow("Aborted");

    const detailController = new AbortController();
    await expect(loadInsightSourceBundle(profileId, null, async (input, init) => {
      if (!String(input).includes("conversationId=")) {
        return Response.json({ conversations: [{ id: "conversation-1", title: "Saved", lastMessageAt: "" }] });
      }
      detailController.abort();
      expect(init?.signal).toBe(detailController.signal);
      throw new DOMException("Aborted", "AbortError");
    }, detailController.signal)).rejects.toThrow("Aborted");
  });

  test("keeps only visible user and assistant messages with sanitized API timestamps", async () => {
    const result = await loadInsightSourceBundle(profileId, null, async (input) => {
      if (!String(input).includes("conversationId=")) {
        return Response.json({ conversations: [{ id: "conversation-1", title: "Saved", lastMessageAt: "2026-07-16T12:00:00.000Z" }] });
      }
      return Response.json({ messages: [
        { id: "user-1", conversationId: "conversation-1", role: "user", content: " Prompt ", createdAt: "2026-07-16T10:00:00.000Z" },
        { id: "assistant-1", conversationId: "conversation-1", role: "assistant", content: " Answer ", createdAt: "2026-07-16T11:00:00.000Z" },
        { id: "system-1", conversationId: "conversation-1", role: "system", content: "hidden", createdAt: "2026-07-16T11:30:00.000Z" },
        { id: "tool-1", conversationId: "conversation-1", role: "tool", content: "secret", createdAt: "2026-07-16T11:40:00.000Z" },
        { id: "blank-1", conversationId: "conversation-1", role: "assistant", content: "  ", createdAt: "2026-07-16T11:50:00.000Z" },
      ] });
    });

    expect(result).toEqual({ conversations: [{
      id: "conversation-1",
      title: "Saved",
      updatedAt: "2026-07-16T12:00:00.000Z",
      messages: [
        { id: "user-1", role: "user", content: "Prompt", createdAt: "2026-07-16T10:00:00.000Z" },
        { id: "assistant-1", role: "assistant", content: "Answer", createdAt: "2026-07-16T11:00:00.000Z" },
      ],
    }] });
  });

  test("merges the current browser session by stable conversation and message ids without inventing timestamps", async () => {
    const result = await loadInsightSourceBundle(profileId, {
      conversationId: "conversation-1",
      messages: [
        { id: "user-1", role: "user", content: "Browser prompt", status: "complete", evidence: initialEvidence },
        { id: "assistant-1", role: "assistant", content: "Browser answer", status: "complete", evidence: initialEvidence },
        { id: "pending", role: "assistant", content: "", status: "thinking", evidence: initialEvidence },
      ],
    }, async (input) => {
      if (!String(input).includes("conversationId=")) {
        return Response.json({ conversations: [
          { id: "conversation-1", title: "Persisted", lastMessageAt: "2026-07-16T12:00:00.000Z" },
          { id: "conversation-2", title: "Other", lastMessageAt: "2026-07-15T12:00:00.000Z" },
        ] });
      }
      const id = new URL(String(input), "https://ziwei.local").searchParams.get("conversationId")!;
      return Response.json({ messages: [{ id: "persisted", conversationId: id, role: "user", content: "Persisted body", createdAt: "2026-07-16T12:00:00.000Z" }] });
    });

    expect(result.conversations.map((conversation) => conversation.id)).toEqual(["conversation-1", "conversation-2"]);
    expect(result.conversations[0]).toMatchObject({ title: "Browser prompt", updatedAt: "" });
    expect(result.conversations[0]?.messages).toEqual([
      { id: "user-1", role: "user", content: "Browser prompt", createdAt: "" },
      { id: "assistant-1", role: "assistant", content: "Browser answer", createdAt: "" },
    ]);
  });

  test("returns the current session when persistence is unavailable and rejects malformed API payloads", async () => {
    const currentSession = {
      conversationId: "conversation-current",
      messages: [{ id: "user-1", role: "user" as const, content: "Current", status: "complete" as const, evidence: initialEvidence }],
    };
    await expect(loadInsightSourceBundle(profileId, currentSession, async () => new Response(null, { status: 503 }))).resolves.toMatchObject({
      conversations: [{ id: "conversation-current", messages: [{ createdAt: "" }] }],
    });
    await expect(loadInsightSourceBundle(profileId, null, async () => Response.json({ conversations: [{ id: "bad" }] }))).rejects.toThrow("Invalid insight source response");
    await expect(loadInsightSourceBundle(profileId, null, async (input) => {
      if (!String(input).includes("conversationId=")) return Response.json({ conversations: [{ id: "conversation-1", title: "Saved", lastMessageAt: "" }] });
      return Response.json({ messages: [{ id: "message-1", conversationId: "conversation-1", role: "user" }] });
    })).rejects.toThrow("Invalid insight source response");
    await expect(loadInsightSourceBundle(profileId, null, async (input) => {
      if (!String(input).includes("conversationId=")) return Response.json({ conversations: [
        { id: "conversation-1", title: "One", lastMessageAt: "" },
        { id: "conversation-1", title: "Duplicate", lastMessageAt: "" },
      ] });
      return Response.json({ messages: [{ id: "message-1", conversationId: "conversation-1", role: "user", content: "Body", createdAt: "" }] });
    })).rejects.toThrow("Invalid insight source response");
  });

  test("rejects ids that cannot form unambiguous provenance source ids", async () => {
    await expect(loadInsightSourceBundle(profileId, null, async () => Response.json({ conversations: [
      { id: "conversation:bad", title: "Bad", lastMessageAt: "" },
    ] }))).rejects.toThrow("Invalid insight source response");

    await expect(loadInsightSourceBundle(profileId, null, async (input) => {
      if (!String(input).includes("conversationId=")) {
        return Response.json({ conversations: [{ id: "conversation-1", title: "Saved", lastMessageAt: "" }] });
      }
      return Response.json({ messages: [{
        id: "message:bad",
        conversationId: "conversation-1",
        role: "user",
        content: "Body",
        createdAt: "",
      }] });
    })).rejects.toThrow("Invalid insight source response");
  });

  test("rejects extra list and detail fields instead of silently dropping hidden metadata", async () => {
    await expect(loadInsightSourceBundle(profileId, null, async () => Response.json({ conversations: [{
      id: "conversation-1",
      title: "Saved",
      lastMessageAt: "",
      apiKey: "sk-hidden",
    }] }))).rejects.toThrow("Invalid insight source response");

    await expect(loadInsightSourceBundle(profileId, null, async (input) => {
      if (!String(input).includes("conversationId=")) {
        return Response.json({ conversations: [{ id: "conversation-1", title: "Saved", lastMessageAt: "" }] });
      }
      return Response.json({ messages: [{
        id: "message-1",
        conversationId: "conversation-1",
        role: "user",
        content: "Body",
        createdAt: "",
        hidden: { rawChart: true },
      }] });
    })).rejects.toThrow("Invalid insight source response");
  });
});
