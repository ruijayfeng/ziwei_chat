import { describe, expect, test, vi } from "vitest";

import { sendChatRequest } from "../../src/lib/ui/chat-client";
import { initialEvidence, type EvidenceState } from "../../src/lib/ui/chat-evidence";
import { defaultModelSettingsDraft } from "../../src/lib/ui/model-settings";

const input = {
  profileId: "profile-1",
  conversationId: "conversation-1",
  messages: [{ role: "user" as const, content: "看看事业" }],
  modelSettings: defaultModelSettingsDraft,
  evidenceRunId: "run-1",
};

describe("chat client", () => {
  test("sends the complete request and reads static text plus header evidence", async () => {
    const evidence = evidenceFixture("static");
    let capturedInit: RequestInit | undefined;
    const fetchImpl = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      capturedInit = init;
      return new Response("本地回复", {
        headers: { "X-Ziwei-Evidence": encodeURIComponent(JSON.stringify(evidence)) },
      });
    });
    const onEvidence = vi.fn();
    const onToken = vi.fn();

    const result = await sendChatRequest(input, { onEvidence, onToken }, fetchImpl);

    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(JSON.parse(String(capturedInit?.body))).toEqual(input);
    expect(result).toEqual({ content: "本地回复", evidence });
    expect(onEvidence).toHaveBeenLastCalledWith(evidence);
    expect(onToken).toHaveBeenCalledWith("本地回复");
  });

  test("parses split newline events in order and returns the latest evidence", async () => {
    const firstEvidence = evidenceFixture("running");
    const finalEvidence = evidenceFixture("complete");
    const wire = [
      JSON.stringify({ event: "evidence", data: firstEvidence }),
      JSON.stringify({ event: "evidence", data: finalEvidence }),
      JSON.stringify({ event: "token", data: "甲" }),
      JSON.stringify({ event: "token", data: "乙" }),
      JSON.stringify({ event: "done", data: null }),
      "",
    ].join("\n");
    const events: string[] = [];
    const response = eventResponse([wire.slice(0, 19), wire.slice(19, 77), wire.slice(77)]);

    const result = await sendChatRequest(
      input,
      {
        onEvidence: (evidence) => events.push(`evidence:${evidence.runs[0]?.summary}`),
        onToken: (token) => events.push(`token:${token}`),
      },
      async () => response,
    );

    expect(result).toEqual({ content: "甲乙", evidence: finalEvidence });
    expect(events).toEqual([
      "evidence:running",
      "evidence:complete",
      "token:甲",
      "token:乙",
    ]);
  });

  test("keeps final evidence but rejects a retryable stream error with no answer", async () => {
    const failedEvidence = evidenceFixture("failed");
    const response = eventResponse([
      `${JSON.stringify({ event: "evidence", data: failedEvidence })}\n`,
      `${JSON.stringify({ event: "error", data: { message: "模型失败", canRetry: true } })}\n`,
      `${JSON.stringify({ event: "done", data: null })}\n`,
    ]);
    const onEvidence = vi.fn();

    await expect(sendChatRequest(input, { onEvidence }, async () => response)).rejects.toMatchObject({
      kind: "server",
      message: "模型失败",
      canRetry: true,
    });
    expect(onEvidence).toHaveBeenLastCalledWith(failedEvidence);
  });

  test("rejects empty static answers and event streams without done", async () => {
    await expect(sendChatRequest(input, {}, async () => new Response("  "))).rejects.toMatchObject({
      kind: "empty_response",
    });

    const incomplete = eventResponse([`${JSON.stringify({ event: "token", data: "未完成" })}\n`]);
    await expect(sendChatRequest(input, {}, async () => incomplete)).rejects.toMatchObject({
      kind: "server",
      canRetry: true,
    });
  });
});

function eventResponse(chunks: string[]) {
  const encoder = new TextEncoder();
  return new Response(new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  }), {
    headers: { "X-Ziwei-Stream": "events" },
  });
}

function evidenceFixture(summary: string): EvidenceState {
  return {
    ...initialEvidence,
    toolsUsed: ["getCurrentChart"],
    runs: [{
      runId: "run-1",
      title: "事业分析",
      summary,
      status: summary === "failed" ? "failed" : summary === "complete" ? "completed" : "running",
      startedAt: "",
      completedAt: "",
      steps: [],
    }],
  };
}
