/**
 * [INPUT]: Depends on a strict source bundle, browser-owned model settings, aggregation, generation, and critic approval
 * [OUTPUT]: Provides POST /api/insights with bounded input and sanitized report/error responses
 * [POS]: Sole server boundary for model-generated sourced Insights reports
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

import {
  normalizeModelSettings,
  type IncomingModelSettings,
} from "../../../lib/agent/model-provider";
import { generateApprovedInsightReport } from "../../../lib/insights/generation";
import { aggregateInsightSources, insightEligibility } from "../../../lib/insights/source";

type HandlerDependencies = {
  fetchImplementation?: typeof fetch;
  now?: () => Date;
};

const MAX_CONTENT_LENGTH_BYTES = 240_000;
const MAX_BODY_CODE_POINTS = 120_000;
const MAX_ENVELOPE_CONVERSATIONS = 40;
const MAX_ENVELOPE_MESSAGES = 400;

export const POST = createInsightsPostHandler();

export function createInsightsPostHandler(dependencies: HandlerDependencies = {}) {
  return async function postInsights(request: Request): Promise<Response> {
    if (isClearlyOversized(request.headers.get("content-length"))) return tooLarge();

    let text: string;
    try {
      text = await request.text();
    } catch {
      return invalidRequest();
    }
    if (Array.from(text).length > MAX_BODY_CODE_POINTS) return tooLarge();

    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      return invalidRequest();
    }

    if (!hasExactKeys(body, ["sourceBundle", "modelSettings"])) return invalidRequest();
    if (isGrosslyOversizedSourceBundle(body.sourceBundle)) return tooLarge();
    if (!isStrictModelSettings(body.modelSettings)) return invalidRequest();

    let aggregation;
    try {
      aggregation = await aggregateInsightSources(body.sourceBundle);
    } catch {
      return invalidRequest();
    }

    const eligibility = insightEligibility(aggregation);
    if (!eligibility.eligible) {
      return json(422, {
        code: "INSUFFICIENT_HISTORY",
        message: "对话记录还不足以生成洞见。",
        canRetry: false,
      });
    }

    const settings = normalizeModelSettings(body.modelSettings);
    if (!settings.enabled) {
      return json(400, {
        code: "MODEL_SETTINGS_REQUIRED",
        message: "请先完成模型设置。",
        canRetry: false,
      });
    }

    let result;
    try {
      result = await generateApprovedInsightReport(aggregation, settings, dependencies);
    } catch {
      return providerFailed();
    }
    if (result.ok) return json(200, result.report);
    if (result.reason === "provider") return providerFailed();
    if (result.reason === "invalid_response") {
      return json(502, {
        code: "INVALID_MODEL_RESPONSE",
        message: "模型返回的洞见格式无效，请重试。",
        canRetry: true,
      });
    }
    return json(502, {
      code: "INSIGHT_CRITIC_FAILED",
      message: "生成的洞见未通过依据与安全检查，请重试。",
      canRetry: true,
    });
  };
}

function isClearlyOversized(value: string | null) {
  if (!value || !/^\d+$/.test(value.trim())) return false;
  return BigInt(value.trim()) > BigInt(MAX_CONTENT_LENGTH_BYTES);
}

function isGrosslyOversizedSourceBundle(value: unknown) {
  if (!hasExactKeys(value, ["conversations"]) || !Array.isArray(value.conversations)) return false;
  if (value.conversations.length > MAX_ENVELOPE_CONVERSATIONS) return true;

  let totalMessages = 0;
  for (const conversation of value.conversations) {
    if (typeof conversation !== "object" || conversation === null || Array.isArray(conversation)) continue;
    const messages = (conversation as Record<string, unknown>).messages;
    if (!Array.isArray(messages)) continue;
    totalMessages += messages.length;
    if (totalMessages > MAX_ENVELOPE_MESSAGES) return true;
  }
  return false;
}

function isStrictModelSettings(value: unknown): value is IncomingModelSettings {
  if (!hasExactKeys(value, ["provider", "baseUrl", "apiKey", "model", "embedding"])) return false;
  if (![value.provider, value.baseUrl, value.apiKey, value.model].every((item) => typeof item === "string")) return false;
  if (!hasExactKeys(value.embedding, ["provider", "baseUrl", "apiKey", "model"])) return false;
  return [value.embedding.provider, value.embedding.baseUrl, value.embedding.apiKey, value.embedding.model]
    .every((item) => typeof item === "string");
}

function hasExactKeys(value: unknown, keys: string[]): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function invalidRequest() {
  return json(400, { code: "INVALID_REQUEST", message: "请求格式不正确。", canRetry: false });
}

function tooLarge() {
  return json(413, { code: "PAYLOAD_TOO_LARGE", message: "请求内容过大。", canRetry: false });
}

function providerFailed() {
  return json(502, {
    code: "MODEL_PROVIDER_FAILED",
    message: "模型暂时无法生成洞见，请稍后重试。",
    canRetry: true,
  });
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
