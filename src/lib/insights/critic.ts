/**
 * [INPUT]: Depends on untrusted model report candidates and deterministic insight aggregation
 * [OUTPUT]: Provides provenance/safety critique and sanitized approved insight reports
 * [POS]: Deterministic quality gate between model generation and insight presentation
 * [PROTOCOL]: Update this header when changed, then check AGENTS.md
 */

import type { InsightAggregation, InsightReport, InsightReportCandidate } from "./contracts";
import { insightEligibility } from "./source";

type CritiqueResult = { passed: boolean; issues: string[] };
type Now = Date | (() => Date);

const rootKeys = ["weeklyLetter", "patterns"];
const letterKeys = ["greeting", "paragraphs", "signoff"];
const paragraphKeys = ["text", "sourceIds"];
const patternKeys = ["id", "title", "detail", "topic", "sourceIds"];

const invalidCandidateIssue = "Insight report candidate has an invalid shape.";
const ineligibleAggregationIssue = "Insight aggregation is ineligible or has no source window.";
const unknownSourceIssue = "Insight report candidate references an unknown source id.";
const missingParagraphSourceIssue = "Every insight paragraph requires a known source id.";
const insufficientPatternSourcesIssue = "Every insight pattern requires two distinct known candidate ids.";
const unsafeContentIssue = "Insight report candidate contains prohibited or overconfident claims.";

export function critiqueInsightReport(candidate: unknown, aggregation: InsightAggregation): CritiqueResult {
  const parsed = parseCandidate(candidate);
  if (!parsed) return failed([invalidCandidateIssue]);
  if (!aggregation.sourceWindow || !insightEligibility(aggregation).eligible) {
    return failed([ineligibleAggregationIssue]);
  }
  return critiqueParsedCandidate(parsed, aggregation);
}

export function approvedInsightReport(
  candidate: unknown,
  aggregation: InsightAggregation,
  now: Now = () => new Date(),
): InsightReport | null {
  const parsed = parseCandidate(candidate);
  if (!parsed || !critiqueInsightReport(parsed, aggregation).passed || !aggregation.sourceWindow) return null;

  const generatedAt = resolveNow(now);
  if (!generatedAt) return null;

  return {
    sourceWindow: { ...aggregation.sourceWindow },
    generatedAt,
    sourceFingerprint: aggregation.sourceFingerprint,
    weeklyLetter: {
      greeting: parsed.weeklyLetter.greeting,
      paragraphs: parsed.weeklyLetter.paragraphs.map((paragraph) => ({
        text: paragraph.text,
        sourceIds: [...paragraph.sourceIds],
      })),
      signoff: parsed.weeklyLetter.signoff,
    },
    patterns: parsed.patterns.map((pattern) => ({
      id: pattern.id,
      title: pattern.title,
      detail: pattern.detail,
      topic: pattern.topic,
      sourceIds: [...pattern.sourceIds],
    })),
    critic: { passed: true, issues: [] },
  };
}

function critiqueParsedCandidate(candidate: InsightReportCandidate, aggregation: InsightAggregation): CritiqueResult {
  const issues: string[] = [];
  const knownSourceIds = new Set(aggregation.candidates.map((item) => item.sourceId));
  const allReferences = [
    ...candidate.weeklyLetter.paragraphs.flatMap((paragraph) => paragraph.sourceIds),
    ...candidate.patterns.flatMap((pattern) => pattern.sourceIds),
  ];

  if (allReferences.some((sourceId) => !knownSourceIds.has(sourceId))) issues.push(unknownSourceIssue);
  if (candidate.weeklyLetter.paragraphs.some((paragraph) => !hasKnownSources(paragraph.sourceIds, knownSourceIds, 1))) {
    issues.push(missingParagraphSourceIssue);
  }
  if (candidate.patterns.some((pattern) => !hasKnownSources(pattern.sourceIds, knownSourceIds, 2))) {
    issues.push(insufficientPatternSourcesIssue);
  }
  if (generatedText(candidate).some(containsUnsafeClaim)) issues.push(unsafeContentIssue);

  return issues.length === 0 ? { passed: true, issues: [] } : failed(issues);
}

function parseCandidate(value: unknown): InsightReportCandidate | null {
  if (!hasExactKeys(value, rootKeys) || !hasExactKeys(value.weeklyLetter, letterKeys)) return null;
  if (!Array.isArray(value.weeklyLetter.paragraphs) || !Array.isArray(value.patterns)) return null;
  if (value.weeklyLetter.paragraphs.length < 1 || value.weeklyLetter.paragraphs.length > 3) return null;
  if (value.patterns.length > 3) return null;

  const greeting = readText(value.weeklyLetter.greeting);
  const signoff = readText(value.weeklyLetter.signoff);
  if (!greeting || !signoff) return null;

  const paragraphs = value.weeklyLetter.paragraphs.map(parseParagraph);
  const patterns = value.patterns.map(parsePattern);
  if (!paragraphs.every(isPresent) || !patterns.every(isPresent)) return null;
  return { weeklyLetter: { greeting, paragraphs, signoff }, patterns };
}

function parseParagraph(value: unknown): InsightReportCandidate["weeklyLetter"]["paragraphs"][number] | null {
  if (!hasExactKeys(value, paragraphKeys)) return null;
  const text = readText(value.text);
  const sourceIds = readSourceIds(value.sourceIds);
  return text && sourceIds ? { text, sourceIds } : null;
}

function parsePattern(value: unknown): InsightReportCandidate["patterns"][number] | null {
  if (!hasExactKeys(value, patternKeys)) return null;
  const id = readText(value.id);
  const title = readText(value.title);
  const detail = readText(value.detail);
  const topic = readText(value.topic);
  const sourceIds = readSourceIds(value.sourceIds);
  return id && title && detail && topic && sourceIds ? { id, title, detail, topic, sourceIds } : null;
}

function readSourceIds(value: unknown) {
  if (!Array.isArray(value) || value.some((item) => !readText(item))) return null;
  return [...new Set(value.map((item) => (item as string).trim()))];
}

function hasKnownSources(sourceIds: string[], knownSourceIds: Set<string>, minimum: number) {
  return new Set(sourceIds.filter((sourceId) => knownSourceIds.has(sourceId))).size >= minimum;
}

function generatedText(candidate: InsightReportCandidate) {
  return [
    candidate.weeklyLetter.greeting,
    ...candidate.weeklyLetter.paragraphs.map((paragraph) => paragraph.text),
    candidate.weeklyLetter.signoff,
    ...candidate.patterns.flatMap((pattern) => [pattern.id, pattern.title, pattern.detail, pattern.topic]),
  ];
}

function containsUnsafeClaim(text: string) {
  return containsCertainty(text)
    || containsMedicalOrDiagnosticClaim(text)
    || containsLegalClaim(text)
    || containsInvestmentInstruction(text)
    || containsOtherPersonIntent(text);
}

function containsCertainty(text: string) {
  const chineseTerms = ["\u4e00\u5b9a", "\u5fc5\u7136", "\u6ce8\u5b9a", "\u7edd\u5bf9", "\u5fc5\u5b9a", "\u80af\u5b9a\u4f1a", "\u4fdd\u8bc1\u4f1a"];
  if (chineseTerms.some((term) => containsUnqualifiedChineseTerm(text, term))) return true;
  if (/\b(?:always|never)\b/i.test(text)) return true;
  return /\b(?:definitely|certainly|inevitably|destined to|guaranteed to|will without doubt|proves? (?:that )?)\b/i.test(text)
    && !/\b(?:not|cannot|can't|isn't|aren't)\s+(?:definitely|certainly|inevitably|guaranteed)\b/i.test(text);
}

function containsMedicalOrDiagnosticClaim(text: string) {
  const condition = "(?:depression|anxiety(?: disorder)?|bipolar disorder|mental illness|heart disease|cancer|diabetes)";
  const diagnosis = new RegExp(`\\b(?:you (?:have|suffer from|are diagnosed with) |this (?:means|shows|proves) (?:that )?you have )(?:(?:a|an) )?(?:clinical )?${condition}\\b`, "i");
  const prescription = /\b(?:stop|start|skip|change|increase|decrease) (?:taking )?(?:your )?(?:prescribed )?(?:medication|medicine|treatment|dosage)\b/i;
  const chineseDiagnosis = /(?:\u4f60|\u60a8)(?:\u60a3\u6709|\u5f97\u4e86|\u88ab\u8bca\u65ad\u4e3a|\u6709)(?:\u6291\u90c1\u75c7|\u7126\u8651\u75c7|\u8e81\u90c1\u75c7|\u53cc\u76f8\u60c5\u611f\u969c\u788d|\u7cbe\u795e\u75be\u75c5|\u5fc3\u810f\u75c5|\u764c\u75c7|\u7cd6\u5c3f\u75c5)/;
  const chinesePrescription = /(?:\u505c\u836f|\u505c\u6b62\u670d\u836f|\u5f00\u59cb\u670d\u836f|\u66f4\u6539\u5242\u91cf|\u52a0\u5927\u5242\u91cf|\u51cf\u5c11\u5242\u91cf)/;
  return diagnosis.test(text) || prescription.test(text) || chineseDiagnosis.test(text) || chinesePrescription.test(text);
}

function containsLegalClaim(text: string) {
  return /\b(?:this|that|the) (?:contract|agreement|action|conduct) (?:is|constitutes) (?:illegal|unlawful|a crime|a breach)\b/i.test(text)
    || /\b(?:you should|you must|ignore|evade|violate) (?:the )?(?:law|court order|subpoena|contract)\b/i.test(text)
    || /(?:\u5408\u540c|\u534f\u8bae|\u884c\u4e3a|\u505a\u6cd5|\u8fd9|\u90a3)(?:\u662f|\u5c5e\u4e8e|\u6784\u6210)?(?:\u8fdd\u6cd5|\u975e\u6cd5|\u72af\u7f6a|\u8fdd\u7ea6)/.test(text)
    || /(?:\u5ffd\u7565|\u9003\u907f|\u8fdd\u53cd)(?:\u6cd5\u5f8b|\u6cd5\u9662\u547d\u4ee4|\u4f20\u7968|\u5408\u540c)/.test(text);
}

function containsInvestmentInstruction(text: string) {
  return /\b(?:(?:you (?:should|must|need to)|I (?:recommend|advise) (?:that )?you) (?:buy|sell|invest|divest|borrow to invest)|(?:buy|sell|divest) (?:this |the |your )?(?:stock|stocks|shares|fund|funds|investment) (?:now|immediately))\b/i.test(text)
    || /\b(?:investment|stock|fund).{0,24}\b(?:guaranteed returns?|risk-free returns?)\b/i.test(text)
    || /(?:\u73b0\u5728|\u7acb\u5373|\u9a6c\u4e0a|\u5e94\u8be5|\u5fc5\u987b|\u5efa\u8bae\u4f60|\u52a1\u5fc5).{0,8}(?:\u4e70\u5165|\u5356\u51fa|\u52a0\u4ed3|\u6e05\u4ed3|\u52a0\u6760\u6746|\u501f\u94b1\u6295\u8d44)/.test(text)
    || /(?:\u4e70\u5165|\u5356\u51fa|\u52a0\u4ed3|\u6e05\u4ed3|\u52a0\u6760\u6746|\u501f\u94b1\u6295\u8d44).{0,8}(?:\u73b0\u5728|\u7acb\u5373|\u9a6c\u4e0a)/.test(text)
    || /(?:\u6295\u8d44|\u7406\u8d22|\u80a1\u7968|\u57fa\u91d1).{0,12}(?:\u4fdd\u8bc1\u6536\u76ca|\u7a33\u8d5a|\u4fdd\u672c\u4fdd\u6536\u76ca)/.test(text);
}

function containsOtherPersonIntent(text: string) {
  return /\b(?:he|she|they|your (?:partner|spouse|coworker|colleague|manager|friend|family member)) (?:definitely |certainly |really )?(?:loves? you|doesn't love you|wants? to leave you|wants? to break up|is lying to you|hates? you|intends? to|is trying to (?:hurt|sabotage|deceive|control) you)\b/i.test(text)
    || /(?:\u4ed6|\u5979|\u5bf9\u65b9|\u4f34\u4fa3|\u540c\u4e8b|\u9886\u5bfc|\u670b\u53cb|\u5bb6\u4eba)(?:\u4e00\u5b9a|\u80af\u5b9a|\u5176\u5b9e|\u5c31\u662f)?(?:\u7231\u4f60|\u4e0d\u7231\u4f60|\u60f3\u79bb\u5f00|\u60f3\u5206\u624b|\u60f3\u590d\u5408|\u5728\u9a97\u4f60|\u8ba8\u538c\u4f60|\u60f3\u5bb3\u4f60|\u60f3\u63a7\u5236\u4f60)/.test(text);
}

function containsUnqualifiedChineseTerm(text: string, term: string) {
  let index = text.indexOf(term);
  while (index !== -1) {
    const prefix = text.slice(Math.max(0, index - 8), index);
    if (!["\u4e0d", "\u672a\u5fc5", "\u5e76\u975e", "\u4e0d\u662f", "\u4e0d\u80fd", "\u65e0\u6cd5", "\u4e0d\u8981"].some((qualifier) => prefix.endsWith(qualifier))) return true;
    index = text.indexOf(term, index + term.length);
  }
  return false;
}

function hasExactKeys(value: unknown, expected: string[]): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const actual = Object.keys(value).sort();
  const sortedExpected = [...expected].sort();
  return actual.length === sortedExpected.length && actual.every((key, index) => key === sortedExpected[index]);
}

function readText(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function resolveNow(now: Now) {
  const value = typeof now === "function" ? now() : now;
  return value instanceof Date && Number.isFinite(value.getTime()) ? value.toISOString() : null;
}

function isPresent<T>(value: T | null): value is T {
  return value !== null;
}

function failed(issues: string[]): CritiqueResult {
  return { passed: false, issues };
}
