import * as h from "./handlers";
import { parseQuestion } from "./parse";
import type { AnalysisDraft, AnalysisResult, EngineContext, IntentId } from "./types";

/**
 * LOCAL ANALYSIS ENGINE
 * question → rules-based parser → deterministic handler over the dataset → result.
 * No network, no model. Every figure is computed from lib/analytics.
 */

const HANDLERS: Record<IntentId, (input: h.HandlerInput, q: string) => AnalysisDraft> = {
  "profit-decline": h.profitDecline,
  "product-margins": h.productMargins,
  suspicious: h.suspicious,
  "discount-effect": h.discountEffect,
  "month-compare": h.monthCompare,
  actions: h.actions,
  "revenue-increase": h.revenueIncrease,
  channels: h.channels,
  "channel-detail": h.channelDetail,
  customers: h.customers,
  "product-detail": h.productDetail,
  "month-profile": h.monthProfile,
  "coupon-detail": h.couponDetail,
  "band-detail": h.discountEffect,
  unknown: h.unknown,
};

export function investigate(question: string, ctx: EngineContext, id: string, now: number): AnalysisResult {
  const parsed = parseQuestion(question, ctx);
  const draft = HANDLERS[parsed.intent]({ range: ctx.range, entities: parsed.entities }, question);
  return {
    ...draft,
    id,
    question,
    intent: parsed.intent,
    entities: parsed.entities,
    rule: parsed.rule,
    followUp: parsed.followUp,
    range: ctx.range,
    engine: { kind: "local" },
    createdAt: now,
    steps: [{ label: "Read the question", detail: `Rule matched: ${parsed.rule}.` }, ...draft.steps],
  };
}

/** Plain-text rendering of a result (markup stripped) — used for the Ollama prompt and copy. */
export function resultToFacts(r: AnalysisResult): string {
  const strip = (s: string) => s.replace(/\[\[(.+?)\]\]/g, "$1").replace(/\{\{(.+?)\}\}/g, "$1");
  const lines = [
    `QUESTION: ${r.question}`,
    `HEADLINE: ${r.headline}`,
    ...r.explanation.map((p) => `FACT: ${strip(p)}`),
    ...r.findings.map((f) => `METRIC: ${f.label} = ${f.value}${f.note ? ` (${f.note})` : ""}`),
  ];
  if (r.table) {
    lines.push(`TABLE: ${r.table.columns.join(" | ")}`);
    for (const row of r.table.rows) lines.push(`ROW: ${row.join(" | ")}`);
  }
  for (const a of r.actions ?? []) lines.push(`ACTION: ${a.title} — ${a.rationale}`);
  for (const c of r.caveats) lines.push(`CAVEAT: ${c}`);
  return lines.join("\n");
}
