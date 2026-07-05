/**
 * [INPUT]: Depends on Request headers and process environment rate-limit settings
 * [OUTPUT]: Provides fixed-window rate-limit decisions and test reset helpers
 * [POS]: Small HTTP boundary guard used by App Router API routes before request body parsing
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

export type RateLimitDecision =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

export type RateLimitInput = {
  request: Request;
  route: string;
  method: string;
  now?: number;
};

const buckets = new Map<string, RateLimitBucket>();

const defaultMaxRequests = 30;
const defaultWindowMs = 60_000;

export function checkRateLimit({
  request,
  route,
  method,
  now = Date.now(),
}: RateLimitInput): RateLimitDecision {
  const maxRequests = readPositiveInteger(process.env.CHAT_RATE_LIMIT_MAX, defaultMaxRequests);
  const windowMs = readPositiveInteger(process.env.CHAT_RATE_LIMIT_WINDOW_MS, defaultWindowMs);

  if (maxRequests <= 0) {
    return { allowed: true };
  }

  const key = [route, method.toUpperCase(), getClientIdentifier(request)].join(":");
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (current.count >= maxRequests) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }

  current.count += 1;
  return { allowed: true };
}

export function resetRateLimitStore() {
  buckets.clear();
}

function getClientIdentifier(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();

  return forwardedFor || realIp || "unknown";
}

function readPositiveInteger(value: string | undefined, fallback: number) {
  if (!value) return fallback;

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }

  return Math.floor(parsed);
}
