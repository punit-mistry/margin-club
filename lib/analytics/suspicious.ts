import type { Flag, FlagId, FlaggedTransaction, Transaction } from "./types";
import { productById } from "./dataset";

/**
 * Transparent rules for "suspicious" transactions. Nothing here is a model:
 * every flag is a plain condition you can read, and the score is a formula.
 */

export const LOW_MARGIN_THRESHOLD = 0.45; // list margin below 45 %

export const FLAGS: Record<FlagId, Flag> = {
  "loss-making": {
    id: "loss-making",
    label: "LOSS-MAKING",
    description: "Contribution profit below zero after discount, COGS, shipping, packaging and fees.",
  },
  "deep-discount": {
    id: "deep-discount",
    label: "DEEP DISCOUNT",
    description: "Order-level discount of 35% or more.",
  },
  "low-margin-discounted": {
    id: "low-margin-discounted",
    label: "THIN-MARGIN SKU ON SALE",
    description: `Contains a product whose list margin is under ${LOW_MARGIN_THRESHOLD * 100}% and was discounted 25% or more.`,
  },
  "fee-heavy-loss": {
    id: "fee-heavy-loss",
    label: "FEES ATE THE MARGIN",
    description: "Marketplace or quick-commerce commission (15%+ of revenue) was larger than the profit the brand kept.",
  },
  "welcome-reuse": {
    id: "welcome-reuse",
    label: "WELCOME CODE REUSED",
    description: "First-order code WELCOME10 applied to a returning customer's order.",
  },
};

const WEIGHT: Record<FlagId, number> = {
  "loss-making": 400,
  "deep-discount": 150,
  "low-margin-discounted": 200,
  "fee-heavy-loss": 120,
  "welcome-reuse": 180,
};

export function flagsFor(tx: Transaction): FlagId[] {
  const flags: FlagId[] = [];
  if (tx.profit < 0) flags.push("loss-making");
  if (tx.discountPct >= 35) flags.push("deep-discount");
  if (tx.discountPct >= 25 && tx.lines.some((l) => {
    const p = productById(l.productId);
    return (p.price - p.unitCost) / p.price < LOW_MARGIN_THRESHOLD;
  })) flags.push("low-margin-discounted");
  if (tx.fees >= tx.net * 0.15 && tx.fees > tx.profit) flags.push("fee-heavy-loss");
  if (tx.coupon === "WELCOME10" && tx.customerOrderNo > 1) flags.push("welcome-reuse");
  return flags;
}

/** score = Σ flag weights + rupees lost (if any). */
export function scoreOf(tx: Transaction, flags: FlagId[]): number {
  return flags.reduce((s, f) => s + WEIGHT[f], 0) + Math.max(0, -tx.profit);
}

export function flagged(txs: Transaction[]): FlaggedTransaction[] {
  const out: FlaggedTransaction[] = [];
  for (const tx of txs) {
    const flags = flagsFor(tx);
    if (flags.length) out.push({ tx, flags, score: scoreOf(tx, flags) });
  }
  return out.sort((a, b) => b.score - a.score);
}

export function flagCounts(list: FlaggedTransaction[]): Record<FlagId, number> {
  const counts = { "loss-making": 0, "deep-discount": 0, "low-margin-discounted": 0, "fee-heavy-loss": 0, "welcome-reuse": 0 };
  for (const f of list) for (const id of f.flags) counts[id]++;
  return counts;
}
