import type { Transaction } from "./types";
import { channelById, customerById, productById } from "./dataset";
import { flagsFor } from "./suspicious";

const COLUMNS = [
  "order_id", "date", "time", "customer_id", "customer_name", "city", "channel", "coupon",
  "discount_pct", "items", "gross_inr", "discount_inr", "net_revenue_inr", "cogs_inr",
  "shipping_inr", "packaging_inr", "fees_inr", "contribution_profit_inr", "margin_pct",
  "customer_order_no", "flags",
];

function esc(v: string | number): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function transactionsToCSV(txs: Transaction[]): string {
  const rows = txs.map((t) => {
    const c = customerById(t.customerId);
    return [
      t.id, t.date, t.time, t.customerId, c.name, c.city, channelById(t.channel).name, t.coupon ?? "",
      t.discountPct,
      t.lines.map((l) => `${l.qty}x ${productById(l.productId).name}`).join("; "),
      t.gross, t.discount, t.net, t.cogs, t.shipping, t.packaging, t.fees, t.profit,
      t.net ? ((t.profit / t.net) * 100).toFixed(1) : "0",
      t.customerOrderNo,
      flagsFor(t).join("|"),
    ].map(esc).join(",");
  });
  return [COLUMNS.join(","), ...rows].join("\n");
}

/** Browser-only: trigger a CSV download. */
export function downloadCSV(filename: string, csv: string) {
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Free-text search across id, customer, city, channel, coupon and product names. */
export function matchesQuery(t: Transaction, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  const c = customerById(t.customerId);
  const hay = [
    t.id, t.date, t.customerId, c.name, c.city, channelById(t.channel).name, t.coupon ?? "full price",
    ...t.lines.map((l) => productById(l.productId).name),
    ...flagsFor(t),
  ].join(" ").toLowerCase();
  return needle.split(/\s+/).every((part) => hay.includes(part));
}
