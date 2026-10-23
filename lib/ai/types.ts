import type { ChannelId, DiscountBandId, EvidenceRef, MonthKey, MonthRange } from "../analytics/types";

export type CanvasMode = "trap" | "products" | "customers" | "channels";

export type IntentId =
  | "profit-decline"
  | "product-margins"
  | "suspicious"
  | "discount-effect"
  | "month-compare"
  | "actions"
  | "revenue-increase"
  | "channels"
  | "channel-detail"
  | "customers"
  | "product-detail"
  | "month-profile"
  | "coupon-detail"
  | "band-detail"
  | "unknown";

export interface Entities {
  productIds: string[];
  channels: ChannelId[];
  months: MonthKey[];
  coupons: string[];
  bands: DiscountBandId[];
}

export interface ParsedQuestion {
  intent: IntentId;
  entities: Entities;
  /** True when the intent was inherited from the previous answer ("why?", "tell me more"). */
  followUp: boolean;
  /** Which rule fired — shown to the user for transparency. */
  rule: string;
}

export interface EngineContext {
  range: MonthRange;
  previous?: { intent: IntentId; entities: Entities };
}

export interface AnalysisStep {
  label: string;
  detail: string;
}

export type Tone = "red" | "blue" | "ink";

export interface Finding {
  label: string;
  value: string;
  tone: Tone;
  note?: string;
}

export interface EvidenceSet {
  id: string; // "EV-01"
  title: string;
  description: string;
  orderIds: string[];
  ref?: EvidenceRef;
}

export interface ActionItem {
  title: string;
  rationale: string;
  watch: string;
}

export interface DataTable {
  columns: string[];
  rows: string[][];
  /** Column index → tone of each cell, optional per row. */
  tones?: (Tone | null)[][];
}

export type EngineLabel =
  | { kind: "local" }
  | { kind: "ollama"; model: string; status: "ok" }
  | { kind: "ollama"; model: string; status: "failed"; error: string };

/**
 * The output of one investigation step. Every number inside `explanation`,
 * `findings`, `table` and `actions` comes from lib/analytics.
 * Inline markup: [[value]] = highlighted figure, {{value}} = red warning.
 */
export interface AnalysisResult {
  id: string;
  question: string;
  intent: IntentId;
  entities: Entities;
  rule: string;
  followUp: boolean;
  range: MonthRange;
  caseTitle: string;
  steps: AnalysisStep[];
  metrics: string[];
  headline: string;
  explanation: string[];
  findings: Finding[];
  table?: DataTable;
  actions?: ActionItem[];
  evidence: EvidenceSet[];
  focus?: { mode: CanvasMode; ref?: EvidenceRef; compare?: [MonthKey, MonthKey] };
  nextQuestions: string[];
  caveats: string[];
  engine: EngineLabel;
  /** Optional narration written by a local Ollama model from the facts above. */
  narration?: string;
  createdAt: number;
}

export type AnalysisDraft = Omit<AnalysisResult, "id" | "question" | "intent" | "entities" | "rule" | "followUp" | "range" | "engine" | "createdAt">;
