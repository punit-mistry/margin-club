"use client";

import { Download, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { channelById, customerById, getDataset, productById, txsByIds } from "@/lib/analytics/dataset";
import { downloadCSV, matchesQuery, transactionsToCSV } from "@/lib/analytics/export";
import { dateShort, inr, inrCompact, num, pct } from "@/lib/analytics/format";
import { totals } from "@/lib/analytics/metrics";
import { filterRange } from "@/lib/analytics/periods";
import { FLAGS, flagsFor } from "@/lib/analytics/suspicious";
import type { Transaction } from "@/lib/analytics/types";
import { actions, useWorkspace } from "./store";
import type { DrawerState } from "./types";

type SortKey = "profit" | "date" | "discount" | "net";
const PAGE = 120;

export function EvidenceDrawer() {
  const ws = useWorkspace();
  const d = ws.drawer;

  useEffect(() => {
    if (!d) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && actions.closeDrawer();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [d]);

  if (!d) return null;
  // Keyed on the drawer so filters reset whenever new evidence is opened.
  return <DrawerBody key={`${d.title}|${d.query ?? ""}|${d.orderIds?.length ?? "q"}`} d={d} range={ws.range} selected={ws.selection?.kind === "order" ? ws.selection.id : null} />;
}

function DrawerBody({ d, range, selected }: { d: DrawerState; range: ReturnType<typeof useWorkspace>["range"]; selected: string | null }) {
  const [q, setQ] = useState(d.query ?? "");
  const [sort, setSort] = useState<SortKey | "given">(d.orderIds ? "given" : "date");
  const [limit, setLimit] = useState(PAGE);

  const base = useMemo<Transaction[]>(() => (d.orderIds ? txsByIds(d.orderIds) : filterRange(getDataset().transactions, range)), [d.orderIds, range]);
  const rows = useMemo(() => {
    const list = base.filter((t) => matchesQuery(t, q));
    if (sort === "given") return list;
    const val = (t: Transaction) => (sort === "profit" ? t.profit : sort === "date" ? 0 : sort === "discount" ? -t.discountPct : -t.net);
    return [...list].sort((a, b) => (sort === "date" ? b.date.localeCompare(a.date) || b.time.localeCompare(a.time) : val(a) - val(b)));
  }, [base, q, sort]);
  const sum = useMemo(() => totals(rows), [rows]);

  const exportCSV = () => {
    const slug = d.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48);
    downloadCSV(`margin-club_case-001_${slug || "evidence"}.csv`, transactionsToCSV(rows));
  };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end xl:top-[88px] xl:right-[700px]" role="dialog" aria-modal="true" aria-label={d.title}>
      <button type="button" aria-label="Close evidence" className="absolute inset-0 bg-ink/40" onClick={() => actions.closeDrawer()} />
      <div className="relative flex h-[92dvh] flex-col border-t-2 border-ink bg-cream shadow-[0_-10px_0_#161616] animate-rise lg:mx-6 lg:h-[72dvh] lg:border-x-2 xl:mx-0 xl:h-[78%] xl:border-l-0">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-ink px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <span className="meta text-ink-soft">Supporting evidence · {d.source}</span>
            <h2 className="display truncate text-[30px] sm:text-[38px]">{d.title}</h2>
            {d.description && <p className="text-[13px] text-ink-soft">{d.description}</p>}
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={exportCSV} className="inline-flex h-9 items-center gap-2 border border-ink bg-ink px-3 font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-cream hover:bg-electric hover:border-electric">
              <Download size={14} /> CSV · {num(rows.length)}
            </button>
            <button type="button" onClick={() => actions.closeDrawer()} className="inline-flex h-9 w-9 items-center justify-center border border-ink hover:bg-ink hover:text-cream" aria-label="Close">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-b border-ink px-4 py-2 sm:px-6">
          <label className="flex min-w-[220px] flex-1 items-center gap-2 border border-ink bg-cream px-2">
            <Search size={14} />
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setLimit(PAGE);
              }}
              placeholder="Search order, customer, city, product, coupon, flag…"
              className="h-8 w-full bg-transparent text-[13px] outline-none placeholder:text-ink-soft/70"
              aria-label="Search within evidence"
            />
          </label>
          <label className="meta flex items-center gap-2">
            Sort
            <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="h-8 border border-ink bg-cream px-1 font-mono text-[11px] uppercase">
              {d.orderIds && <option value="given">As listed</option>}
              <option value="profit">Profit, worst first</option>
              <option value="date">Newest first</option>
              <option value="discount">Deepest discount</option>
              <option value="net">Largest revenue</option>
            </select>
          </label>
          <span className="meta flex flex-wrap gap-x-4 text-ink-soft tnum">
            <span>{num(sum.orders)} orders</span>
            <span>{inrCompact(sum.net)} revenue</span>
            <span className={sum.profit < 0 ? "text-signal" : ""}>{inrCompact(sum.profit)} profit</span>
            <span>{pct(sum.margin)} margin</span>
          </span>
        </div>

        <div className="min-h-0 flex-1 overflow-auto scrollbar-thin">
          <table className="w-full min-w-[860px] border-collapse text-left">
            <thead className="sticky top-0 z-10 bg-cream-deep">
              <tr className="border-b border-ink">
                {["Order", "Date", "Customer", "Channel", "Code", "Items", "Revenue", "Profit", "Margin", "Flags"].map((h, i) => (
                  <th key={h} className={`meta px-3 py-2 font-normal ${i >= 6 && i <= 8 ? "text-right" : ""}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="font-mono text-[11.5px] tnum">
              {rows.slice(0, limit).map((t) => {
                const c = customerById(t.customerId);
                const fl = flagsFor(t);
                const isSel = selected === t.id;
                return (
                  <tr
                    key={t.id}
                    onClick={() => actions.select({ kind: "order", id: t.id })}
                    className={`cursor-pointer border-b border-ink/10 ${isSel ? "bg-electric/15" : "hover:bg-ink/5"}`}
                  >
                    <td className={`px-3 py-2 font-bold whitespace-nowrap ${isSel ? "text-electric" : ""}`}>{t.id}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{dateShort(t.date)}</td>
                    <td className="max-w-[170px] truncate px-3 py-2 font-sans text-[12.5px] whitespace-nowrap">
                      {c.name} <span className="text-ink-soft">· {c.city}</span>
                    </td>
                    <td className="px-3 py-2">{channelById(t.channel).short}</td>
                    <td className={`px-3 py-2 whitespace-nowrap ${t.discountPct >= 35 ? "font-bold text-signal" : ""}`}>{t.coupon ? `${t.coupon}` : "—"}</td>
                    <td className="max-w-[220px] truncate px-3 py-2 font-sans text-[12.5px] whitespace-nowrap">{t.lines.map((l) => `${l.qty}× ${productById(l.productId).name}`).join(", ")}</td>
                    <td className="px-3 py-2 text-right">{inr(t.net)}</td>
                    <td className={`px-3 py-2 text-right font-bold ${t.profit < 0 ? "text-signal" : ""}`}>{inr(t.profit)}</td>
                    <td className="px-3 py-2 text-right">{pct(t.net ? t.profit / t.net : 0, 0)}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className="flex gap-1">
                        {fl.map((f) => (
                          <span key={f} title={FLAGS[f].description} className="border border-signal px-1 text-[9px] whitespace-nowrap text-signal uppercase">
                            {FLAGS[f].label}
                          </span>
                        ))}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {rows.length === 0 && <p className="meta px-6 py-10 text-ink-soft">No orders match “{q}”.</p>}
          {rows.length > limit && (
            <div className="flex justify-center p-4">
              <button type="button" onClick={() => setLimit((l) => l + PAGE * 2)} className="border border-ink px-4 py-2 font-mono text-[11px] uppercase hover:bg-ink hover:text-cream">
                Show more · {num(rows.length - limit)} remaining
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
