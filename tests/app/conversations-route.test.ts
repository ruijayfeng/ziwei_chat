import { beforeEach, describe, expect, test } from "vitest";

import { GET } from "../../src/app/api/conversations/route";
import { persistChatMessage, resetChatRuntime } from "../../src/lib/agent/chat-runtime";

const profileId = "00000000-0000-4000-8000-000000000001";
const otherProfileId = "00000000-0000-4000-8000-000000000002";
const conversationId = "00000000-0000-4000-8000-000000000003";

describe("GET /api/conversations", () => {
  beforeEach(() => resetChatRuntime());

  test("rejects invalid ids", async () => {
    const response = await GET(new Request("http://localhost/api/conversations?profileId=bad"));
    expect(response.status).toBe(400);
  });

  test("does not expose server conversation history when database persistence is disabled", async () => {
    await persistChatMessage({ profileId, conversationId, role: "user", content: "local-only" });
    await persistChatMessage({
      profileId: otherProfileId,
      conversationId: "00000000-0000-4000-8000-000000000004",
      role: "user",
      content: "other",
    });

    const listResponse = await GET(new Request(`http://localhost/api/conversations?profileId=${profileId}`));
    expect(listResponse.status).toBe(200);
    await expect(listResponse.json()).resolves.toEqual({ conversations: [] });

    const messagesResponse = await GET(
      new Request(`http://localhost/api/conversations?profileId=${profileId}&conversationId=${conversationId}`),
    );
    await expect(messagesResponse.json()).resolves.toEqual({ messages: [] });
  });

  test("returns an empty list for an unknown profile", async () => {
    const response = await GET(new Request(`http://localhost/api/conversations?profileId=${profileId}`));
    await expect(response.json()).resolves.toEqual({ conversations: [] });
  });
});
