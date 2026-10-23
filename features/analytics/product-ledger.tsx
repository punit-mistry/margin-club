"use client";

import { useState } from "react";
import { inrCompact, pct } from "@/lib/analytics/format";
import type { ProductMonth } from "@/lib/analytics/metrics";
import type { ProductMetrics } from "@/lib/analytics/types";

type SortKey = "net" | "margin" | "avgDiscount" | "breakEven" | "headroom";

export interface LedgerRow {
  m: ProductMetrics;
  series: ProductMonth[];
  breakEven: number;
}

function Spark({ series, red }: { series: ProductMonth[]; red: boolean }) {
  const vals = series.map((s) => s.margin);
  const lo = Math.min(0, ...vals);
  const hi = Math.max(0.6, ...vals);
  const pts = vals.map((v, i) => `${(i / Math.max(1, vals.length - 1)) * 80},${22 - ((v - lo) / (hi - lo)) * 20}`).join(" ");
  return (
    <svg viewBox="0 0 80 24" className="h-6 w-20" aria-hidden>
      <line x1={0} x2={80} y1={22 - ((0 - lo) / (hi - lo)) * 20} y2={22 - ((0 - lo) / (hi - lo)) * 20} stroke="#E74732" strokeOpacity={0.4} strokeDasharray="2 2" />
      <polyline points={pts} fill="none" stroke={red ? "#E74732" : "#161616"} strokeWidth={1.5} />
    </svg>
  );
}

type SortState = { key: SortKey; dir: 1 | -1 };

function Th({ k, sort, onSort, children, className = "" }: { k: SortKey; sort: SortState; onSort: (k: SortKey) => void; children: React.ReactNode; className?: string }) {
  return (
    <th className={`py-2 font-normal ${className}`}>
      <button type="button" onClick={() => onSort(k)} className={`meta inline-flex items-center gap-1 hover:text-electric ${sort.key === k ? "text-electric" : ""}`}>
        {children}
        <span aria-hidden>{sort.key === k ? (sort.dir === -1 ? "↓" : "↑") : "↕"}</span>
      </button>
    </th>
  );
}

/** Sortable product ledger with margin sparklines and break-even headroom. */
export function ProductLedger({ rows, selected, onSelect }: { rows: LedgerRow[]; selected?: string | null; onSelect?: (id: string) => void }) {
  const [sort, setSort] = useState<SortState>({ key: "net", dir: -1 });
  const onSort = (k: SortKey) => setSort((s) => ({ key: k, dir: s.key === k ? ((-s.dir) as 1 | -1) : -1 }));
  const val = (r: LedgerRow, k: SortKey) =>
    k === "breakEven" ? r.breakEven : k === "headroom" ? r.breakEven - r.m.avgDiscount : r.m[k];
  const sorted = [...rows].sort((a, b) => (val(a, sort.key) - val(b, sort.key)) * sort.dir);
  return (
    <div className="overflow-x-auto scrollbar-thin">
      <table className="w-full min-w-[640px] border-collapse text-left">
        <thead className="border-b border-ink">
          <tr>
            <th className="meta py-2 font-normal">Product</th>
            <Th sort={sort} onSort={onSort} k="net" className="text-right">Revenue</Th>
            <Th sort={sort} onSort={onSort} k="margin" className="text-right">Margin</Th>
            <th className="meta py-2 pl-4 font-normal">Margin by month</th>
            <Th sort={sort} onSort={onSort} k="avgDiscount" className="text-right">Avg disc.</Th>
            <Th sort={sort} onSort={onSort} k="breakEven" className="text-right">Break-even</Th>
            <Th sort={sort} onSort={onSort} k="headroom" className="text-right">Headroom</Th>
          </tr>
        </thead>
        <tbody className="font-mono text-[11.5px] tnum">
          {sorted.map((r) => {
            const isSel = selected === r.m.product.id;
            const headroom = r.breakEven - r.m.avgDiscount;
            const thin = r.m.margin < 0.2;
            return (
              <tr
                key={r.m.product.id}
                onClick={() => onSelect?.(r.m.product.id)}
                className={`cursor-pointer border-b border-ink/15 transition-colors ${isSel ? "bg-electric/10" : "hover:bg-ink/5"}`}
              >
                <td className="py-2 pr-2 font-sans text-[13px]">
                  <span className={isSel ? "font-semibold text-electric" : ""}>{r.m.product.name}</span>
                  <span className="meta block text-ink-soft">{r.m.product.sku}</span>
                </td>
                <td className="py-2 text-right">{inrCompact(r.m.net)}</td>
                <td className={`py-2 text-right font-bold ${thin ? "text-signal" : ""}`}>{pct(r.m.margin)}</td>
                <td className="py-2 pl-4">
                  <Spark series={r.series} red={thin} />
                </td>
                <td className="py-2 text-right">{pct(r.m.avgDiscount, 0)}</td>
                <td className="py-2 text-right">{pct(r.breakEven, 0)}</td>
                <td className={`py-2 text-right font-bold ${headroom < 0.15 ? "text-signal" : "text-electric"}`}>{pct(headroom, 0)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
