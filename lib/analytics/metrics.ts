import type {
  BandMetrics,
  Channel,
  Product,
  ChannelId,
  ChannelMetrics,
  DiscountBand,
  DiscountBandId,
  MonthKey,
  MonthMetrics,
  ProductMetrics,
  Totals,
  Transaction,
} from "./types";
import { getDataset, productById } from "./dataset";
import { monthShort } from "./format";
import { HEAVY_SURCHARGE, PACKAGING_COST, QC_PACKAGING_COST } from "../../data/catalog";

/* ------------------------------------------------------------------ */
/* Totals                                                              */
/* ------------------------------------------------------------------ */

export function totals(txs: Transaction[]): Totals {
  const t: Totals = {
    orders: 0, units: 0, gross: 0, discount: 0, net: 0, cogs: 0, shipping: 0, packaging: 0,
    fees: 0, profit: 0, margin: 0, discountRate: 0, aov: 0, discountedOrders: 0,
    discountedShare: 0, heavyDiscountOrders: 0, lossOrders: 0,
  };
  for (const tx of txs) {
    t.orders++;
    for (const l of tx.lines) t.units += l.qty;
    t.gross += tx.gross;
    t.discount += tx.discount;
    t.net += tx.net;
    t.cogs += tx.cogs;
    t.shipping += tx.shipping;
    t.packaging += tx.packaging;
    t.fees += tx.fees;
    t.profit += tx.profit;
    if (tx.discountPct > 0) t.discountedOrders++;
    if (tx.discountPct >= 25) t.heavyDiscountOrders++;
    if (tx.profit < 0) t.lossOrders++;
  }
  t.margin = t.net ? t.profit / t.net : 0;
  t.discountRate = t.gross ? t.discount / t.gross : 0;
  t.aov = t.orders ? t.net / t.orders : 0;
  t.discountedShare = t.orders ? t.discountedOrders / t.orders : 0;
  return t;
}

export function byMonth(txs: Transaction[], months: MonthKey[]): MonthMetrics[] {
  const buckets = new Map<MonthKey, Transaction[]>(months.map((m) => [m, []]));
  for (const tx of txs) buckets.get(tx.month)?.push(tx);
  return months.map((m) => {
    const list = buckets.get(m)!;
    const base = totals(list);
    let newCustomers = 0;
    for (const tx of list) if (tx.customerOrderNo === 1) newCustomers++;
    return { ...base, month: m, label: monthShort(m), newCustomers, repeatOrders: base.orders - newCustomers };
  });
}

/* ------------------------------------------------------------------ */
/* Products — line-level allocation                                    */
/* ------------------------------------------------------------------ */

/**
 * Order-level costs (discount %, fees, shipping, packaging) are allocated to
 * lines: discount and fees pro-rata to list value, shipping to heavy units
 * first, packaging evenly across lines. Transparent and reproducible.
 */
export interface LineFact {
  tx: Transaction;
  productId: string;
  qty: number;
  gross: number;
  net: number;
  cogs: number;
  costs: number; // shipping + packaging + fees allocated
  profit: number;
}

export function lineFacts(txs: Transaction[]): LineFact[] {
  const out: LineFact[] = [];
  for (const tx of txs) {
    const heavyUnits = tx.lines.reduce((s, l) => s + (productById(l.productId).heavy ? l.qty : 0), 0);
    const units = tx.lines.reduce((s, l) => s + l.qty, 0);
    for (const l of tx.lines) {
      const gross = l.unitPrice * l.qty;
      const share = tx.gross ? gross / tx.gross : 0;
      const net = gross * (1 - tx.discountPct / 100);
      const heavy = productById(l.productId).heavy;
      const ship = heavyUnits > 0 ? (heavy ? (tx.shipping * l.qty) / heavyUnits : 0) : (tx.shipping * l.qty) / units;
      const costs = ship + tx.packaging / tx.lines.length + tx.fees * share;
      const cogs = l.unitCost * l.qty;
      out.push({ tx, productId: l.productId, qty: l.qty, gross, net, cogs, costs, profit: net - cogs - costs });
    }
  }
  return out;
}

export function byProduct(txs: Transaction[]): ProductMetrics[] {
  const facts = lineFacts(txs);
  const totalNet = facts.reduce((s, f) => s + f.net, 0);
  const acc = new Map<string, { units: number; gross: number; net: number; profit: number }>();
  for (const f of facts) {
    const a = acc.get(f.productId) ?? { units: 0, gross: 0, net: 0, profit: 0 };
    a.units += f.qty;
    a.gross += f.gross;
    a.net += f.net;
    a.profit += f.profit;
    acc.set(f.productId, a);
  }
  return getDataset().products.map((p) => {
    const a = acc.get(p.id) ?? { units: 0, gross: 0, net: 0, profit: 0 };
    return {
      product: p,
      units: a.units,
      net: Math.round(a.net),
      profit: Math.round(a.profit),
      margin: a.net ? a.profit / a.net : 0,
      avgDiscount: a.gross ? 1 - a.net / a.gross : 0,
      revenueShare: totalNet ? a.net / totalNet : 0,
      listMargin: (p.price - p.unitCost) / p.price,
    };
  });
}

/* ------------------------------------------------------------------ */
/* Channels                                                            */
/* ------------------------------------------------------------------ */

export function byChannel(txs: Transaction[]): ChannelMetrics[] {
  const all = totals(txs);
  return getDataset().channels.map((c) => {
    const t = totals(txs.filter((tx) => tx.channel === c.id));
    return {
      ...t,
      channel: c,
      revenueShare: all.net ? t.net / all.net : 0,
      profitShare: all.profit ? t.profit / all.profit : 0,
    };
  });
}

export function channelTotals(txs: Transaction[], id: ChannelId): Totals {
  return totals(txs.filter((t) => t.channel === id));
}

/* ------------------------------------------------------------------ */
/* Discount bands                                                      */
/* ------------------------------------------------------------------ */

export const DISCOUNT_BANDS: DiscountBand[] = [
  { id: "none", label: "Full price", min: 0, max: 1 },
  { id: "low", label: "1–14%", min: 1, max: 15 },
  { id: "mid", label: "15–24%", min: 15, max: 25 },
  { id: "high", label: "25–34%", min: 25, max: 35 },
  { id: "deep", label: "35%+", min: 35, max: 101 },
];

export function bandOf(pct: number): DiscountBandId {
  return DISCOUNT_BANDS.find((b) => pct >= b.min && pct < b.max)!.id;
}

export function bandById(id: DiscountBandId): DiscountBand {
  return DISCOUNT_BANDS.find((b) => b.id === id)!;
}

export function byBand(txs: Transaction[]): BandMetrics[] {
  return DISCOUNT_BANDS.map((band) => ({
    ...totals(txs.filter((t) => t.discountPct >= band.min && t.discountPct < band.max)),
    band,
  }));
}

/* ------------------------------------------------------------------ */
/* Coupons                                                             */
/* ------------------------------------------------------------------ */

export interface CouponMetrics extends Totals {
  code: string;
  pct: number;
}

export function byCoupon(txs: Transaction[]): CouponMetrics[] {
  const groups = new Map<string, Transaction[]>();
  for (const tx of txs) {
    if (!tx.coupon) continue;
    const g = groups.get(tx.coupon) ?? [];
    g.push(tx);
    groups.set(tx.coupon, g);
  }
  return [...groups.entries()]
    .map(([code, list]) => ({ ...totals(list), code, pct: list[0].discountPct }))
    .sort((a, b) => b.net - a.net);
}

/* ------------------------------------------------------------------ */
/* Profit bridge                                                       */
/* ------------------------------------------------------------------ */

/**
 * Every rupee of list value (gross) splits exactly into:
 *   discount + cogs + shipping + packaging + fees + profit.
 * Comparing these shares between two periods explains a margin change
 * with no residual — each line's change in "paise per ₹1 of list value".
 */
export interface BridgeLine {
  key: "discount" | "cogs" | "shipping" | "packaging" | "fees" | "profit";
  label: string;
  a: number; // share of gross, period A
  b: number; // share of gross, period B
}

export function costStack(t: Totals) {
  const g = t.gross || 1;
  return {
    discount: t.discount / g,
    cogs: t.cogs / g,
    shipping: t.shipping / g,
    packaging: t.packaging / g,
    fees: t.fees / g,
    profit: t.profit / g,
  };
}

export function profitBridge(a: Totals, b: Totals): BridgeLine[] {
  const sa = costStack(a);
  const sb = costStack(b);
  const labels: Record<BridgeLine["key"], string> = {
    discount: "Discounts",
    cogs: "Product cost (COGS)",
    shipping: "Shipping",
    packaging: "Packaging",
    fees: "Channel fees",
    profit: "Contribution profit",
  };
  return (Object.keys(labels) as BridgeLine["key"][]).map((key) => ({ key, label: labels[key], a: sa[key], b: sb[key] }));
}

/**
 * COGS share can only move through mix: unit costs and list prices are fixed
 * in this dataset. We still verify that by recomputing COGS at period-A mix.
 */
export function heroShare(txs: Transaction[], productIds: string[]): number {
  let gross = 0;
  let hero = 0;
  for (const tx of txs) {
    for (const l of tx.lines) {
      const v = l.unitPrice * l.qty;
      gross += v;
      if (productIds.includes(l.productId)) hero += v;
    }
  }
  return gross ? hero / gross : 0;
}

/* ------------------------------------------------------------------ */
/* Break-even & product series                                         */
/* ------------------------------------------------------------------ */

/**
 * Discount at which a single-unit order of `p` on `channel` stops making money:
 * net × (1 − fee) = unit cost + shipping + packaging.
 */
export function breakEvenDiscount(p: Product, channel: Channel): number {
  const qc = channel.id === "quickcommerce";
  const ship = qc ? 0 : channel.shippingBase + (p.heavy ? HEAVY_SURCHARGE : 0);
  const pack = qc ? QC_PACKAGING_COST : PACKAGING_COST;
  const maxNet = (p.unitCost + ship + pack) / (1 - channel.feeRate);
  return Math.max(0, 1 - maxNet / p.price);
}

export interface ProductMonth {
  month: MonthKey;
  units: number;
  net: number;
  profit: number;
  margin: number;
  avgDiscount: number;
}

export function productMonthly(txs: Transaction[], months: MonthKey[]): Map<string, ProductMonth[]> {
  const acc = new Map<string, Map<MonthKey, { units: number; gross: number; net: number; profit: number }>>();
  for (const f of lineFacts(txs)) {
    const pm = acc.get(f.productId) ?? new Map();
    const a = pm.get(f.tx.month) ?? { units: 0, gross: 0, net: 0, profit: 0 };
    a.units += f.qty;
    a.gross += f.gross;
    a.net += f.net;
    a.profit += f.profit;
    pm.set(f.tx.month, a);
    acc.set(f.productId, pm);
  }
  const out = new Map<string, ProductMonth[]>();
  for (const p of getDataset().products) {
    const pm = acc.get(p.id);
    out.set(
      p.id,
      months.map((month) => {
        const a = pm?.get(month) ?? { units: 0, gross: 0, net: 0, profit: 0 };
        return { month, units: a.units, net: a.net, profit: a.profit, margin: a.net ? a.profit / a.net : 0, avgDiscount: a.gross ? 1 - a.net / a.gross : 0 };
      }),
    );
  }
  return out;
}
