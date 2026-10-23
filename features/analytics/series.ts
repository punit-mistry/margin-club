import { allMonths, getDataset } from "@/lib/analytics/dataset";
import { byMonth, heroShare, totals } from "@/lib/analytics/metrics";
import { flagged } from "@/lib/analytics/suspicious";
import { LOW_MARGIN_THRESHOLD } from "@/lib/analytics/suspicious";
import type { MonthKey, MonthMetrics } from "@/lib/analytics/types";

/** Shared, memoised series for the public pages. All figures computed from the dataset. */

export interface MonthStory extends MonthMetrics {
  revenueIndex: number; // first month = 100
  profitIndex: number;
  codes: string[]; // sitewide codes live in the month
  thinShare: number;
}

let story: { months: MonthStory[]; first: MonthStory; last: MonthStory; eraStart: MonthKey | null } | null = null;

export function caseStory() {
  if (story) return story;
  const ds = getDataset();
  const months = allMonths();
  const metrics = byMonth(ds.transactions, months);
  const thin = ds.products.filter((p) => (p.price - p.unitCost) / p.price < LOW_MARGIN_THRESHOLD).map((p) => p.id);
  const sitewide = ds.campaigns.filter((c) => !c.newOnly && c.channels.length >= 2);
  const base = metrics[0];
  const list: MonthStory[] = metrics.map((m) => ({
    ...m,
    revenueIndex: (m.net / base.net) * 100,
    profitIndex: (m.profit / base.profit) * 100,
    codes: sitewide.filter((c) => c.from.slice(0, 7) <= m.month && c.to.slice(0, 7) >= m.month).map((c) => c.code),
    thinShare: heroShare(ds.transactions.filter((t) => t.month === m.month), thin),
  }));
  // The "discount era": first month where 25%+ codes were on a quarter of orders.
  const era = list.find((m) => m.heavyDiscountOrders / m.orders >= 0.25);
  story = { months: list, first: list[0], last: list[list.length - 1], eraStart: era?.month ?? null };
  return story;
}

let headline: ReturnType<typeof computeHeadline> | null = null;

function computeHeadline() {
  const ds = getDataset();
  const all = totals(ds.transactions);
  const flags = flagged(ds.transactions);
  const losses = ds.transactions.filter((t) => t.profit < 0);
  return {
    orders: all.orders,
    customers: new Set(ds.transactions.map((t) => t.customerId)).size,
    products: ds.products.length,
    channels: ds.channels.length,
    flagged: flags.length,
    lossOrders: losses.length,
    lossTotal: losses.reduce((s, t) => s + t.profit, 0),
    worst: flags.slice(0, 18).map((f) => f.tx),
  };
}

export function caseHeadline() {
  if (!headline) headline = computeHeadline();
  return headline;
}
