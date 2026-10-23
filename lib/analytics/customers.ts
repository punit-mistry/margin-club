import type { ChannelId, Customer, MonthKey, MonthRange, Transaction } from "./types";
import { allMonths, getDataset } from "./dataset";
import { daysBetween } from "./periods";

/**
 * Customer behaviour. Repeat rates use a fixed look-ahead window and only
 * count customers who have been observable for the full window, so newer
 * cohorts are never penalised for having had less time to come back.
 */

let ordersByCustomer: Map<string, Transaction[]> | null = null;

export function customerOrders(): Map<string, Transaction[]> {
  if (!ordersByCustomer) {
    ordersByCustomer = new Map();
    for (const tx of getDataset().transactions) {
      const list = ordersByCustomer.get(tx.customerId) ?? [];
      list.push(tx);
      ordersByCustomer.set(tx.customerId, list);
    }
  }
  return ordersByCustomer;
}

export type AcquisitionSegment = "full" | "welcome" | "mid" | "deep";

export const SEGMENT_LABEL: Record<AcquisitionSegment, string> = {
  full: "Full price",
  welcome: "10% welcome",
  mid: "15–24% off",
  deep: "25%+ off",
};

export function segmentOf(discount: number): AcquisitionSegment {
  if (discount === 0) return "full";
  if (discount <= 10) return "welcome";
  if (discount < 25) return "mid";
  return "deep";
}

export interface RepeatStat {
  eligible: number;
  repeated: number;
  rate: number;
  customerIds: string[];
}

function newCustomersIn(range: MonthRange): { c: Customer; first: Transaction }[] {
  const ds = getDataset();
  const orders = customerOrders();
  const out: { c: Customer; first: Transaction }[] = [];
  for (const c of ds.customers) {
    const list = orders.get(c.id);
    if (!list || list[0].customerOrderNo !== 1) continue; // legacy customer
    const m = list[0].month;
    if (m < range.from || m > range.to) continue;
    out.push({ c, first: list[0] });
  }
  return out;
}

/** Did the customer place another order within `days` of their first order? */
export function repeatRate(range: MonthRange, days: number, filter?: (c: Customer, first: Transaction) => boolean): RepeatStat {
  const end = getDataset().business.to;
  const orders = customerOrders();
  let eligible = 0;
  let repeated = 0;
  const customerIds: string[] = [];
  for (const { c, first } of newCustomersIn(range)) {
    if (filter && !filter(c, first)) continue;
    if (daysBetween(first.date, end) < days) continue;
    eligible++;
    const list = orders.get(c.id)!;
    const second = list[1];
    if (second && daysBetween(first.date, second.date) <= days) {
      repeated++;
      customerIds.push(c.id);
    }
  }
  return { eligible, repeated, rate: eligible ? repeated / eligible : 0, customerIds };
}

export function repeatBySegment(range: MonthRange, days = 60): Record<AcquisitionSegment, RepeatStat> {
  const segs: AcquisitionSegment[] = ["full", "welcome", "mid", "deep"];
  return Object.fromEntries(
    segs.map((s) => [s, repeatRate(range, days, (_c, first) => segmentOf(first.discountPct) === s)]),
  ) as Record<AcquisitionSegment, RepeatStat>;
}

export function repeatByChannel(range: MonthRange, days = 60): Record<ChannelId, RepeatStat> {
  const ids: ChannelId[] = ["website", "instagram", "marketplace", "quickcommerce"];
  return Object.fromEntries(ids.map((id) => [id, repeatRate(range, days, (_c, first) => first.channel === id)])) as Record<
    ChannelId,
    RepeatStat
  >;
}

export interface CohortRow {
  month: MonthKey;
  size: number;
  deepShare: number; // share of cohort acquired at 25%+ off
  /** Share of the cohort that ordered again in month +k (k = 1…). null = not yet observable. */
  activity: (number | null)[];
  repeat60: RepeatStat;
}

export function cohorts(range: MonthRange): CohortRow[] {
  const months = allMonths();
  const orders = customerOrders();
  const fresh = newCustomersIn({ from: months[0], to: months[months.length - 1] });
  return months
    .filter((m) => m >= range.from && m <= range.to)
    .map((m) => {
      const members = fresh.filter((f) => f.first.month === m);
      const mi = months.indexOf(m);
      const activity: (number | null)[] = [];
      for (let k = 1; k <= 4; k++) {
        const target = months[mi + k];
        if (!target) {
          activity.push(null);
          continue;
        }
        let active = 0;
        for (const { c } of members) if (orders.get(c.id)!.some((o) => o.month === target)) active++;
        activity.push(members.length ? active / members.length : 0);
      }
      return {
        month: m,
        size: members.length,
        deepShare: members.length ? members.filter((f) => f.first.discountPct >= 25).length / members.length : 0,
        activity,
        repeat60: repeatRate({ from: m, to: m }, 60),
      };
    });
}

export interface ActivityMonth {
  month: MonthKey;
  newCustomers: number;
  returningCustomers: number;
  returningOrders: number;
  returningRevenue: number;
  newRevenue: number;
  returningDiscounted: number;
}

export function activityByMonth(txs: Transaction[], months: MonthKey[]): ActivityMonth[] {
  return months.map((m) => {
    const list = txs.filter((t) => t.month === m);
    const fresh = list.filter((t) => t.customerOrderNo === 1);
    const returning = list.filter((t) => t.customerOrderNo > 1);
    return {
      month: m,
      newCustomers: fresh.length,
      returningCustomers: new Set(returning.map((t) => t.customerId)).size,
      returningOrders: returning.length,
      returningRevenue: returning.reduce((s, t) => s + t.net, 0),
      newRevenue: fresh.reduce((s, t) => s + t.net, 0),
      returningDiscounted: returning.filter((t) => t.discountPct > 0).length,
    };
  });
}
