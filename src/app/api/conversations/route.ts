/**
 * [INPUT]: Depends on anonymous profile/conversation ids and profile-scoped chat persistence reads
 * [OUTPUT]: Provides sanitized conversation summaries or ordered message records
 * [POS]: Read-only App Router boundary for the redesigned records page
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

import {
  listProfileConversationMessages,
  listProfileConversations,
} from "../../../lib/agent/chat-runtime";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const profileId = readUuid(url.searchParams.get("profileId"));
  const rawConversationId = url.searchParams.get("conversationId");
  const conversationId = rawConversationId ? readUuid(rawConversationId) : null;

  if (!profileId || (rawConversationId && !conversationId)) {
    return Response.json({ code: "INVALID_ID" }, { status: 400 });
  }

  try {
    if (conversationId) {
      return Response.json({ messages: await listProfileConversationMessages(profileId, conversationId) });
    }
    return Response.json({ conversations: await listProfileConversations(profileId) });
  } catch {
    return Response.json({ code: "CONVERSATION_STORAGE_UNAVAILABLE" }, { status: 503 });
  }
}

function readUuid(value: string | null) {
  return value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? value
    : null;
}
