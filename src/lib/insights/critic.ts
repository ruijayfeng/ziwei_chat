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
  const hasEnglishAssertion = /\b(?:you|he|she|they|this|that|it|the \w+)\b.{0,24}\b(?:always|never|definitely|certainly|inevitably|destined|guaranteed|without doubt|proves?)\b/i.test(text)
    || /\b(?:definitely|certainly|inevitably|destined|guaranteed|without doubt)\b.{0,24}\b(?:is|are|will|can|has|have|succeed|fail|happen|occur)\b/i.test(text);
  const hasChineseAssertion = /(?:\u4f60|\u60a8|\u4ed6|\u5979|\u4ed6\u4eec|\u8fd9|\u90a3|\u6b64).{0,12}(?:\u4e00\u5b9a|\u5fc5\u7136|\u6ce8\u5b9a|\u7edd\u5bf9|\u5fc5\u5b9a|\u80af\u5b9a|\u4fdd\u8bc1).{0,12}(?:\u662f|\u4f1a|\u80fd|\u6709|\u6210\u529f|\u5931\u8d25|\u53d1\u751f)/.test(text);
  return (hasEnglishAssertion || hasChineseAssertion) && !containsProtectiveNegation(text);
}

function containsMedicalOrDiagnosticClaim(text: string) {
  const condition = "(?:depression|anxiety(?: disorder)?|bipolar disorder|mental illness|heart disease|cancer|diabetes)";
  const diagnosis = new RegExp(`\\b(?:you (?:have|suffer from|are diagnosed with) |this (?:means|shows|proves) (?:that )?you have )(?:(?:a|an) )?(?:clinical )?${condition}\\b`, "i");
  const prescription = hasDirective(text)
    && hasDomainAction(
      text,
      /\b(?:medication|medicine|treatment|dose|dosage|prescription|prescribed)\b/i,
      /\b(?:stop|start|skip|change|increase|decrease|double|take)\b/i,
    );
  const chineseDiagnosis = /(?:\u4f60|\u60a8)(?:\u60a3\u6709|\u5f97\u4e86|\u88ab\u8bca\u65ad\u4e3a|\u6709)(?:\u6291\u90c1\u75c7|\u7126\u8651\u75c7|\u8e81\u90c1\u75c7|\u53cc\u76f8\u60c5\u611f\u969c\u788d|\u7cbe\u795e\u75be\u75c5|\u5fc3\u810f\u75c5|\u764c\u75c7|\u7cd6\u5c3f\u75c5)/;
  const chinesePrescription = hasDirective(text)
    && hasDomainAction(
      text,
      /(?:\u836f|\u836f\u91cf|\u5242\u91cf|\u6cbb\u7597)/,
      /(?:\u505c|\u5f00\u59cb|\u66f4\u6539|\u52a0\u5927|\u51cf\u5c11|\u7ffb\u500d|\u670d\u7528|\u5403)/,
    );
  return diagnosis.test(text) || prescription || chineseDiagnosis.test(text) || chinesePrescription;
}

function containsLegalClaim(text: string) {
  const englishDirective = hasDirective(text)
    && hasDomainAction(
      text,
      /\b(?:law|court order|subpoena|contract|agreement)\b/i,
      /\b(?:break|ignore|evade|violate|disobey)\b/i,
    );
  const chineseDirective = hasDirective(text)
    && hasDomainAction(
      text,
      /(?:\u6cd5\u5f8b|\u6cd5\u9662\u547d\u4ee4|\u4f20\u7968|\u5408\u540c|\u534f\u8bae)/,
      /(?:\u8fdd\u53cd|\u8fdd\u6cd5|\u5ffd\u7565|\u9003\u907f|\u8fdd\u80cc)/,
    );
  return /\b(?:this|that|the) (?:contract|agreement|action|conduct) (?:is|constitutes) (?:illegal|unlawful|a crime|a breach)\b/i.test(text)
    || englishDirective
    || /(?:\u5408\u540c|\u534f\u8bae|\u884c\u4e3a|\u505a\u6cd5|\u8fd9|\u90a3)(?:\u662f|\u5c5e\u4e8e|\u6784\u6210)?(?:\u8fdd\u6cd5|\u975e\u6cd5|\u72af\u7f6a|\u8fdd\u7ea6)/.test(text)
    || chineseDirective;
}

function containsInvestmentInstruction(text: string) {
  const englishDirective = hasDirective(text)
    && hasDomainAction(
      text,
      /\b(?:investment|stock|stocks|shares|fund|funds|bitcoin|crypto|cryptocurrency|savings)\b/i,
      /\b(?:buy|sell|invest|divest|borrow|put|stake)\b/i,
    );
  const chineseDirective = hasDirective(text)
    && hasDomainAction(
      text,
      /(?:\u6295\u8d44|\u7406\u8d22|\u80a1\u7968|\u57fa\u91d1|\u6bd4\u7279\u5e01|\u865a\u62df\u5e01|\u79ef\u84c4)/,
      /(?:\u4e70\u5165|\u5356\u51fa|\u6295\u5165|\u52a0\u4ed3|\u6e05\u4ed3|\u52a0\u6760\u6746|\u501f\u94b1|\u5168\u90e8|\u5168\u4ed3)/,
    );
  return englishDirective
    || chineseDirective
    || /\b(?:investment|stock|fund).{0,24}\b(?:guaranteed returns?|risk-free returns?)\b/i.test(text)
    || /(?:\u6295\u8d44|\u7406\u8d22|\u80a1\u7968|\u57fa\u91d1).{0,12}(?:\u4fdd\u8bc1\u6536\u76ca|\u7a33\u8d5a|\u4fdd\u672c\u4fdd\u6536\u76ca)/.test(text);
}

function containsOtherPersonIntent(text: string) {
  const englishSubject = /\b(?:he|she|they|your (?:partner|spouse|coworker|colleague|manager|friend|family member))\b/i;
  const englishIntent = /\b(?:wants?|plans?|intends?|is trying|is planning|is lying|loves?|hates?)\b/i;
  const englishIntentAction = /\b(?:leave|abandon|break up|hurt|sabotage|deceive|control|lie|love|hate)\b/i;
  const chineseSubject = /(?:\u4ed6|\u5979|\u5bf9\u65b9|(?:\u4f60\u7684)?\u4f34\u4fa3|(?:\u4f60\u7684)?\u540c\u4e8b|(?:\u4f60\u7684)?\u9886\u5bfc|(?:\u4f60\u7684)?\u670b\u53cb|(?:\u4f60\u7684)?\u5bb6\u4eba)/;
  const chineseIntent = /(?:\u60f3|\u6253\u7b97|\u8ba1\u5212|\u51c6\u5907|\u4f01\u56fe|\u5728)/;
  const chineseIntentAction = /(?:\u79bb\u5f00|\u629b\u5f03|\u5206\u624b|\u590d\u5408|\u9a97|\u8ba8\u538c|\u5bb3|\u63a7\u5236|\u7834\u574f|\u7231)/;
  return (englishSubject.test(text) && englishIntent.test(text) && englishIntentAction.test(text))
    || (chineseSubject.test(text) && chineseIntent.test(text) && chineseIntentAction.test(text));
}

function hasDirective(text: string) {
  return /\b(?:you (?:should|must|need to)|I (?:recommend|advise) (?:that )?you)\b/i.test(text)
    || /(?:^|[.!?]\s*)(?:stop|start|skip|change|increase|decrease|double|take|break|ignore|evade|violate|buy|sell|invest|divest|borrow|put|stake)\b/i.test(text)
    || /(?:\u5e94\u8be5|\u8be5|\u5fc5\u987b|\u52a1\u5fc5|\u5efa\u8bae\u4f60|\u7acb\u5373|\u9a6c\u4e0a)/.test(text);
}

function hasDomainAction(text: string, domain: RegExp, action: RegExp) {
  return domain.test(text) && action.test(text);
}

function containsProtectiveNegation(text: string) {
  return /\b(?:not|never|do not|don't|cannot|can't|shouldn't|mustn't)\b/i.test(text)
    || /(?:\u4e0d\u8981|\u4e0d\u80fd|\u4e0d\u53ef|\u5207\u52ff|\u522b|\u5e76\u975e|\u672a\u5fc5|\u65e0\u6cd5)/.test(text);
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
