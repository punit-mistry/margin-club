import type { ChannelId, MonthKey, MonthRange, Totals, Transaction } from "../analytics/types";
import { channelById, getDataset, productById } from "../analytics/dataset";
import {
  change, inr, inrCompact, monthLong, monthShort, monthYear, num, pct, pts, rangeLabel, relChange,
} from "../analytics/format";
import { filterRange, monthsInRange, openingClosing, prevMonth } from "../analytics/periods";
import {
  bandOf, breakEvenDiscount, byBand, byChannel, byCoupon, byMonth, byProduct, heroShare, lineFacts, profitBridge, totals,
} from "../analytics/metrics";
import { cohorts, repeatBySegment, SEGMENT_LABEL, activityByMonth } from "../analytics/customers";
import { FLAGS, flagCounts, flagged, LOW_MARGIN_THRESHOLD } from "../analytics/suspicious";
import type { ActionItem, AnalysisDraft, DataTable, Entities, EvidenceSet, Finding } from "./types";

/* ------------------------------------------------------------------ */
/* Shared helpers                                                      */
/* ------------------------------------------------------------------ */

export interface HandlerInput {
  range: MonthRange;
  entities: Entities;
}

const H = (s: string) => `[[${s}]]`; // highlighted figure
const R = (s: string) => `{{${s}}}`; // red warning figure

/** Format a change so that a fall is red and a rise is highlighted (or the reverse). */
function tone(a: number, b: number, goodWhenUp = true, f = change): string {
  const s = f(a, b);
  const up = b > a;
  return up === goodWhenUp ? H(s) : R(s);
}

function scope(range: MonthRange) {
  const txs = filterRange(getDataset().transactions, range);
  const months = monthsInRange(range);
  return { txs, months, label: rangeLabel(range.from, range.to) };
}

function windows(range: MonthRange) {
  const { txs, months, label } = scope(range);
  const { opening, closing } = openingClosing(range);
  const oTx = txs.filter((t) => opening.includes(t.month));
  const cTx = txs.filter((t) => closing.includes(t.month));
  return {
    txs, months, label, opening, closing, oTx, cTx,
    o: totals(oTx), c: totals(cTx),
    oLabel: rangeLabel(opening[0], opening[opening.length - 1]),
    cLabel: rangeLabel(closing[0], closing[closing.length - 1]),
  };
}

function evidence() {
  let n = 0;
  const list: EvidenceSet[] = [];
  return {
    list,
    add(e: Omit<EvidenceSet, "id">) {
      if (!e.orderIds.length) return;
      n++;
      list.push({ ...e, id: `EV-${String(n).padStart(2, "0")}` });
    },
  };
}

const ids = (txs: Transaction[], limit = 400) => txs.slice(0, limit).map((t) => t.id);
const byLoss = (a: Transaction, b: Transaction) => a.profit - b.profit;

function thinProducts() {
  return getDataset().products.filter((p) => (p.price - p.unitCost) / p.price < LOW_MARGIN_THRESHOLD);
}

const HEADLINE_CAMPAIGNS = () => getDataset().campaigns.filter((c) => !c.newOnly && c.channels.length >= 2);

function promoOn(date: string): string | null {
  const live = HEADLINE_CAMPAIGNS().filter((c) => date >= c.from && date <= c.to).sort((a, b) => b.pct - a.pct);
  return live[0]?.code ?? null;
}

function dailySplit(txs: Transaction[]) {
  const days = new Map<string, { orders: number; profit: number; net: number; promo: boolean }>();
  for (const t of txs) {
    const d = days.get(t.date) ?? { orders: 0, profit: 0, net: 0, promo: promoOn(t.date) !== null };
    d.orders++;
    d.profit += t.profit;
    d.net += t.net;
    days.set(t.date, d);
  }
  const agg = (promo: boolean) => {
    const list = [...days.values()].filter((d) => d.promo === promo);
    const n = list.length || 1;
    return {
      days: list.length,
      orders: list.reduce((s, d) => s + d.orders, 0) / n,
      profit: list.reduce((s, d) => s + d.profit, 0) / n,
      net: list.reduce((s, d) => s + d.net, 0) / n,
    };
  };
  return { promo: agg(true), normal: agg(false) };
}

function needsTwoMonths(range: MonthRange): AnalysisDraft | null {
  if (monthsInRange(range).length >= 2) return null;
  return {
    caseTitle: "NOT ENOUGH TIME ON THE CLOCK",
    steps: [{ label: "Checked date range", detail: `Only ${monthYear(range.from)} is selected.` }],
    metrics: [],
    headline: "A trend needs at least two months of evidence.",
    explanation: [
      `The current date range covers a single month (${monthLong(range.from)}). Widen the range in the top bar to compare periods — or ask about ${monthShort(range.from)} specifically.`,
    ],
    findings: [],
    evidence: [],
    nextQuestions: [`What happened in ${monthLong(range.from)}?`, "Show me the most suspicious transactions."],
    caveats: [],
  };
}

function bridgeTable(a: Totals, b: Totals, aLabel: string, bLabel: string): DataTable {
  const lines = profitBridge(a, b);
  return {
    columns: ["Per ₹100 of list value", aLabel, bLabel, "Change"],
    rows: lines.map((l) => [l.label, `₹${(l.a * 100).toFixed(1)}`, `₹${(l.b * 100).toFixed(1)}`, pts(l.a, l.b).replace(" pts", "")]),
    tones: lines.map((l) => {
      const worse = l.key === "profit" ? l.b < l.a : l.b > l.a;
      return [null, null, null, Math.abs(l.b - l.a) < 0.005 ? null : worse ? "red" : "blue"];
    }),
  };
}

/* ------------------------------------------------------------------ */
/* 1. Why is profit declining?                                         */
/* ------------------------------------------------------------------ */

export function profitDecline({ range }: HandlerInput): AnalysisDraft {
  const short = needsTwoMonths(range);
  if (short) return short;
  const w = windows(range);
  const { o, c } = w;
  const bridge = profitBridge(o, c);
  const costMovers = bridge.filter((l) => l.key !== "profit").sort((x, y) => y.b - y.a - (x.b - x.a));
  const top = costMovers[0];
  const disc = bridge.find((l) => l.key === "discount")!;
  const cogs = bridge.find((l) => l.key === "cogs")!;
  const thin = thinProducts();
  const thinIds = thin.map((p) => p.id);
  const thinO = heroShare(w.oTx, thinIds);
  const thinC = heroShare(w.cTx, thinIds);
  const fullO = o.orders - o.discountedOrders;
  const fullC = c.orders - c.discountedOrders;

  const pO = byProduct(w.oTx);
  const pC = byProduct(w.cTx);
  const best = [...pC].sort((a, b) => b.net - a.net).slice(0, 6);
  const eroded = best.filter((p) => p.margin < pO.find((x) => x.product.id === p.product.id)!.margin - 0.01);

  const revenueUp = c.net > o.net;
  const profitDown = c.profit < o.profit;

  const headline = revenueUp && profitDown
    ? `Revenue rose ${change(o.net, c.net).replace("+", "")}, but contribution profit fell ${change(o.profit, c.profit).replace("−", "")}.`
    : profitDown
      ? `Profit fell ${change(o.profit, c.profit).replace("−", "")} — and revenue did not make up for it.`
      : `Profit is not declining in this range: it moved ${change(o.profit, c.profit)}.`;

  const explanation: string[] = [
    `Comparing the opening window (${w.oLabel}) with the closing window (${w.cLabel}): net revenue went from ${H(inrCompact(o.net))} to ${H(inrCompact(c.net))} (${tone(o.net, c.net)}), while contribution profit went from ${H(inrCompact(o.profit))} to ${profitDown ? R(inrCompact(c.profit)) : H(inrCompact(c.profit))} (${tone(o.profit, c.profit)}). Margin moved from ${H(pct(o.margin))} to ${c.margin < o.margin ? R(pct(c.margin)) : H(pct(c.margin))}.`,
  ];
  if (top && top.b - top.a > 0.005) {
    explanation.push(
      `Follow the rupee. Out of every ₹100 of list-price value, ${top.label.toLowerCase()} took ${H(`₹${(top.a * 100).toFixed(1)}`)} in the opening window and ${R(`₹${(top.b * 100).toFixed(1)}`)} in the closing window — the single biggest change in the cost stack.` +
        (top.key !== "cogs" && cogs.b - cogs.a > 0.01
          ? ` Product cost also rose from ₹${(cogs.a * 100).toFixed(1)} to ${R(`₹${(cogs.b * 100).toFixed(1)}`)}. Unit costs and list prices are fixed in this dataset, so that increase comes entirely from selling a different mix of products.`
          : ""),
    );
  }
  if (c.discountedOrders > 0) {
    const fasterDisc = relChange(o.discountedOrders, c.discountedOrders) > relChange(fullO, fullC);
    explanation.push(
      `Discounted orders went from ${H(num(o.discountedOrders))} (${pct(o.discountedShare, 0)} of orders) to ${R(num(c.discountedOrders))} (${pct(c.discountedShare, 0)}), while full-price orders went from ${num(fullO)} to ${num(fullC)}.` +
        (fasterDisc ? ` Discounted orders grew faster than full-price orders.` : ""),
    );
  }
  if (thin.length && thinC > thinO + 0.02) {
    explanation.push(
      `Mix is the second leak. ${thin.map((p) => p.name).join(" and ")} — the only products with a list margin under ${pct(LOW_MARGIN_THRESHOLD, 0)} — went from ${H(pct(thinO))} to ${R(pct(thinC))} of list-price sales.` +
        (eroded.length >= 2 ? ` Contribution margin fell on ${eroded.length === best.length ? `all ${best.length}` : `${eroded.length} of your ${best.length}`} best-selling products.` : ""),
    );
  }

  const lossC = w.cTx.filter((t) => t.profit < 0).sort(byLoss);
  const deepC = w.cTx.filter((t) => t.discountPct >= 35).sort(byLoss);
  const thinDisc = w.cTx.filter((t) => t.discountPct >= 25 && t.lines.some((l) => thinIds.includes(l.productId))).sort(byLoss);
  const ev = evidence();
  ev.add({ title: `Loss-making orders, ${w.cLabel}`, description: "Orders whose contribution profit is below zero.", orderIds: ids(lossC) });
  ev.add({ title: `35%+ discount orders, ${w.cLabel}`, description: "Deepest-discount orders in the closing window.", orderIds: ids(deepC) });
  ev.add({ title: `Thin-margin SKUs sold at 25%+ off`, description: `${thin.map((p) => p.name).join(", ")} discounted 25% or more.`, orderIds: ids(thinDisc) });

  const findings: Finding[] = [
    { label: "Revenue", value: change(o.net, c.net), tone: revenueUp ? "blue" : "red", note: `${inrCompact(o.net)} → ${inrCompact(c.net)}` },
    { label: "Contribution profit", value: change(o.profit, c.profit), tone: profitDown ? "red" : "blue", note: `${inrCompact(o.profit)} → ${inrCompact(c.profit)}` },
    { label: "Discount take", value: pts(disc.a, disc.b), tone: disc.b > disc.a ? "red" : "blue", note: "share of list value" },
    { label: "Loss-making orders", value: num(c.lossOrders), tone: c.lossOrders > o.lossOrders ? "red" : "ink", note: `was ${num(o.lossOrders)} in ${w.oLabel}` },
  ];

  return {
    caseTitle: "THE MARGIN LEAK",
    steps: [
      { label: "Scoped the books", detail: `${num(w.txs.length)} orders, ${w.label}.` },
      { label: "Split the timeline", detail: `Opening window ${w.oLabel} (${num(o.orders)} orders) vs closing window ${w.cLabel} (${num(c.orders)} orders).` },
      { label: "Rebuilt the profit bridge", detail: "Split every ₹ of list value into discount, COGS, shipping, packaging, fees and profit." },
      { label: "Ranked the cost lines", detail: `Largest mover: ${top?.label ?? "none"} (${top ? pts(top.a, top.b) : "—"}).` },
      { label: "Checked product mix", detail: `Thin-margin SKUs: ${pct(thinO)} → ${pct(thinC)} of list sales.` },
      { label: "Pulled supporting orders", detail: `${num(lossC.length)} loss-making orders in the closing window.` },
    ],
    metrics: ["Net revenue", "Contribution profit", "Contribution margin", "Discount ÷ list value", "COGS ÷ list value", "Discounted order share", "Thin-SKU share"],
    headline,
    explanation,
    findings,
    table: bridgeTable(o, c, w.oLabel, w.cLabel),
    evidence: ev.list,
    focus: { mode: "trap", compare: [w.opening[0], w.closing[w.closing.length - 1]] },
    nextQuestions: ["Which products are hurting my margins?", "Are discounts helping revenue but hurting profitability?", "Give me three actions I should take."],
    caveats: [
      "Contribution profit = net revenue − COGS − shipping − packaging − channel fees. Ad spend, salaries and rent are not in this dataset.",
    ],
  };
}

/* ------------------------------------------------------------------ */
/* 2. Which products are hurting margins?                              */
/* ------------------------------------------------------------------ */

export function productMargins({ range }: HandlerInput): AnalysisDraft {
  const w = windows(range);
  const twoWindows = w.months.length >= 2;
  const pC = byProduct(twoWindows ? w.cTx : w.txs);
  const pO = byProduct(twoWindows ? w.oTx : w.txs);
  const overall = twoWindows ? w.c.margin : totals(w.txs).margin;
  // Drag = how many margin points each product pulls the blended margin down by.
  const ranked = pC
    .map((p) => ({ ...p, drag: p.revenueShare * (overall - p.margin), before: pO.find((x) => x.product.id === p.product.id)! }))
    .sort((a, b) => b.drag - a.drag);
  const culprits = ranked.filter((p) => p.drag > 0.004).slice(0, 2);
  const stars = [...pC].filter((p) => p.revenueShare > 0.03).sort((a, b) => b.margin - a.margin).slice(0, 2);
  const period = twoWindows ? w.cLabel : w.label;

  const explanation: string[] = [];
  if (culprits.length) {
    explanation.push(
      `I ranked products by how far they pull the blended ${period} margin (${H(pct(overall))}) down: revenue share × (blended margin − product margin). ${culprits
        .map((p) => `${p.product.name} drags it by ${R(`${(p.drag * 100).toFixed(1)} pts`)}`)
        .join("; ")}.`,
    );
    for (const p of culprits) {
      const lm = p.listMargin;
      explanation.push(
        `${p.product.name}: ${H(pct(p.revenueShare))} of revenue at a ${R(pct(p.margin))} contribution margin` +
          (twoWindows ? ` (was ${pct(p.before.revenueShare)} of revenue at ${pct(p.before.margin)} in ${w.oLabel}).` : ".") +
          ` At list price it keeps ${pct(lm)} before shipping and fees; it sold at an average ${pct(p.avgDiscount)} discount, leaving little room.`,
      );
    }
  } else {
    explanation.push(`No single product drags the ${period} margin down by more than 0.4 points — margins are evenly spread.`);
  }
  if (stars.length) {
    explanation.push(
      `For contrast, ${stars.map((s) => `${s.product.name} (${H(pct(s.margin))})`).join(" and ")} earn the strongest margins` +
        (twoWindows ? `, and together their revenue share went from ${pct(stars.reduce((s, x) => s + pO.find((y) => y.product.id === x.product.id)!.revenueShare, 0))} to ${pct(stars.reduce((s, x) => s + x.revenueShare, 0))}.` : "."),
    );
  }

  const ev = evidence();
  for (const p of culprits) {
    const list = (twoWindows ? w.cTx : w.txs).filter((t) => t.discountPct >= 25 && t.lines.some((l) => l.productId === p.product.id)).sort(byLoss);
    ev.add({ title: `${p.product.name} sold at 25%+ off`, description: `Orders containing ${p.product.name} with a 25%+ discount, ${period}.`, orderIds: ids(list), ref: { kind: "product", id: p.product.id } });
  }

  return {
    caseTitle: "THE USUAL SUSPECTS",
    steps: [
      { label: "Allocated order costs to products", detail: "Discount & fees pro-rata to list value; shipping to heavy items; packaging per line." },
      { label: "Computed product margins", detail: `${getDataset().products.length} products, ${period}${twoWindows ? ` vs ${w.oLabel}` : ""}.` },
      { label: "Measured margin drag", detail: "Revenue share × (blended margin − product margin)." },
      { label: "Pulled discounted orders", detail: culprits.map((c) => c.product.name).join(", ") || "none" },
    ],
    metrics: ["Line-level net revenue", "Allocated contribution profit", "Product margin", "Revenue share", "Margin drag"],
    headline: culprits.length
      ? `${culprits.map((c) => c.product.name).join(" and ")} ${culprits.length > 1 ? "are" : "is"} pulling your margin down.`
      : "No product is a clear margin drag in this range.",
    explanation,
    findings: [
      ...culprits.map((p): Finding => ({ label: p.product.name, value: pct(p.margin), tone: "red", note: `${pct(p.revenueShare)} of revenue` })),
      ...stars.slice(0, 1).map((s): Finding => ({ label: s.product.name, value: pct(s.margin), tone: "blue", note: "highest margin" })),
    ],
    table: {
      columns: ["Product", "Rev. share", "Margin", twoWindows ? "Δ margin" : "Avg disc."],
      rows: ranked.map((p) => [p.product.name, pct(p.revenueShare), pct(p.margin), twoWindows ? pts(p.before.margin, p.margin).replace(" pts", "") : pct(p.avgDiscount)]),
      tones: ranked.map((p) => [null, null, p.margin < overall * 0.6 ? "red" : null, null]),
    },
    evidence: ev.list,
    focus: { mode: "products", ref: culprits[0] ? { kind: "product", id: culprits[0].product.id } : undefined },
    nextQuestions: [
      culprits[0] ? `Tell me about the ${culprits[0].product.name}.` : "Why is my profit declining?",
      "Which channels are least profitable?",
      "Give me three actions I should take.",
    ],
    caveats: ["Product margins use an allocation of order-level costs; the method is shown in the first step."],
  };
}

/* ------------------------------------------------------------------ */
/* 3. Suspicious transactions                                          */
/* ------------------------------------------------------------------ */

export function suspicious({ range }: HandlerInput): AnalysisDraft {
  const { txs, label } = scope(range);
  const list = flagged(txs);
  const counts = flagCounts(list);
  const loss = txs.filter((t) => t.profit < 0).sort(byLoss);
  const lossTotal = loss.reduce((s, t) => s + t.profit, 0);
  const tally = <K extends string>(keyOf: (t: Transaction) => K[]) => {
    const m = new Map<K, number>();
    for (const t of loss) for (const k of keyOf(t)) m.set(k, (m.get(k) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };
  const byCode = tally((t) => [t.coupon ?? "FULL PRICE"]);
  const byProd = tally((t) => [...new Set(t.lines.map((l) => l.productId))]);
  const byCh = tally((t) => [t.channel]);
  const top = list.slice(0, 12);
  const reuse = list.filter((f) => f.flags.includes("welcome-reuse")).map((f) => f.tx);

  const explanation: string[] = [
    `I ran five plain-language rules over ${H(num(txs.length))} orders (${label}). ${H(num(list.length))} orders tripped at least one. No model is involved — each rule is listed under the evidence.`,
  ];
  if (loss.length) {
    explanation.push(
      `${R(num(loss.length))} orders lost money outright — ${R(inr(Math.abs(lossTotal)))} in total. ` +
        (byCode[0] ? `${byCode[0][0]} accounts for ${H(num(byCode[0][1]))} of them` : "") +
        (byCode[1] ? `, ${byCode[1][0]} for ${num(byCode[1][1])}` : "") +
        `. ${byProd[0] ? `${productById(byProd[0][0]).name} appears in ${H(pct(byProd[0][1] / loss.length, 0))} of loss-making orders` : ""}` +
        (byCh[0] ? `, and ${channelById(byCh[0][0] as ChannelId).name} carries ${num(byCh[0][1])} of them.` : "."),
    );
  } else {
    explanation.push("No order in this range lost money outright.");
  }
  if (reuse.length) {
    explanation.push(`Separately, the first-order code WELCOME10 was applied to ${R(num(reuse.length))} orders from returning customers — ${inr(reuse.reduce((s, t) => s + t.discount, 0))} in discounts the code was never meant to give.`);
  }

  const ev = evidence();
  ev.add({ title: "Highest-scoring flagged orders", description: "Score = Σ rule weights + rupees lost.", orderIds: list.slice(0, 60).map((f) => f.tx.id), ref: top[0] ? { kind: "order", id: top[0].tx.id } : undefined });
  ev.add({ title: "Every loss-making order", description: FLAGS["loss-making"].description, orderIds: ids(loss) });
  ev.add({ title: "WELCOME10 reused", description: FLAGS["welcome-reuse"].description, orderIds: ids(reuse) });

  return {
    caseTitle: "THE USUAL SUSPECTS",
    steps: [
      { label: "Loaded the rulebook", detail: Object.values(FLAGS).map((f) => f.label).join(" · ") },
      { label: "Tested every order", detail: `${num(txs.length)} orders, ${label}.` },
      { label: "Scored the hits", detail: "Σ rule weights + rupees lost; ranked high → low." },
      { label: "Looked for patterns", detail: "Grouped loss-making orders by coupon, product and channel." },
    ],
    metrics: ["Contribution profit per order", "Discount %", "List margin per SKU", "Channel fee ÷ revenue", "Customer order number"],
    headline: loss.length
      ? `${num(loss.length)} orders lost money — ${inr(Math.abs(lossTotal))} in total.`
      : `${num(list.length)} orders tripped a rule, but none lost money outright.`,
    explanation,
    findings: (Object.keys(counts) as (keyof typeof counts)[]).map((k) => ({
      label: FLAGS[k].label,
      value: num(counts[k]),
      tone: k === "loss-making" || k === "welcome-reuse" ? ("red" as const) : ("ink" as const),
    })),
    table: {
      columns: ["Order", "Date", "Coupon", "Profit"],
      rows: top.map((f) => [f.tx.id, f.tx.date.slice(5), f.tx.coupon ?? "—", inr(f.tx.profit)]),
      tones: top.map((f) => [null, null, null, f.tx.profit < 0 ? "red" : null]),
    },
    evidence: ev.list,
    focus: { mode: "trap", ref: top[0] ? { kind: "order", id: top[0].tx.id } : undefined },
    nextQuestions: [
      byCode[0] && byCode[0][0] !== "FULL PRICE" ? `Tell me about ${byCode[0][0]}.` : "Which products are hurting my margins?",
      "Which products are hurting my margins?",
      "Give me three actions I should take.",
    ],
    caveats: ["“Suspicious” means the order breaks a profitability rule — not that anyone acted in bad faith."],
  };
}

/* ------------------------------------------------------------------ */
/* 4. Are discounts helping revenue but hurting profit?                */
/* ------------------------------------------------------------------ */

export function discountEffect({ range }: HandlerInput): AnalysisDraft {
  const { txs, label } = scope(range);
  const bands = byBand(txs);
  const all = totals(txs);
  const full = bands[0];
  const deep = bands[bands.length - 1];
  const discounted = totals(txs.filter((t) => t.discountPct > 0));
  const days = dailySplit(txs);
  const rep = repeatBySegment(range, 60);

  const explanation: string[] = [];
  explanation.push(
    `Helping revenue? ${discounted.net > 0 ? "Yes" : "Not in this range"}. Discounted orders brought in ${H(inrCompact(discounted.net))} — ${H(pct(discounted.net / (all.net || 1)))} of revenue (${label}).` +
      (days.promo.days && days.normal.days
        ? ` On days with a sitewide sale running you averaged ${H(days.promo.orders.toFixed(1))} orders a day versus ${days.normal.orders.toFixed(1)} on other days.`
        : ""),
  );
  if (days.promo.days && days.normal.days) {
    const promoWorse = days.promo.profit < days.normal.profit;
    explanation.push(
      `Hurting profit? ${promoWorse ? "Yes" : "Not per day"}. Those sale days earned ${promoWorse ? R(inr(Math.round(days.promo.profit))) : H(inr(Math.round(days.promo.profit)))} of contribution profit a day, against ${H(inr(Math.round(days.normal.profit)))} on non-sale days — ${promoWorse ? "more orders, less money" : "volume made up for the discount"}.`,
    );
  }
  if (full.orders && deep.orders) {
    explanation.push(
      `Per order, full-price sales keep ${H(pct(full.margin))} (${inr(Math.round(full.profit / full.orders))} each). Orders at 35%+ off keep ${R(pct(deep.margin))} (${inr(Math.round(deep.profit / deep.orders))} each), and ${R(num(deep.lossOrders))} of them lost money.`,
    );
  }
  if (rep.full.eligible >= 30 && rep.deep.eligible >= 30) {
    explanation.push(
      `The hangover: first-time buyers who paid full price came back within 60 days ${H(pct(rep.full.rate))} of the time. Those acquired at 25%+ off came back ${R(pct(rep.deep.rate))} of the time.`,
    );
  }

  const ev = evidence();
  ev.add({ title: "35%+ discount orders", description: "Every order in the deepest discount band.", orderIds: ids(txs.filter((t) => t.discountPct >= 35).sort(byLoss)), ref: { kind: "band", id: "deep" } });
  ev.add({ title: "Full-price orders (benchmark)", description: "Orders with no discount, for comparison.", orderIds: ids(txs.filter((t) => t.discountPct === 0).sort((a, b) => b.profit - a.profit)), ref: { kind: "band", id: "none" } });

  return {
    caseTitle: "THE DISCOUNT DILEMMA",
    steps: [
      { label: "Banded every order by discount", detail: bands.map((b) => `${b.band.label}: ${num(b.orders)}`).join(" · ") },
      { label: "Split sale days from normal days", detail: `${days.promo.days} sitewide-sale days vs ${days.normal.days} other days.` },
      { label: "Compared per-order economics", detail: "Margin and profit per order in each band." },
      { label: "Checked the hangover", detail: "60-day repeat rate by first-order discount (customers with 60+ days of history only)." },
    ],
    metrics: ["Revenue by discount band", "Margin by band", "Orders & profit per day", "60-day repeat rate"],
    headline:
      days.promo.days && days.normal.days && days.promo.profit < days.normal.profit
        ? "Discounts are buying revenue with profit."
        : "Discounts are lifting revenue; the profit cost is shown below.",
    explanation,
    findings: [
      { label: "Discounted share of revenue", value: pct(discounted.net / (all.net || 1)), tone: "blue" },
      { label: "Full-price margin", value: pct(full.margin), tone: "blue" },
      { label: "35%+ off margin", value: pct(deep.margin), tone: "red" },
      { label: "Repeat · 25%+ acquired", value: rep.deep.eligible >= 30 ? pct(rep.deep.rate) : "—", tone: "red", note: `vs ${pct(rep.full.rate)} full price` },
    ],
    table: {
      columns: ["Discount", "Orders", "Revenue", "Margin", "Profit / order"],
      rows: bands.map((b) => [b.band.label, num(b.orders), inrCompact(b.net), pct(b.margin), b.orders ? inr(Math.round(b.profit / b.orders)) : "—"]),
      tones: bands.map((b) => [null, null, null, b.margin < 0.15 ? "red" : b.margin > 0.35 ? "blue" : null, null]),
    },
    evidence: ev.list,
    focus: { mode: "trap", ref: { kind: "band", id: "deep" } },
    nextQuestions: ["Do discount customers come back?", "Show me the most suspicious transactions.", "Give me three actions I should take."],
    caveats: ["Sale-day comparison counts any day with a sitewide code (2+ channels) live; it shows association, not proof of cause."],
  };
}

/* ------------------------------------------------------------------ */
/* 5. Compare two months                                               */
/* ------------------------------------------------------------------ */

export function monthCompare({ range, entities }: HandlerInput): AnalysisDraft {
  let [a, b] = entities.months as (MonthKey | undefined)[];
  if (a && !b) {
    b = a;
    a = prevMonth(a) ?? undefined;
  }
  if (!a || !b) {
    b = range.to;
    a = prevMonth(range.to) ?? undefined;
  }
  if (!a || a === b) {
    return {
      caseTitle: "NOTHING TO COMPARE",
      steps: [{ label: "Looked for two months", detail: "Only one month available." }],
      metrics: [], headline: "I need two different months to compare.",
      explanation: [`${monthLong(b!)} is the first month in the books, so there is no earlier month to compare it with.`],
      findings: [], evidence: [], nextQuestions: ["Compare July and September."], caveats: [],
    };
  }
  if (a > b) [a, b] = [b, a];
  const all = getDataset().transactions;
  const ta = all.filter((t) => t.month === a);
  const tb = all.filter((t) => t.month === b);
  const [A, B] = byMonth(all, [a, b]);
  const thinIds = thinProducts().map((p) => p.id);
  const hA = heroShare(ta, thinIds);
  const hB = heroShare(tb, thinIds);
  const bridge = profitBridge(A, B).filter((l) => l.key !== "profit").sort((x, y) => Math.abs(y.b - y.a) - Math.abs(x.b - x.a));
  const mover = bridge[0];
  const campaigns = (m: MonthKey) =>
    HEADLINE_CAMPAIGNS().filter((c) => c.from.slice(0, 7) <= m && c.to.slice(0, 7) >= m).map((c) => c.code);

  const la = monthShort(a);
  const lb = monthShort(b);
  const explanation = [
    `${monthLong(b)} vs ${monthLong(a)}: revenue ${H(inrCompact(A.net))} → ${H(inrCompact(B.net))} (${tone(A.net, B.net)}), contribution profit ${H(inrCompact(A.profit))} → ${B.profit < A.profit ? R(inrCompact(B.profit)) : H(inrCompact(B.profit))} (${tone(A.profit, B.profit)}).`,
    `The biggest shift in the cost stack was ${mover.label.toLowerCase()}: ₹${(mover.a * 100).toFixed(1)} → ${mover.b > mover.a ? R(`₹${(mover.b * 100).toFixed(1)}`) : H(`₹${(mover.b * 100).toFixed(1)}`)} per ₹100 of list value. Discounted orders were ${pct(A.discountedShare, 0)} of orders in ${la} and ${B.discountedShare > A.discountedShare ? R(pct(B.discountedShare, 0)) : H(pct(B.discountedShare, 0))} in ${lb}.`,
    `Sitewide codes live — ${la}: ${campaigns(a).join(", ") || "none"}; ${lb}: ${campaigns(b).join(", ") || "none"}. Thin-margin SKUs were ${pct(hA)} of list sales in ${la} and ${pct(hB)} in ${lb}.`,
  ];
  const row = (label: string, x: string, y: string, delta: string, t: "red" | "blue" | null): [string[], ("red" | "blue" | null)[]] => [[label, x, y, delta], [null, null, null, t]];
  const rows = [
    row("Revenue", inrCompact(A.net), inrCompact(B.net), change(A.net, B.net), B.net >= A.net ? "blue" : "red"),
    row("Contribution profit", inrCompact(A.profit), inrCompact(B.profit), change(A.profit, B.profit), B.profit >= A.profit ? "blue" : "red"),
    row("Margin", pct(A.margin), pct(B.margin), pts(A.margin, B.margin), B.margin >= A.margin ? "blue" : "red"),
    row("Orders", num(A.orders), num(B.orders), change(A.orders, B.orders), null),
    row("Avg order value", inr(Math.round(A.aov)), inr(Math.round(B.aov)), change(A.aov, B.aov), null),
    row("Discounted orders", pct(A.discountedShare, 0), pct(B.discountedShare, 0), pts(A.discountedShare, B.discountedShare), B.discountedShare > A.discountedShare ? "red" : "blue"),
    row("Discount ÷ list value", pct(A.discountRate), pct(B.discountRate), pts(A.discountRate, B.discountRate), B.discountRate > A.discountRate ? "red" : "blue"),
    row("New customers", num(A.newCustomers), num(B.newCustomers), change(A.newCustomers, B.newCustomers), null),
    row("Loss-making orders", num(A.lossOrders), num(B.lossOrders), change(A.lossOrders, B.lossOrders), B.lossOrders > A.lossOrders ? "red" : null),
  ];
  const ev = evidence();
  ev.add({ title: `Loss-making orders, ${monthYear(b)}`, description: "Below-zero contribution profit.", orderIds: ids(tb.filter((t) => t.profit < 0).sort(byLoss)), ref: { kind: "month", id: b } });
  ev.add({ title: `Loss-making orders, ${monthYear(a)}`, description: "Below-zero contribution profit.", orderIds: ids(ta.filter((t) => t.profit < 0).sort(byLoss)), ref: { kind: "month", id: a } });

  return {
    caseTitle: `${la.toUpperCase()} VS ${lb.toUpperCase()}`,
    steps: [
      { label: "Resolved the months", detail: `${monthLong(a)} and ${monthLong(b)}${entities.months.length ? "" : " (latest two in range)"}.` },
      { label: "Computed both months", detail: `${num(A.orders)} and ${num(B.orders)} orders.` },
      { label: "Ran the profit bridge", detail: `Largest mover: ${mover.label} (${pts(mover.a, mover.b)}).` },
      { label: "Checked campaigns & mix", detail: "Sitewide codes live and thin-SKU share." },
    ],
    metrics: ["Revenue", "Contribution profit", "Margin", "AOV", "Discount rate", "New customers", "Loss-making orders"],
    headline: `${lb}: revenue ${change(A.net, B.net)}, profit ${change(A.profit, B.profit)} vs ${la}.`,
    explanation,
    findings: [
      { label: "Revenue", value: change(A.net, B.net), tone: B.net >= A.net ? "blue" : "red" },
      { label: "Profit", value: change(A.profit, B.profit), tone: B.profit >= A.profit ? "blue" : "red" },
      { label: "Margin", value: pts(A.margin, B.margin), tone: B.margin >= A.margin ? "blue" : "red" },
    ],
    table: { columns: ["Metric", la, lb, "Change"], rows: rows.map((r) => r[0]), tones: rows.map((r) => r[1]) },
    evidence: ev.list,
    focus: { mode: "trap", compare: [a, b] },
    nextQuestions: [`What happened in ${monthLong(b)}?`, "Why is my profit declining?", "Give me three actions I should take."],
    caveats: [],
  };
}

/* ------------------------------------------------------------------ */
/* 6. Three actions                                                    */
/* ------------------------------------------------------------------ */

export function actions({ range }: HandlerInput): AnalysisDraft {
  const { txs, label } = scope(range);
  const all = totals(txs);
  const coupons = byCoupon(txs).filter((c) => c.orders >= 20);
  const weak = coupons.filter((c) => c.margin < Math.min(0.2, all.margin * 0.7)).sort((a, b) => a.margin - b.margin);
  const thin = thinProducts();
  const facts = lineFacts(txs);
  const thinDisc = facts.filter((f) => thin.some((p) => p.id === f.productId) && f.tx.discountPct >= 25);
  const thinFull = facts.filter((f) => thin.some((p) => p.id === f.productId) && f.tx.discountPct === 0);
  const sum = (list: typeof facts, k: "net" | "profit") => list.reduce((s, f) => s + f[k], 0);
  const rep = repeatBySegment(range, 60);
  const channels = byChannel(txs).filter((c) => c.orders > 30).sort((a, b) => a.margin - b.margin);
  const worstCh = channels[0];

  const items: ActionItem[] = [];
  const ev = evidence();
  if (weak.length) {
    const weakTx = txs.filter((t) => t.coupon && weak.some((w) => w.code === t.coupon));
    const losses = weakTx.filter((t) => t.profit < 0);
    items.push({
      title: `Retire or cap ${weak.slice(0, 2).map((w) => w.code).join(" and ")}`,
      rationale: `${weak.slice(0, 3).map((w) => `${w.code} ran at a ${pct(w.margin)} margin over ${num(w.orders)} orders`).join("; ")}. ${num(losses.length)} of these orders lost money — ${inr(losses.reduce((s, t) => s + t.profit, 0))} combined. Replace sitewide codes with a cap (e.g. 15%) or a minimum basket.`,
      watch: "Margin of coupon orders; share of orders at 25%+ off.",
    });
    ev.add({ title: `Orders on ${weak.slice(0, 3).map((w) => w.code).join(", ")}`, description: "Low-margin coupon orders.", orderIds: ids(weakTx.sort(byLoss)) });
  }
  if (thinDisc.length) {
    const net = sum(thinDisc, "net");
    const profit = sum(thinDisc, "profit");
    items.push({
      title: `Exclude ${thin.map((p) => p.name.split(",")[0]).join(" and ")} from sitewide sales`,
      rationale: `Sold at 25%+ off, these SKUs brought ${inrCompact(net)} of revenue but only ${inrCompact(profit)} of contribution profit (${pct(net ? profit / net : 0)}). At full price the same SKUs kept ${pct(sum(thinFull, "net") ? sum(thinFull, "profit") / sum(thinFull, "net") : 0)}. Set a discount floor or bundle them with high-margin items instead.`,
      watch: "Margin on Dinner Set and Bedsheet lines.",
    });
    ev.add({ title: "Thin-margin SKUs at 25%+ off", description: "Line items behind action 2.", orderIds: ids([...new Set(thinDisc.map((f) => f.tx))].sort(byLoss)) });
  }
  if (rep.full.eligible >= 30 && rep.deep.eligible >= 30 && rep.full.rate > rep.deep.rate * 1.5) {
    items.push({
      title: "Stop acquiring customers with deep codes",
      rationale: `First-time buyers at 25%+ off came back within 60 days ${pct(rep.deep.rate)} of the time (${rep.deep.repeated}/${rep.deep.eligible}); full-price first-timers came back ${pct(rep.full.rate)} (${rep.full.repeated}/${rep.full.eligible}). Move acquisition budget to a 10% welcome offer plus a second-order incentive.`,
      watch: "60-day repeat rate of each new cohort.",
    });
  } else if (worstCh && worstCh.margin < all.margin * 0.7) {
    items.push({
      title: `Re-price ${worstCh.channel.name}`,
      rationale: `${worstCh.channel.name} runs at a ${pct(worstCh.margin)} margin against ${pct(all.margin)} overall: fees take ${pct(worstCh.fees / (worstCh.net || 1))} of its revenue. Raise channel prices or trim its catalogue to high-margin SKUs.`,
      watch: `${worstCh.channel.name} margin.`,
    });
  }

  return {
    caseTitle: "THE ACTION PLAN",
    steps: [
      { label: "Ranked coupon codes by margin", detail: coupons.map((c) => `${c.code} ${pct(c.margin, 0)}`).join(" · ") },
      { label: "Isolated thin-margin SKUs on sale", detail: `${num(thinDisc.length)} line items at 25%+ off.` },
      { label: "Checked repeat behaviour", detail: `Full price ${pct(rep.full.rate)} vs 25%+ off ${pct(rep.deep.rate)} (60 days).` },
      { label: "Checked channel margins", detail: channels.map((c) => `${c.channel.short} ${pct(c.margin, 0)}`).join(" · ") },
    ],
    metrics: ["Margin by coupon", "Line-level SKU profit", "60-day repeat rate", "Channel margin"],
    headline: `${items.length} moves, each backed by the ${label} books.`,
    explanation: [
      `These are the three largest, most fixable leaks I can see in the evidence. Each action quotes the numbers that justify it; none of them is a forecast.`,
    ],
    findings: [],
    actions: items.slice(0, 3),
    evidence: ev.list,
    focus: { mode: "trap" },
    nextQuestions: ["Show me the most suspicious transactions.", "Which channels are least profitable?", "Do discount customers come back?"],
    caveats: ["Recommendations look at contribution margin only. Test changes on a slice of traffic before rolling out."],
  };
}

/* ------------------------------------------------------------------ */
/* 7. Explain the revenue increase                                     */
/* ------------------------------------------------------------------ */

export function revenueIncrease({ range }: HandlerInput): AnalysisDraft {
  const short = needsTwoMonths(range);
  if (short) return short;
  const w = windows(range);
  const { o, c } = w;
  const volume = (c.orders - o.orders) * o.aov;
  const basket = c.orders * (c.aov - o.aov);
  const actO = activityByMonth(w.oTx, w.opening);
  const actC = activityByMonth(w.cTx, w.closing);
  const newRevO = actO.reduce((s, a) => s + a.newRevenue, 0);
  const newRevC = actC.reduce((s, a) => s + a.newRevenue, 0);
  const retRevO = actO.reduce((s, a) => s + a.returningRevenue, 0);
  const retRevC = actC.reduce((s, a) => s + a.returningRevenue, 0);
  const thinIds = thinProducts().map((p) => p.id);
  const promoRev = w.cTx.filter((t) => t.coupon && HEADLINE_CAMPAIGNS().some((h) => h.code === t.coupon)).reduce((s, t) => s + t.net, 0);
  const grew = c.net > o.net;

  const explanation = [
    `Net revenue went from ${H(inrCompact(o.net))} in ${w.oLabel} to ${H(inrCompact(c.net))} in ${w.cLabel} (${tone(o.net, c.net)}).`,
    `Split it into volume and basket: you sold ${H(change(o.orders, c.orders))} more orders (${num(o.orders)} → ${num(c.orders)}), worth ${H(inrCompact(volume))} at the old average order value. Average order value moved ${change(o.aov, c.aov)} (${inr(Math.round(o.aov))} → ${inr(Math.round(c.aov))}), worth ${basket >= 0 ? H(inrCompact(basket)) : R(inrCompact(basket))}.` +
      (Math.abs(volume) > Math.abs(basket) ? " The growth is volume, not bigger baskets." : ""),
    `New customers' first orders went from ${inrCompact(newRevO)} to ${H(inrCompact(newRevC))}; returning customers from ${inrCompact(retRevO)} to ${inrCompact(retRevC)}. In ${w.cLabel}, ${H(pct(promoRev / (c.net || 1)))} of revenue came through sitewide sale codes.`,
    `Mix shifted too: thin-margin SKUs went from ${pct(heroShare(w.oTx, thinIds))} to ${R(pct(heroShare(w.cTx, thinIds)))} of list-price sales — high ticket, low margin. That props up average order value while margin falls.`,
  ];
  const ev = evidence();
  ev.add({ title: `Sitewide-code orders, ${w.cLabel}`, description: "Orders that used a sitewide sale code.", orderIds: ids(w.cTx.filter((t) => t.coupon && HEADLINE_CAMPAIGNS().some((h) => h.code === t.coupon)).sort((a, b) => b.net - a.net)) });
  ev.add({ title: `First orders from new customers, ${w.cLabel}`, description: "Orders that were a customer's first purchase.", orderIds: ids(w.cTx.filter((t) => t.customerOrderNo === 1).sort((a, b) => b.net - a.net)) });

  return {
    caseTitle: "THE GROWTH STORY",
    steps: [
      { label: "Split the timeline", detail: `${w.oLabel} vs ${w.cLabel}.` },
      { label: "Decomposed revenue", detail: "Δ revenue = Δ orders × old AOV + new orders × Δ AOV." },
      { label: "Separated new vs returning", detail: "By each customer's order number." },
      { label: "Measured promo & mix", detail: "Revenue on sitewide codes; thin-SKU share." },
    ],
    metrics: ["Orders", "Average order value", "New-customer revenue", "Returning revenue", "Sale-code revenue", "Thin-SKU share"],
    headline: grew
      ? `Revenue grew ${change(o.net, c.net).replace("+", "")} — mostly ${Math.abs(volume) > Math.abs(basket) ? "more orders" : "bigger baskets"}, bought with discounts.`
      : `Revenue did not grow in this range (${change(o.net, c.net)}).`,
    explanation,
    findings: [
      { label: "Orders", value: change(o.orders, c.orders), tone: "blue" },
      { label: "Avg order value", value: change(o.aov, c.aov), tone: c.aov >= o.aov ? "blue" : "red" },
      { label: "Revenue via sale codes", value: pct(promoRev / (c.net || 1)), tone: "red", note: w.cLabel },
    ],
    evidence: ev.list,
    focus: { mode: "trap", compare: [w.opening[0], w.closing[w.closing.length - 1]] },
    nextQuestions: ["Why is my profit declining?", "Are discounts helping revenue but hurting profitability?", "Do discount customers come back?"],
    caveats: [],
  };
}

/* ------------------------------------------------------------------ */
/* 8. Channels                                                         */
/* ------------------------------------------------------------------ */

export function channels({ range }: HandlerInput): AnalysisDraft {
  const { txs, label } = scope(range);
  const list = byChannel(txs).filter((c) => c.orders > 0);
  const all = totals(txs);
  const sorted = [...list].sort((a, b) => a.margin - b.margin);
  const worst = sorted[0];
  const best = sorted[sorted.length - 1];
  const explanation = [
    `Across ${label}, ${list.map((c) => `${c.channel.name} brought ${H(pct(c.revenueShare, 0))} of revenue and ${c.profitShare < c.revenueShare - 0.02 ? R(pct(c.profitShare, 0)) : H(pct(c.profitShare, 0))} of profit`).join("; ")}.`,
    `${worst.channel.name} is the weakest at a ${R(pct(worst.margin))} margin: fees take ${pct(worst.fees / (worst.net || 1))} of its revenue and ${pct(worst.discountedShare, 0)} of its orders were discounted. ${best.channel.name} is the strongest at ${H(pct(best.margin))}.`,
  ];
  const ev = evidence();
  ev.add({ title: `${worst.channel.name} loss-making orders`, description: "Below-zero contribution profit.", orderIds: ids(txs.filter((t) => t.channel === worst.channel.id && t.profit < 0).sort(byLoss)), ref: { kind: "channel", id: worst.channel.id } });
  return {
    caseTitle: "FOLLOW THE CHANNEL",
    steps: [
      { label: "Grouped orders by channel", detail: list.map((c) => `${c.channel.short} ${num(c.orders)}`).join(" · ") },
      { label: "Built a rupee waterfall per channel", detail: "List value → discount → COGS → shipping → fees → profit." },
      { label: "Compared revenue share with profit share", detail: "A channel earning less profit share than revenue share is diluting margin." },
    ],
    metrics: ["Revenue share", "Profit share", "Margin", "Fee rate", "Discounted share"],
    headline: `${worst.channel.name} earns the least per rupee: ${pct(worst.margin)} margin vs ${pct(all.margin)} overall.`,
    explanation,
    findings: list.map((c) => ({ label: c.channel.name, value: pct(c.margin), tone: c.margin < all.margin * 0.75 ? ("red" as const) : ("blue" as const), note: `${pct(c.revenueShare, 0)} of revenue` })),
    table: {
      columns: ["Channel", "Revenue", "Rev. share", "Profit share", "Margin"],
      rows: list.map((c) => [c.channel.name, inrCompact(c.net), pct(c.revenueShare, 0), pct(c.profitShare, 0), pct(c.margin)]),
      tones: list.map((c) => [null, null, null, c.profitShare < c.revenueShare - 0.02 ? "red" : null, c.margin < all.margin * 0.75 ? "red" : null]),
    },
    evidence: ev.list,
    focus: { mode: "channels", ref: { kind: "channel", id: worst.channel.id } },
    nextQuestions: [`What about ${worst.channel.name}?`, "Which products are hurting my margins?", "Give me three actions I should take."],
    caveats: ["Fees include payment gateway (website, Instagram) and commission (marketplace, quick commerce)."],
  };
}

export function channelDetail({ range, entities }: HandlerInput): AnalysisDraft {
  const id = entities.channels[0] ?? byChannel(scope(range).txs).filter((c) => c.orders > 0).sort((a, b) => a.margin - b.margin)[0].channel.id;
  const ch = channelById(id);
  const { txs, label, months } = scope(range);
  const mine = txs.filter((t) => t.channel === id);
  const t = totals(mine);
  const all = totals(txs);
  if (!mine.length) {
    return {
      caseTitle: `CHANNEL FILE: ${ch.short}`,
      steps: [{ label: "Filtered orders", detail: `0 ${ch.name} orders in ${label}.` }],
      metrics: [], headline: `No ${ch.name} orders in ${label}.`,
      explanation: [`${ch.name} went live on ${ch.launched}. Widen the date range to include it.`],
      findings: [], evidence: [], nextQuestions: ["Which channels are least profitable?"], caveats: [],
    };
  }
  const monthly = byMonth(mine, months).filter((m) => m.orders > 0);
  const prods = byProduct(mine).filter((p) => p.units > 0).sort((a, b) => b.net - a.net).slice(0, 3);
  const explanation = [
    `${ch.name}, ${label}: ${H(num(t.orders))} orders, ${H(inrCompact(t.net))} revenue (${pct(t.net / (all.net || 1))} of total) at a ${t.margin < all.margin ? R(pct(t.margin)) : H(pct(t.margin))} margin against ${pct(all.margin)} overall.`,
    `Of every ₹100 of list value here: discounts ₹${((t.discount / t.gross) * 100).toFixed(1)}, product cost ₹${((t.cogs / t.gross) * 100).toFixed(1)}, fees ${t.fees / t.gross > 0.1 ? R(`₹${((t.fees / t.gross) * 100).toFixed(1)}`) : `₹${((t.fees / t.gross) * 100).toFixed(1)}`}, shipping & packaging ₹${(((t.shipping + t.packaging) / t.gross) * 100).toFixed(1)} — leaving ₹${((t.profit / t.gross) * 100).toFixed(1)}.`,
    monthly.length >= 2
      ? `Monthly margin went from ${pct(monthly[0].margin)} in ${monthly[0].label} to ${monthly[monthly.length - 1].margin < monthly[0].margin ? R(pct(monthly[monthly.length - 1].margin)) : H(pct(monthly[monthly.length - 1].margin))} in ${monthly[monthly.length - 1].label}. Top sellers: ${prods.map((p) => `${p.product.name} (${pct(p.margin, 0)})`).join(", ")}.`
      : `Top sellers: ${prods.map((p) => `${p.product.name} (${pct(p.margin, 0)})`).join(", ")}.`,
  ];
  const ev = evidence();
  ev.add({ title: `${ch.name} — loss-making`, description: "Below-zero contribution profit.", orderIds: ids(mine.filter((x) => x.profit < 0).sort(byLoss)), ref: { kind: "channel", id } });
  ev.add({ title: `${ch.name} — all orders`, description: `Every ${ch.name} order in range.`, orderIds: ids(mine, 2000), ref: { kind: "channel", id } });
  return {
    caseTitle: `CHANNEL FILE: ${ch.short}`,
    steps: [
      { label: "Filtered orders", detail: `${num(mine.length)} ${ch.name} orders.` },
      { label: "Built the rupee waterfall", detail: "List value → discount → COGS → fees → shipping → profit." },
      { label: "Tracked margin by month", detail: `${monthly.length} months with orders.` },
    ],
    metrics: ["Channel revenue", "Margin", "Fee share", "Monthly margin"],
    headline: `${ch.name}: ${pct(t.margin)} margin on ${inrCompact(t.net)} of revenue.`,
    explanation,
    findings: [
      { label: "Margin", value: pct(t.margin), tone: t.margin < all.margin ? "red" : "blue" },
      { label: "Fees ÷ revenue", value: pct(t.fees / (t.net || 1)), tone: t.fees / (t.net || 1) > 0.1 ? "red" : "ink" },
      { label: "Loss-making orders", value: num(t.lossOrders), tone: t.lossOrders ? "red" : "ink" },
    ],
    evidence: ev.list,
    focus: { mode: "channels", ref: { kind: "channel", id } },
    nextQuestions: ["Which channels are least profitable?", "Which products are hurting my margins?", "Give me three actions I should take."],
    caveats: [],
  };
}

/* ------------------------------------------------------------------ */
/* 9. Customers                                                        */
/* ------------------------------------------------------------------ */

export function customers({ range }: HandlerInput): AnalysisDraft {
  const { txs, months, label } = scope(range);
  const rep = repeatBySegment(range, 60);
  const rows = cohorts(range);
  const act = activityByMonth(txs, months);
  const segs = (Object.keys(rep) as (keyof typeof rep)[]).filter((k) => rep[k].eligible >= 30);
  const first = rows[0];
  const last = rows[rows.length - 1];
  const explanation: string[] = [];
  if (segs.length >= 2) {
    explanation.push(
      `Within 60 days of their first order, ${segs.map((s) => `${SEGMENT_LABEL[s].toLowerCase()} buyers came back ${s === "deep" ? R(pct(rep[s].rate)) : H(pct(rep[s].rate))} of the time (${rep[s].repeated}/${rep[s].eligible})`).join("; ")}.`,
    );
  } else {
    explanation.push("Not enough customers have 60 days of history in this range to compare repeat rates — widen the date range.");
  }
  if (rows.length >= 2) {
    explanation.push(
      `The mix of who you acquire changed: ${R(pct(last.deepShare))} of the ${monthShort(last.month)} cohort arrived on a 25%+ code, versus ${H(pct(first.deepShare))} of the ${monthShort(first.month)} cohort.`,
    );
  }
  if (act.length >= 2) {
    const a = act[0];
    const b = act[act.length - 1];
    explanation.push(
      `Returning customers placed ${num(a.returningOrders)} orders in ${monthShort(a.month)} and ${num(b.returningOrders)} in ${monthShort(b.month)}; ${H(pct(b.returningDiscounted / (b.returningOrders || 1), 0))} of returning orders in ${monthShort(b.month)} used a code (vs ${pct(a.returningDiscounted / (a.returningOrders || 1), 0)} in ${monthShort(a.month)}). Loyal customers are learning to wait for the sale.`,
    );
  }
  const ev = evidence();
  const deepFirst = txs.filter((t) => t.customerOrderNo === 1 && t.discountPct >= 25).sort(byLoss);
  ev.add({ title: "First orders at 25%+ off", description: "Customers acquired on deep codes.", orderIds: ids(deepFirst) });
  const retDisc = txs.filter((t) => t.customerOrderNo > 1 && t.discountPct > 0);
  ev.add({ title: "Returning customers using codes", description: "Repeat orders that carried a discount.", orderIds: ids(retDisc) });
  return {
    caseTitle: "THE ONES WHO DIDN'T COME BACK",
    steps: [
      { label: "Found first orders", detail: `${num(rows.reduce((s, r) => s + r.size, 0))} new customers in ${label}.` },
      { label: "Applied a 60-day look-ahead", detail: "Only customers with 60+ days of history count (fair to newer cohorts)." },
      { label: "Segmented by first-order discount", detail: Object.values(SEGMENT_LABEL).join(" · ") },
      { label: "Tracked cohorts month by month", detail: "Share of each cohort ordering again in months +1 … +4." },
    ],
    metrics: ["60-day repeat rate", "Cohort size", "Deep-code share of cohort", "Returning orders"],
    headline:
      segs.includes("full") && segs.includes("deep") && rep.full.rate > rep.deep.rate
        ? `Deep-discount customers come back ${(rep.full.rate / (rep.deep.rate || 1)).toFixed(1)}× less often.`
        : "Repeat behaviour by acquisition discount.",
    explanation,
    findings: segs.map((s) => ({ label: SEGMENT_LABEL[s], value: pct(rep[s].rate), tone: s === "deep" ? ("red" as const) : ("blue" as const), note: `${rep[s].eligible} eligible` })),
    table: {
      columns: ["Cohort", "New", "25%+ share", "60-day repeat"],
      rows: rows.map((r) => [monthShort(r.month), num(r.size), pct(r.deepShare, 0), r.repeat60.eligible >= 40 ? pct(r.repeat60.rate) : "too early"]),
      tones: rows.map((r) => [null, null, r.deepShare > 0.4 ? "red" : null, null]),
    },
    evidence: ev.list,
    focus: { mode: "customers" },
    nextQuestions: ["Are discounts helping revenue but hurting profitability?", "Give me three actions I should take.", "Which channels are least profitable?"],
    caveats: ["Customers acquired before Feb 2026 are excluded from cohort maths — their first order isn't in the books."],
  };
}

/* ------------------------------------------------------------------ */
/* 10. Product / coupon / month / band detail                          */
/* ------------------------------------------------------------------ */

export function productDetail({ range, entities }: HandlerInput): AnalysisDraft {
  const { txs, months, label } = scope(range);
  const fallback = byProduct(txs).sort((a, b) => b.revenueShare * (1 - b.margin) - a.revenueShare * (1 - a.margin))[0].product.id;
  const pid = entities.productIds[0] ?? fallback;
  const p = productById(pid);
  const facts = lineFacts(txs).filter((f) => f.productId === pid);
  const monthly = months.map((m) => {
    const list = facts.filter((f) => f.tx.month === m);
    const net = list.reduce((s, f) => s + f.net, 0);
    const gross = list.reduce((s, f) => s + f.gross, 0);
    const profit = list.reduce((s, f) => s + f.profit, 0);
    return { m, units: list.reduce((s, f) => s + f.qty, 0), net, profit, margin: net ? profit / net : 0, disc: gross ? 1 - net / gross : 0 };
  });
  const tot = byProduct(txs).find((x) => x.product.id === pid)!;
  const withP = txs.filter((t) => t.lines.some((l) => l.productId === pid));
  const loss = withP.filter((t) => t.profit < 0).sort(byLoss);
  const a = monthly.find((x) => x.units > 0);
  const b = [...monthly].reverse().find((x) => x.units > 0);
  const breakEven = breakEvenDiscount(p, channelById("website"));
  const explanation = [
    `${p.name} (${p.sku}): list ${inr(p.price)}, landed cost ${inr(p.unitCost)} — a ${pct((p.price - p.unitCost) / p.price)} list margin before shipping and fees.`,
    `In ${label} it sold ${H(num(tot.units))} units for ${H(inrCompact(tot.net))} (${pct(tot.revenueShare)} of revenue) at a ${tot.margin < 0.2 ? R(pct(tot.margin)) : H(pct(tot.margin))} contribution margin, with an average discount of ${pct(tot.avgDiscount)}.`,
    a && b && a.m !== b.m
      ? `Monthly: ${a.units} units at ${pct(a.margin)} margin in ${monthShort(a.m)} → ${b.units > a.units ? H(String(b.units)) : String(b.units)} units at ${b.margin < a.margin ? R(pct(b.margin)) : H(pct(b.margin))} in ${monthShort(b.m)}.`
      : "",
    `Break-even check: a single-unit website order of this product stops making money at about ${R(pct(breakEven, 0))} off (cost + shipping + packaging + gateway fee).` +
      (loss.length ? ` ${num(loss.length)} orders containing it lost money.` : ""),
  ].filter(Boolean);
  const ev = evidence();
  ev.add({ title: `${p.name} — loss-making orders`, description: "Orders containing this SKU that lost money.", orderIds: ids(loss), ref: { kind: "product", id: pid } });
  ev.add({ title: `${p.name} — all orders`, description: "Every order containing this SKU.", orderIds: ids(withP, 2000), ref: { kind: "product", id: pid } });
  return {
    caseTitle: `PRODUCT FILE: ${p.sku}`,
    steps: [
      { label: "Found the SKU", detail: `${p.name} — matched from your question${entities.productIds.length ? "" : " (biggest margin drag, as none was named)"}.` },
      { label: "Allocated order costs", detail: `${num(facts.length)} line items.` },
      { label: "Tracked it month by month", detail: `${months.length} months.` },
      { label: "Computed break-even discount", detail: "Single unit, website, list price." },
    ],
    metrics: ["Units", "Line revenue", "Allocated profit", "Average discount", "Break-even discount"],
    headline: `${p.name}: ${pct(tot.margin)} margin on ${inrCompact(tot.net)}.`,
    explanation,
    findings: [
      { label: "Contribution margin", value: pct(tot.margin), tone: tot.margin < 0.2 ? "red" : "blue" },
      { label: "Avg discount", value: pct(tot.avgDiscount), tone: tot.avgDiscount > 0.2 ? "red" : "ink" },
      { label: "Break-even discount", value: pct(breakEven, 0), tone: "red", note: "single unit, website" },
    ],
    table: {
      columns: ["Month", "Units", "Revenue", "Avg disc.", "Margin"],
      rows: monthly.map((x) => [monthShort(x.m), num(x.units), inrCompact(x.net), pct(x.disc, 0), pct(x.margin)]),
      tones: monthly.map((x) => [null, null, null, x.disc > 0.25 ? "red" : null, x.margin < 0.15 ? "red" : null]),
    },
    evidence: ev.list,
    focus: { mode: "products", ref: { kind: "product", id: pid } },
    nextQuestions: ["Which products are hurting my margins?", "Show me the most suspicious transactions.", "Give me three actions I should take."],
    caveats: ["Product profit uses allocated order costs (see Product Profitability for the method)."],
  };
}

export function couponDetail({ range, entities }: HandlerInput): AnalysisDraft {
  const { txs, label } = scope(range);
  const loss = txs.filter((t) => t.profit < 0);
  const counts = new Map<string, number>();
  for (const t of loss) if (t.coupon) counts.set(t.coupon, (counts.get(t.coupon) ?? 0) + 1);
  const code = entities.coupons[0] ?? [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "WELCOME10";
  const camp = getDataset().campaigns.find((c) => c.code === code)!;
  const mine = txs.filter((t) => t.coupon === code);
  const t = totals(mine);
  const all = totals(txs);
  if (!mine.length) {
    return {
      caseTitle: `COUPON FILE: ${code}`,
      steps: [{ label: "Filtered orders", detail: `0 orders used ${code} in ${label}.` }],
      metrics: [], headline: `${code} wasn't used in ${label}.`,
      explanation: [`${code} (${camp.pct}% off, ${camp.description}) ran ${camp.from} → ${camp.to}. Widen the date range to include it.`],
      findings: [], evidence: [], nextQuestions: ["Are discounts helping revenue but hurting profitability?"], caveats: [],
    };
  }
  const prods = byProduct(mine).filter((p) => p.units > 0).sort((a, b) => b.net - a.net);
  const newShare = mine.filter((x) => x.customerOrderNo === 1).length / mine.length;
  const lossMine = mine.filter((x) => x.profit < 0).sort(byLoss);
  const explanation = [
    `${code} — ${camp.pct}% off, ${camp.description}, live ${camp.from} → ${camp.to} on ${camp.channels.map((c) => channelById(c).name).join(", ")}.`,
    `In ${label}: ${H(num(t.orders))} orders, ${H(inrCompact(t.net))} revenue, ${t.margin < all.margin ? R(pct(t.margin)) : H(pct(t.margin))} margin (overall ${pct(all.margin)}). It gave away ${R(inrCompact(t.discount))} in discounts${lossMine.length ? ` and ${R(num(lossMine.length))} orders lost money (${inr(lossMine.reduce((s, x) => s + x.profit, 0))})` : ""}.`,
    `${pct(newShare, 0)} of its orders were a customer's first purchase. Top products on this code: ${prods.slice(0, 3).map((p) => `${p.product.name} (${pct(p.margin, 0)} margin)`).join(", ")}.`,
  ];
  const ev = evidence();
  ev.add({ title: `${code} orders`, description: `Every order that used ${code}.`, orderIds: ids(mine.sort(byLoss), 2000) });
  return {
    caseTitle: `COUPON FILE: ${code}`,
    steps: [
      { label: "Matched the code", detail: `${code}${entities.coupons.length ? "" : " — the code behind the most loss-making orders"}.` },
      { label: "Pulled its orders", detail: `${num(mine.length)} orders.` },
      { label: "Computed economics", detail: "Revenue, discount given, margin, loss-making orders." },
    ],
    metrics: ["Coupon revenue", "Discount given", "Margin", "First-order share"],
    headline: `${code}: ${inrCompact(t.net)} of revenue at a ${pct(t.margin)} margin.`,
    explanation,
    findings: [
      { label: "Orders", value: num(t.orders), tone: "ink" },
      { label: "Margin", value: pct(t.margin), tone: t.margin < all.margin ? "red" : "blue" },
      { label: "Discount given", value: inrCompact(t.discount), tone: "red" },
    ],
    evidence: ev.list,
    focus: { mode: "trap", ref: { kind: "band", id: bandOf(camp.pct) } },
    nextQuestions: ["Are discounts helping revenue but hurting profitability?", "Do discount customers come back?", "Give me three actions I should take."],
    caveats: [],
  };
}

export function monthProfile({ entities, range }: HandlerInput): AnalysisDraft {
  const m = entities.months[0] ?? range.to;
  const all = getDataset().transactions;
  const p = prevMonth(m);
  const [cur, prev] = byMonth(all, p ? [m, p] : [m, m]);
  const live = getDataset().campaigns.filter((c) => !c.newOnly && c.from.slice(0, 7) <= m && c.to.slice(0, 7) >= m);
  const mine = all.filter((t) => t.month === m);
  const prods = byProduct(mine).sort((a, b) => b.net - a.net).slice(0, 3);
  const explanation = [
    `${monthLong(m)}: ${H(num(cur.orders))} orders, ${H(inrCompact(cur.net))} revenue, ${cur.margin < 0.3 ? R(inrCompact(cur.profit)) : H(inrCompact(cur.profit))} contribution profit (${pct(cur.margin)} margin).` +
      (p ? ` Versus ${monthShort(p)}: revenue ${change(prev.net, cur.net)}, profit ${change(prev.profit, cur.profit)}.` : ""),
    `Codes live: ${live.map((c) => `${c.code} (${c.pct}%, ${c.from.slice(5)} → ${c.to.slice(5)})`).join("; ") || "none besides WELCOME10"}. ${pct(cur.discountedShare, 0)} of orders were discounted; ${num(cur.lossOrders)} lost money.`,
    `Best sellers: ${prods.map((x) => `${x.product.name} (${inrCompact(x.net)}, ${pct(x.margin, 0)} margin)`).join(", ")}.`,
  ];
  const ev = evidence();
  ev.add({ title: `${monthYear(m)} — loss-making`, description: "Below-zero contribution profit.", orderIds: ids(mine.filter((t) => t.profit < 0).sort(byLoss)), ref: { kind: "month", id: m } });
  ev.add({ title: `${monthYear(m)} — all orders`, description: "Every order in the month.", orderIds: ids(mine, 2000), ref: { kind: "month", id: m } });
  return {
    caseTitle: `MONTH FILE: ${monthShort(m).toUpperCase()}`,
    steps: [
      { label: "Resolved the month", detail: monthLong(m) },
      { label: "Computed the month", detail: `${num(cur.orders)} orders.` },
      { label: "Listed live campaigns", detail: live.map((c) => c.code).join(", ") || "none" },
    ],
    metrics: ["Revenue", "Profit", "Margin", "Discounted share", "Loss-making orders"],
    headline: `${monthLong(m)}: ${inrCompact(cur.net)} revenue, ${pct(cur.margin)} margin.`,
    explanation,
    findings: [
      { label: "Revenue", value: inrCompact(cur.net), tone: "blue" },
      { label: "Margin", value: pct(cur.margin), tone: cur.margin < 0.3 ? "red" : "blue" },
      { label: "Loss-making orders", value: num(cur.lossOrders), tone: cur.lossOrders ? "red" : "ink" },
    ],
    evidence: ev.list,
    focus: { mode: "trap", ref: { kind: "month", id: m } },
    nextQuestions: [p ? `Compare ${monthLong(p)} to ${monthLong(m)}.` : "Why is my profit declining?", "Show me the most suspicious transactions.", "Why is my profit declining?"],
    caveats: [],
  };
}

export function unknown(_input: HandlerInput, question: string): AnalysisDraft {
  return {
    caseTitle: "NO LEAD",
    steps: [{ label: "Parsed the question", detail: "No rule in the local engine matched it." }],
    metrics: [],
    headline: "I can't answer that from these books.",
    explanation: [
      `The local analysis engine understands questions about profit, revenue, discounts and coupon codes, products, channels, customers and repeat purchases, suspicious orders, and specific months. “${question.slice(0, 80)}” didn't match any of those.`,
      "It will not guess. Try one of the questions below, or name a product, month, channel or coupon code.",
    ],
    findings: [],
    evidence: [],
    nextQuestions: ["Why is my profit declining?", "Which products are hurting my margins?", "Compare this month to last month."],
    caveats: [],
  };
}

