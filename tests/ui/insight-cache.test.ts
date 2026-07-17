import { describe, expect, test } from "vitest";

import { clearInsightCache, readInsightCache, writeInsightCache } from "../../src/lib/ui/insight-cache";
import type { InsightReport } from "../../src/lib/insights/contracts";

const profileA = "00000000-0000-4000-8000-000000000001";
const profileB = "00000000-0000-4000-8000-000000000002";
const fingerprintA = "a".repeat(64);
const fingerprintB = "b".repeat(64);

describe("insight report cache", () => {
  test("isolates reports by profile and exact source fingerprint", () => {
    const storage = createStorage();
    const report = approvedReport(fingerprintA);

    expect(writeInsightCache(profileA, report, storage)).toBe(true);
    expect(readInsightCache(profileA, fingerprintA, storage)).toEqual({ status: "hit", report });
    expect(readInsightCache(profileB, fingerprintA, storage)).toEqual({ status: "miss" });
    expect(readInsightCache(profileA, fingerprintB, storage)).toEqual({ status: "stale", report });
  });

  test("evicts malformed envelopes and reports instead of returning them", () => {
    const storage = createStorage();
    storage.setItem(cacheKey(profileA, fingerprintA), JSON.stringify({ version: 1, report: { critic: { passed: false, issues: ["no"] } } }));

    expect(readInsightCache(profileA, fingerprintA, storage)).toEqual({ status: "miss" });
    expect(storage.getItem(cacheKey(profileA, fingerprintA))).toBeNull();
  });

  test("evicts envelopes that contain anything besides the versioned report", () => {
    const storage = createStorage();
    storage.setItem(cacheKey(profileA, fingerprintA), JSON.stringify({
      version: 1,
      report: approvedReport(fingerprintA),
      apiKey: "sk-secret",
      sourceBundle: { conversations: [{ messages: [{ content: "raw source" }] }] },
    }));

    expect(readInsightCache(profileA, fingerprintA, storage)).toEqual({ status: "miss" });
    expect(storage.getItem(cacheKey(profileA, fingerprintA))).toBeNull();
  });

  test("rejects patterns without two distinct provenance ids", () => {
    const storage = createStorage();
    const report = approvedReport(fingerprintA);
    report.patterns[0] = { ...report.patterns[0]!, sourceIds: ["conversation-1:message-1"] };

    expect(writeInsightCache(profileA, report, storage)).toBe(false);
  });

  test("evicts a cache key whose report fingerprint does not match", () => {
    const storage = createStorage();
    storage.setItem(cacheKey(profileA, fingerprintA), JSON.stringify({ version: 1, report: approvedReport(fingerprintB) }));

    expect(readInsightCache(profileA, fingerprintA, storage)).toEqual({ status: "miss" });
    expect(storage.getItem(cacheKey(profileA, fingerprintA))).toBeNull();
  });

  test.each([
    ["invalid generated time", { generatedAt: "not-a-date" }],
    ["invalid source window", { sourceWindow: { from: "bad", to: "also-bad" } }],
    ["non-sha fingerprint", { sourceFingerprint: "fingerprint-a" }],
    ["duplicate paragraph source ids", { weeklyLetter: { ...approvedReport("a".repeat(64)).weeklyLetter, paragraphs: [{ text: "Grounded reflection", sourceIds: ["conversation-1:message-1", "conversation-1:message-1"] }] } }],
  ])("rejects report metadata that cannot come from the approved server boundary: %s", (_label, override) => {
    const storage = createStorage();
    const report = { ...approvedReport("a".repeat(64)), ...override };

    expect(writeInsightCache(profileA, report as InsightReport, storage)).toBe(false);
  });

  test("treats storage read and eviction failures as a cache miss", () => {
    const storage = createStorage();
    const failingStorage: Storage = {
      ...storage,
      getItem: () => "{not-json",
      removeItem: () => { throw new Error("storage denied"); },
    };

    expect(readInsightCache(profileA, "a".repeat(64), failingStorage)).toEqual({ status: "miss" });
  });

  test("serializes only a versioned critic-approved report without source bodies or secrets", () => {
    const storage = createStorage();
    const report = approvedReport(fingerprintA);

    writeInsightCache(profileA, report, storage);

    const serialized = storage.getItem(cacheKey(profileA, fingerprintA))!;
    expect(JSON.parse(serialized)).toEqual({ version: 1, report });
    expect(serialized).not.toContain("raw source body");
    expect(serialized).not.toContain("sk-secret-key");
    expect(serialized).not.toContain("chartData");
  });

  test("clears only the requested profile cache and tolerates unavailable storage", () => {
    const storage = createStorage();
    writeInsightCache(profileA, approvedReport(fingerprintA), storage);
    writeInsightCache(profileB, approvedReport(fingerprintB), storage);

    expect(clearInsightCache(profileA, storage)).toBe(true);
    expect(readInsightCache(profileA, fingerprintA, storage)).toEqual({ status: "miss" });
    expect(readInsightCache(profileB, fingerprintB, storage)).toMatchObject({ status: "hit" });
    expect(writeInsightCache(profileA, approvedReport(fingerprintA), null)).toBe(false);
  });
});

function approvedReport(sourceFingerprint: string): InsightReport {
  return {
    sourceWindow: { from: "2026-07-01T00:00:00.000Z", to: "2026-07-17T00:00:00.000Z" },
    generatedAt: "2026-07-17T12:00:00.000Z",
    sourceFingerprint,
    weeklyLetter: {
      greeting: "Hello",
      paragraphs: [{ text: "Grounded reflection", sourceIds: ["conversation-1:message-1"] }],
      signoff: "Take care",
    },
    patterns: [{ id: "pattern-1", title: "Pattern", detail: "Observed", topic: "career", sourceIds: ["conversation-1:message-1", "conversation-2:message-2"] }],
    critic: { passed: true, issues: [] },
  };
}

function createStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => { values.delete(key); },
    setItem: (key, value) => { values.set(key, value); },
  };
}

function cacheKey(profileId: string, sourceFingerprint: string) {
  return `ziwei-chat-insight-report:v1:${profileId}:${sourceFingerprint}`;
}
