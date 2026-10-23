import type { ISODate, MonthKey, MonthRange, Transaction } from "./types";
import { allMonths } from "./dataset";

export function monthsInRange(range: MonthRange): MonthKey[] {
  return allMonths().filter((m) => m >= range.from && m <= range.to);
}

export function fullRange(): MonthRange {
  const m = allMonths();
  return { from: m[0], to: m[m.length - 1] };
}

export function inRange(tx: Transaction, range: MonthRange): boolean {
  return tx.month >= range.from && tx.month <= range.to;
}

export function filterRange(txs: Transaction[], range: MonthRange): Transaction[] {
  return txs.filter((t) => inRange(t, range));
}

export function prevMonth(m: MonthKey): MonthKey | null {
  const months = allMonths();
  const i = months.indexOf(m);
  return i > 0 ? months[i - 1] : null;
}

/** Split a range into an opening and closing window of equal length (max 3 months each). */
export function openingClosing(range: MonthRange): { opening: MonthKey[]; closing: MonthKey[] } {
  const months = monthsInRange(range);
  if (months.length < 2) return { opening: months, closing: months };
  const size = Math.min(3, Math.floor(months.length / 2));
  return { opening: months.slice(0, size), closing: months.slice(-size) };
}

/** Days between two ISO dates (b − a). UTC arithmetic: timezone-proof. */
export function daysBetween(a: ISODate, b: ISODate): number {
  const ua = Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10));
  const ub = Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10));
  return Math.round((ub - ua) / 86_400_000);
}
