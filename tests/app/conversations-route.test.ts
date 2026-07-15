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

  test("returns only profile-owned conversation summaries and sanitized messages", async () => {
    await persistChatMessage({ profileId, conversationId, role: "user", content: "我的事业问题", metadata: { secret: "not returned" } });
    await persistChatMessage({ profileId, conversationId, role: "assistant", content: "真实回答", metadata: { critic: true } });
    await persistChatMessage({ profileId: otherProfileId, conversationId: "00000000-0000-4000-8000-000000000004", role: "user", content: "别人的问题" });

    const listResponse = await GET(new Request(`http://localhost/api/conversations?profileId=${profileId}`));
    expect(listResponse.status).toBe(200);
    expect(await listResponse.json()).toEqual({
      conversations: [expect.objectContaining({ id: conversationId, title: "我的事业问题" })],
    });

    const messagesResponse = await GET(new Request(`http://localhost/api/conversations?profileId=${profileId}&conversationId=${conversationId}`));
    const payload = await messagesResponse.json();
    expect(payload.messages).toEqual([
      expect.objectContaining({ role: "user", content: "我的事业问题" }),
      expect.objectContaining({ role: "assistant", content: "真实回答" }),
    ]);
    expect(JSON.stringify(payload)).not.toContain("secret");
    expect(JSON.stringify(payload)).not.toContain("critic");
  });

  test("returns an empty list for an unknown profile", async () => {
    const response = await GET(new Request(`http://localhost/api/conversations?profileId=${profileId}`));
    expect(await response.json()).toEqual({ conversations: [] });
  });
});
