import type {
  Campaign,
  ChannelId,
  Customer,
  Dataset,
  ISODate,
  MonthKey,
  OrderLine,
  Product,
  Transaction,
} from "../lib/analytics/types";
import {
  BUSINESS,
  CAMPAIGNS,
  CHANNELS,
  CITIES,
  FIRST_NAMES,
  HEAVY_SURCHARGE,
  LAST_INITIALS,
  PACKAGING_COST,
  PRODUCTS,
  QC_PACKAGING_COST,
} from "./catalog";

/**
 * Deterministic simulation of eight months of Ordinary Objects orders.
 *
 * The same seed always yields the same dataset, on the server and in the
 * browser. Only integer arithmetic and +,−,×,÷ are used so results never
 * drift between JavaScript engines.
 *
 * What the simulation encodes (the "ground truth" the analytics must find):
 *  - Promotions get more frequent and deeper from May onward.
 *  - Promotions pull in more first-time buyers (revenue goes up).
 *  - Ads push two low-margin hero products (dinner set, bedsheets).
 *  - Quick commerce launches in June with a high commission.
 *  - Customers acquired on deep discounts come back less often.
 */

export const SEED = 20260201;

const MONTHS: { key: MonthKey; days: number }[] = [
  { key: "2026-02", days: 28 },
  { key: "2026-03", days: 31 },
  { key: "2026-04", days: 30 },
  { key: "2026-05", days: 31 },
  { key: "2026-06", days: 30 },
  { key: "2026-07", days: 31 },
  { key: "2026-08", days: 31 },
  { key: "2026-09", days: 30 },
];

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Rng = () => number;

function pick<T>(rng: Rng, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)];
}

function weighted<T>(rng: Rng, items: readonly T[], weights: readonly number[]): T {
  let total = 0;
  for (const w of weights) total += w;
  let r = rng() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r < 0) return items[i];
  }
  return items[items.length - 1];
}

/** Integer count with mean `mean` (sum of uniforms — no Math.exp/log needed). */
function countAround(rng: Rng, mean: number): number {
  const spread = (rng() + rng() + rng() - 1.5) * 0.5; // ≈ ±0.75
  return Math.max(0, Math.round(mean * (1 + spread * 0.45)));
}

const pad = (n: number, width = 2) => String(n).padStart(width, "0");

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

/* ------------------------------------------------------------------ */

const PRODUCT_BASE_WEIGHT: Record<string, number> = {
  P01: 15, P02: 13, P03: 8, P04: 11, P05: 6, P06: 7,
  P07: 7, P08: 9, P09: 6, P10: 4, P11: 9, P12: 7,
};

/** Paid social pushes the two "hero" SKUs from May; both are low-margin. */
function productWeights(t: number, promoPct: number): number[] {
  const ramp = Math.min(1, Math.max(0, (t - 3) / 3)); // May → Aug
  const promoTilt = promoPct >= 25 ? 1.35 : 1;
  return PRODUCTS.map((p) => {
    const base = PRODUCT_BASE_WEIGHT[p.id];
    if (p.id === "P10") return base * (1 + 1.5 * ramp) * promoTilt;
    if (p.id === "P09") return base * (1 + 1.3 * ramp) * promoTilt;
    if (p.id === "P07") return base * (1 + 0.4 * ramp);
    return base;
  });
}

const QC_CATALOG = new Set(["P01", "P02", "P03", "P08", "P10", "P11", "P12"]);

function channelWeights(t: number, date: ISODate): number[] {
  const qcLive = date >= "2026-06-01";
  return [
    lerp(0.52, 0.37, t / 7), // website
    lerp(0.21, 0.26, t / 7), // instagram
    lerp(0.27, 0.24, t / 7), // marketplace
    qcLive ? lerp(0.08, 0.15, (t - 4) / 3) : 0, // quick commerce
  ];
}

function activeCampaigns(date: ISODate, channel: ChannelId): Campaign[] {
  return CAMPAIGNS.filter(
    (c) => !c.newOnly && date >= c.from && date <= c.to && c.channels.includes(channel),
  );
}

/** Strongest site-wide promotion running on a date (drives demand). */
function headlinePromo(date: ISODate): number {
  let best = 0;
  for (const c of CAMPAIGNS) {
    if (c.newOnly || c.code === "CREATOR20" || c.code === "MKTDEAL" || c.code === "QCLAUNCH") continue;
    if (date >= c.from && date <= c.to) best = Math.max(best, c.pct);
  }
  return best;
}

function chooseDiscount(
  rng: Rng,
  date: ISODate,
  channel: ChannelId,
  isNew: boolean,
): { coupon: string | null; pct: number } {
  const live = activeCampaigns(date, channel);
  // Strongest live public campaign
  const headline = live
    .filter((c) => c.code !== "CREATOR20" && c.code !== "MKTDEAL" && c.code !== "QCLAUNCH")
    .sort((a, b) => b.pct - a.pct)[0];
  if (headline && rng() < (isNew ? 0.78 : 0.6)) return { coupon: headline.code, pct: headline.pct };

  if (channel === "instagram" && live.some((c) => c.code === "CREATOR20") && rng() < 0.42) {
    return { coupon: "CREATOR20", pct: 20 };
  }
  if (channel === "marketplace" && live.some((c) => c.code === "MKTDEAL") && rng() < 0.48) {
    return { coupon: "MKTDEAL", pct: 20 };
  }
  if (channel === "quickcommerce" && live.some((c) => c.code === "QCLAUNCH") && rng() < 0.62) {
    return { coupon: "QCLAUNCH", pct: 20 };
  }
  if (isNew && (channel === "website" || channel === "instagram") && rng() < 0.42) {
    return { coupon: "WELCOME10", pct: 10 };
  }
  // Leakage: a returning customer re-using the first-order code.
  if (!isNew && (channel === "website" || channel === "instagram") && date >= "2026-05-01" && rng() < 0.07) {
    return { coupon: "WELCOME10", pct: 10 };
  }
  return { coupon: null, pct: 0 };
}

function buildLines(rng: Rng, t: number, promoPct: number, channel: ChannelId): OrderLine[] {
  const weights = productWeights(t, promoPct).map((w, i) =>
    channel === "quickcommerce" && !QC_CATALOG.has(PRODUCTS[i].id) ? 0 : w,
  );
  const lineCount = weighted(rng, [1, 2, 3], [62, 28, 10]);
  const chosen = new Map<string, OrderLine>();
  for (let i = 0; i < lineCount; i++) {
    const p: Product = weighted(rng, PRODUCTS, weights);
    const small = p.price < 1000;
    const qty = small && rng() < 0.28 ? 2 : 1;
    const existing = chosen.get(p.id);
    if (existing) existing.qty += 1;
    else chosen.set(p.id, { productId: p.id, qty, unitPrice: p.price, unitCost: p.unitCost });
  }
  return [...chosen.values()];
}

/* ------------------------------------------------------------------ */

interface SimCustomer extends Customer {
  orders: number;
  /** Monthly probability of buying again, in [0, 1]. */
  loyalty: number;
  acquiredT: number;
}

function loyaltyFor(rng: Rng, discount: number, channel: ChannelId): number {
  let base = discount === 0 ? 0.1 : discount <= 10 ? 0.078 : discount <= 20 ? 0.052 : 0.026;
  if (channel === "marketplace") base *= 0.62;
  if (channel === "quickcommerce") base *= 0.5;
  return base * (0.75 + rng() * 0.5);
}

export function generateDataset(seed = SEED): Dataset {
  const rng = mulberry32(seed);
  const customers: SimCustomer[] = [];
  const rawOrders: Omit<Transaction, "id">[] = [];
  const productById = new Map(PRODUCTS.map((p) => [p.id, p]));
  const channelById = new Map(CHANNELS.map((c) => [c.id, c]));

  const newCustomer = (date: ISODate, channel: ChannelId, discount: number, coupon: string | null, t: number): SimCustomer => {
    const n = customers.length + 1;
    const c: SimCustomer = {
      id: `C${pad(n, 5)}`,
      name: `${pick(rng, FIRST_NAMES)} ${pick(rng, LAST_INITIALS)}.`,
      city: pick(rng, CITIES),
      acquiredOn: date,
      acquisitionChannel: channel,
      acquisitionDiscount: discount,
      acquisitionCoupon: coupon,
      orders: 0,
      loyalty: loyaltyFor(rng, discount, channel),
      acquiredT: t,
    };
    customers.push(c);
    return c;
  };

  // Customers acquired before the observation window (Sep 2025 – Jan 2026).
  const legacyMonths = ["2025-09", "2025-10", "2025-11", "2025-12", "2026-01"];
  for (let i = 0; i < 1500; i++) {
    const m = legacyMonths[Math.floor(rng() * legacyMonths.length)];
    const day = 1 + Math.floor(rng() * 28);
    const ch = weighted(rng, ["website", "instagram", "marketplace"] as ChannelId[], [56, 20, 24]);
    const disc = rng() < 0.7 ? 0 : 10;
    const c = newCustomer(`${m}-${pad(day)}`, ch, disc, disc ? "WELCOME10" : null, -1 - (legacyMonths.length - legacyMonths.indexOf(m)));
    c.orders = 1 + Math.floor(rng() * 2);
  }

  const makeOrder = (c: SimCustomer, date: ISODate, month: MonthKey, t: number, channel: ChannelId, isNew: boolean) => {
    const promo = headlinePromo(date);
    const { coupon, pct } = chooseDiscount(rng, date, channel, isNew);
    if (isNew) {
      c.acquisitionDiscount = pct;
      c.acquisitionCoupon = coupon;
      c.loyalty = loyaltyFor(rng, pct, channel);
    }
    const lines = buildLines(rng, t, promo, channel);
    const ch = channelById.get(channel)!;
    let gross = 0;
    let cogs = 0;
    let heavyUnits = 0;
    let units = 0;
    for (const l of lines) {
      gross += l.unitPrice * l.qty;
      cogs += l.unitCost * l.qty;
      units += l.qty;
      if (productById.get(l.productId)!.heavy) heavyUnits += l.qty;
    }
    const discount = Math.round((gross * pct) / 100);
    const net = gross - discount;
    const shipping = channel === "quickcommerce" ? 0 : ch.shippingBase + HEAVY_SURCHARGE * heavyUnits + (units > 2 ? 18 : 0);
    const packaging = channel === "quickcommerce" ? QC_PACKAGING_COST : PACKAGING_COST;
    const fees = Math.round(net * ch.feeRate);
    const profit = net - cogs - shipping - packaging - fees;
    c.orders += 1;
    const hour = weighted(rng, [8, 10, 12, 14, 16, 18, 20, 22], [5, 9, 12, 10, 11, 16, 22, 15]);
    rawOrders.push({
      date,
      month,
      time: `${pad(hour + Math.floor(rng() * 2))}:${pad(Math.floor(rng() * 60))}`,
      customerId: c.id,
      channel,
      coupon,
      discountPct: pct,
      lines,
      customerOrderNo: c.orders,
      gross,
      discount,
      net,
      cogs,
      shipping,
      packaging,
      fees,
      profit,
    });
  };

  MONTHS.forEach((m, mi) => {
    for (let d = 1; d <= m.days; d++) {
      const date = `${m.key}-${pad(d)}`;
      const t = mi + (d - 1) / m.days; // 0 … 8
      const promo = headlinePromo(date);
      const demand = 1 + promo / 120;

      // First-time buyers
      const meanNew = lerp(12.6, 12.2, t / 8) * demand;
      const newCount = countAround(rng, meanNew);
      const chWeights = channelWeights(t, date);
      for (let i = 0; i < newCount; i++) {
        const ch = weighted(rng, CHANNELS.map((c) => c.id), chWeights);
        const c = newCustomer(date, ch, 0, null, t);
        makeOrder(c, date, m.key, t, ch, true);
      }

      // Returning buyers
      const repeatBoost = promo > 0 ? 1.3 : 1;
      for (let ci = 0; ci < customers.length; ci++) {
        const c = customers[ci];
        if (c.acquiredOn >= date || c.orders === 0) continue;
        const age = t - c.acquiredT;
        const decay = age > 4 ? 0.72 : 1;
        if (rng() < ((c.loyalty * decay * repeatBoost) / 30)) {
          let ch: ChannelId = rng() < 0.72 ? c.acquisitionChannel : "website";
          if (ch === "quickcommerce" && date < "2026-06-01") ch = "website";
          makeOrder(c, date, m.key, t, ch, false);
        }
      }
    }
  });

  rawOrders.sort((a, b) => (a.date === b.date ? a.time.localeCompare(b.time) : a.date.localeCompare(b.date)));
  const transactions: Transaction[] = rawOrders.map((o, i) => ({ id: `OO-${pad(10421 + i, 5)}`, ...o }));

  // Re-number each customer's orders chronologically after sorting.
  // Legacy customers already had orders before the window opened.
  const inWindow = new Map<string, number>();
  for (const o of rawOrders) inWindow.set(o.customerId, (inWindow.get(o.customerId) ?? 0) + 1);
  const seen = new Map<string, number>();
  for (const c of customers) seen.set(c.id, c.orders - (inWindow.get(c.id) ?? 0));
  for (const tx of transactions) {
    const n = (seen.get(tx.customerId) ?? 0) + 1;
    seen.set(tx.customerId, n);
    tx.customerOrderNo = n;
  }

  return {
    business: BUSINESS,
    products: PRODUCTS,
    channels: CHANNELS,
    campaigns: CAMPAIGNS,
    customers: customers.map(({ id, name, city, acquiredOn, acquisitionChannel, acquisitionDiscount, acquisitionCoupon }) => ({
      id,
      name,
      city,
      acquiredOn,
      acquisitionChannel,
      acquisitionDiscount,
      acquisitionCoupon,
    })),
    transactions,
  };
}
