/**
 * [INPUT]: Depends on critic-approved InsightReport objects and browser localStorage
 * [OUTPUT]: Provides versioned, profile-isolated insight report cache reads, writes, and cleanup
 * [POS]: Browser cache boundary that excludes source bundles, chart data, model settings, and API keys
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

import type { InsightReport } from "../insights/contracts";

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem" | "key" | "length">;

export type InsightCacheRead =
  | { status: "hit"; report: InsightReport }
  | { status: "stale"; report: InsightReport }
  | { status: "miss" };

const cacheVersion = 1;
const cachePrefix = "ziwei-chat-insight-report:v1:";

export function readInsightCache(
  profileId: string,
  sourceFingerprint: string,
  storage: StorageLike | null = browserStorage(),
): InsightCacheRead {
  if (!storage) return { status: "miss" };
  try {
    const exact = readCacheEntry(storage, cacheKey(profileId, sourceFingerprint), sourceFingerprint);
    if (exact) return { status: "hit", report: exact };

    const profilePrefix = `${cachePrefix}${profileId}:`;
    const profileKeys = Array.from({ length: storage.length }, (_, index) => storage.key(index))
      .filter((key): key is string => Boolean(key?.startsWith(profilePrefix)));
    for (const key of profileKeys) {
      const report = readCacheEntry(storage, key, key.slice(profilePrefix.length));
      if (report) return { status: "stale", report };
    }
  } catch {
    return { status: "miss" };
  }
  return { status: "miss" };
}

export function writeInsightCache(
  profileId: string,
  report: InsightReport,
  storage: StorageLike | null = browserStorage(),
) {
  if (!storage || !parseInsightReport(report)) return false;
  try {
    const nextKey = cacheKey(profileId, report.sourceFingerprint);
    storage.setItem(nextKey, JSON.stringify({ version: cacheVersion, report }));
    profileCacheKeys(storage, profileId)
      .filter((key) => key !== nextKey)
      .forEach((key) => storage.removeItem(key));
    return true;
  } catch {
    return false;
  }
}

export function clearInsightCache(profileId: string, storage: StorageLike | null = browserStorage()) {
  if (!storage) return false;
  try {
    profileCacheKeys(storage, profileId).forEach((key) => storage.removeItem(key));
    return true;
  } catch {
    return false;
  }
}

function readCacheEntry(storage: StorageLike, key: string, expectedFingerprint: string): InsightReport | null {
  let value: unknown;
  try {
    const serialized = storage.getItem(key);
    if (!serialized) return null;
    value = JSON.parse(serialized);
  } catch {
    evict(storage, key);
    return null;
  }
  if (!hasExactKeys(value, ["version", "report"]) || value.version !== cacheVersion) {
    evict(storage, key);
    return null;
  }
  const report = parseInsightReport(value.report);
  if (!report || report.sourceFingerprint !== expectedFingerprint) {
    evict(storage, key);
    return null;
  }
  return report;
}

export function parseInsightReport(value: unknown): InsightReport | null {
  if (!hasExactKeys(value, ["sourceWindow", "generatedAt", "sourceFingerprint", "weeklyLetter", "patterns", "critic"])) return null;
  if (!isTimestampWindow(value.sourceWindow) || !isCanonicalTimestamp(value.generatedAt) || !isFingerprint(value.sourceFingerprint)) return null;
  if (!hasExactKeys(value.weeklyLetter, ["greeting", "paragraphs", "signoff"]) || !Array.isArray(value.weeklyLetter.paragraphs)) return null;
  if (!isText(value.weeklyLetter.greeting) || !isText(value.weeklyLetter.signoff) || value.weeklyLetter.paragraphs.length < 1 || value.weeklyLetter.paragraphs.length > 3) return null;
  if (!value.weeklyLetter.paragraphs.every(isParagraph) || !Array.isArray(value.patterns) || value.patterns.length > 3 || !value.patterns.every(isPattern)) return null;
  if (!hasExactKeys(value.critic, ["passed", "issues"]) || value.critic.passed !== true || !Array.isArray(value.critic.issues) || value.critic.issues.length !== 0) return null;
  return {
    sourceWindow: { from: value.sourceWindow.from, to: value.sourceWindow.to },
    generatedAt: value.generatedAt,
    sourceFingerprint: value.sourceFingerprint,
    weeklyLetter: {
      greeting: value.weeklyLetter.greeting,
      paragraphs: value.weeklyLetter.paragraphs.map((paragraph) => ({ text: paragraph.text, sourceIds: [...paragraph.sourceIds] })),
      signoff: value.weeklyLetter.signoff,
    },
    patterns: value.patterns.map((pattern) => ({
      id: pattern.id,
      title: pattern.title,
      detail: pattern.detail,
      topic: pattern.topic,
      sourceIds: [...pattern.sourceIds],
    })),
    critic: { passed: true, issues: [] },
  };
}

function isTimestampWindow(value: unknown): value is { from: string; to: string } {
  return hasExactKeys(value, ["from", "to"])
    && isCanonicalTimestamp(value.from)
    && isCanonicalTimestamp(value.to)
    && value.from <= value.to;
}

function isParagraph(value: unknown): value is { text: string; sourceIds: string[] } {
  return hasExactKeys(value, ["text", "sourceIds"]) && isText(value.text) && hasDistinctSourceIds(value.sourceIds, 1);
}

function isPattern(value: unknown): value is { id: string; title: string; detail: string; topic: string; sourceIds: string[] } {
  return hasExactKeys(value, ["id", "title", "detail", "topic", "sourceIds"])
    && isText(value.id) && isText(value.title) && isText(value.detail) && isText(value.topic) && hasDistinctSourceIds(value.sourceIds, 2);
}

function hasDistinctSourceIds(value: unknown, minimum: number): value is string[] {
  return Array.isArray(value)
    && value.length >= minimum
    && value.every(isCanonicalSourceId)
    && new Set(value).size === value.length;
}
function isCanonicalSourceId(value: unknown): value is string {
  if (typeof value !== "string" || value !== value.trim()) return false;
  const parts = value.split(":");
  return parts.length === 2 && parts.every((part) => part.length > 0 && part === part.trim());
}
function isCanonicalTimestamp(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value;
}
function isFingerprint(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{64}$/.test(value);
}
function isText(value: unknown): value is string { return typeof value === "string" && value.trim().length > 0; }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
function hasExactKeys(value: unknown, expected: string[]): value is Record<string, unknown> {
  if (!isRecord(value)) return false;
  const actual = Object.keys(value).sort();
  const sortedExpected = [...expected].sort();
  return actual.length === sortedExpected.length && actual.every((key, index) => key === sortedExpected[index]);
}
function cacheKey(profileId: string, sourceFingerprint: string) { return `${cachePrefix}${profileId}:${sourceFingerprint}`; }
function browserStorage(): StorageLike | null { return typeof window === "undefined" ? null : window.localStorage; }
function profileCacheKeys(storage: StorageLike, profileId: string) {
  const profilePrefix = `${cachePrefix}${profileId}:`;
  return Array.from({ length: storage.length }, (_, index) => storage.key(index))
    .filter((key): key is string => Boolean(key?.startsWith(profilePrefix)));
}
function evict(storage: StorageLike, key: string) {
  try {
    storage.removeItem(key);
  } catch {
    // Cache failures never block the active Insights flow.
  }
}
