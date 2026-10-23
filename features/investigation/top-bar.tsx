"use client";

import Link from "next/link";
import { CalendarRange, Download, MoreHorizontal, RotateCcw, Search, Settings2, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Logo } from "@/components/brand";
import { allMonths, getDataset } from "@/lib/analytics/dataset";
import { downloadCSV, transactionsToCSV } from "@/lib/analytics/export";
import { monthShort, num, rangeLabel } from "@/lib/analytics/format";
import { filterRange } from "@/lib/analytics/periods";
import { flagged } from "@/lib/analytics/suspicious";
import type { MonthKey } from "@/lib/analytics/types";
import { caseStory } from "@/features/analytics/series";
import { CASE_001 } from "./case";
import { actions, useWorkspace } from "./store";

type Menu = "range" | "export" | "reset" | "more" | null;

export function TopBar() {
  const ws = useWorkspace();
  const [menu, setMenu] = useState<Menu>(null);
  const [q, setQ] = useState("");
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const close = (e: PointerEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setMenu(null);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setMenu(null);
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", esc);
    };
  }, [menu]);

  const findings = ws.threads.reduce((s, t) => s + t.entries.length, 0);
  const status = findings ? `Active · ${findings} finding${findings === 1 ? "" : "s"}` : "Open · awaiting questions";

  const search = (e: React.FormEvent) => {
    e.preventDefault();
    if (!q.trim()) return;
    actions.openDrawer({ title: `Search: “${q.trim()}”`, description: `Every order in ${rangeLabel(ws.range.from, ws.range.to)} matching your search.`, query: q.trim(), source: "Evidence search" });
    setMenu(null);
  };

  const toggle = (m: Menu) => setMenu((cur) => (cur === m ? null : m));

  return (
    <div ref={root} className="relative z-40 flex h-12 shrink-0 items-center gap-2 border-b border-ink bg-cream px-3 sm:gap-3 sm:px-4">
      <Link href="/" className="shrink-0 text-[15px]" aria-label="Margin Club home">
        <Logo compact />
      </Link>
      <span className="h-6 w-px bg-ink/40" />
      <div className="min-w-0 shrink">
        <span className="meta block truncate font-bold">{CASE_001.code} · {CASE_001.title}</span>
        <span className="meta hidden items-center gap-1.5 text-ink-soft sm:flex">
          <span className={`inline-block h-1.5 w-1.5 ${findings ? "bg-electric" : "animate-blink bg-signal"}`} />
          {status}
        </span>
      </div>

      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        <BarButton label={`Data range: ${rangeLabel(ws.range.from, ws.range.to)}`} onClick={() => toggle("range")} active={menu === "range"}>
          <CalendarRange size={14} />
          <span className="hidden font-mono text-[11px] uppercase md:inline">{rangeLabel(ws.range.from, ws.range.to)}</span>
        </BarButton>

        <form onSubmit={search} className="hidden items-center border border-ink lg:flex" role="search">
          <Search size={14} className="ml-2 shrink-0" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search evidence…" className="h-8 w-36 bg-transparent px-2 text-[12.5px] outline-none xl:w-48" aria-label="Search evidence" />
        </form>

        <span className="hidden items-center gap-1.5 lg:flex">
          <BarButton label="Export evidence (CSV)" onClick={() => toggle("export")} active={menu === "export"}>
            <Download size={14} />
            <span className="hidden font-mono text-[11px] uppercase xl:inline">Export</span>
          </BarButton>
          <BarButton label="Reset case" onClick={() => toggle("reset")} active={menu === "reset"}>
            <RotateCcw size={14} />
          </BarButton>
          <BarButton label="Engine settings" onClick={() => actions.openSettings(true)}>
            <Settings2 size={14} />
          </BarButton>
        </span>
        <span className="lg:hidden">
          <BarButton label="More" onClick={() => toggle("more")} active={menu === "more"}>
            <MoreHorizontal size={16} />
          </BarButton>
        </span>
        <Link href="/" className="inline-flex h-8 items-center gap-1.5 border border-ink bg-ink px-2 text-cream transition-colors hover:bg-signal hover:border-signal" title="Close investigation">
          <X size={14} />
          <span className="hidden font-mono text-[11px] uppercase sm:inline">Close</span>
        </Link>
      </div>

      {menu === "range" && (
        <Popover className="right-2 sm:right-auto sm:left-1/3">
          <RangePicker onDone={() => setMenu(null)} />
        </Popover>
      )}
      {menu === "export" && (
        <Popover className="right-24">
          <ExportMenu onDone={() => setMenu(null)} />
        </Popover>
      )}
      {menu === "reset" && (
        <Popover className="right-16">
          <ResetConfirm onDone={() => setMenu(null)} />
        </Popover>
      )}
      {menu === "more" && (
        <Popover className="right-2 w-[min(92vw,360px)]">
          <form onSubmit={search} className="flex items-center border border-ink" role="search">
            <Search size={14} className="ml-2" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search evidence…" className="h-9 w-full bg-transparent px-2 text-[14px] outline-none" aria-label="Search evidence" />
            <button type="submit" className="h-9 bg-ink px-3 font-mono text-[11px] uppercase text-cream">Go</button>
          </form>
          <div className="mt-4 border-t border-ink pt-3">
            <ExportMenu onDone={() => setMenu(null)} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => { actions.openSettings(true); setMenu(null); }} className="flex items-center justify-center gap-2 border border-ink py-2 font-mono text-[11px] uppercase">
              <Settings2 size={14} /> Engine
            </button>
            <button type="button" onClick={() => setMenu("reset")} className="flex items-center justify-center gap-2 border border-ink py-2 font-mono text-[11px] uppercase">
              <RotateCcw size={14} /> Reset case
            </button>
          </div>
        </Popover>
      )}
    </div>
  );
}

function BarButton({ label, onClick, children, active }: { label: string; onClick: () => void; children: ReactNode; active?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-expanded={active}
      className={`inline-flex h-8 min-w-8 items-center justify-center gap-1.5 border border-ink px-2 transition-colors ${active ? "bg-ink text-cream" : "hover:bg-ink hover:text-cream"}`}
    >
      {children}
    </button>
  );
}

function Popover({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`absolute top-[calc(100%+6px)] z-50 animate-rise border-2 border-ink bg-cream p-4 shadow-[6px_6px_0_#161616] [animation-duration:200ms] ${className}`}>{children}</div>;
}

function RangePicker({ onDone }: { onDone: () => void }) {
  const ws = useWorkspace();
  const months = allMonths();
  const [anchor, setAnchor] = useState<MonthKey | null>(null);
  const pick = (m: MonthKey) => {
    if (!anchor) {
      setAnchor(m);
      actions.setRange({ from: m, to: m });
      return;
    }
    actions.setRange(anchor <= m ? { from: anchor, to: m } : { from: m, to: anchor });
    setAnchor(null);
    onDone();
  };
  // The "discount era" starts in the first month where 25%+ codes hit a quarter of orders.
  const era = caseStory().eraStart;
  const eraIdx = era ? months.indexOf(era) : -1;
  const presets: [string, MonthKey, MonthKey][] = [
    ["All months", months[0], months[months.length - 1]],
    ...(eraIdx > 0
      ? ([
          ["Before the sales", months[0], months[eraIdx - 1]],
          ["Discount era", months[eraIdx], months[months.length - 1]],
        ] as [string, MonthKey, MonthKey][])
      : []),
    ["Last 3 months", months[months.length - 3], months[months.length - 1]],
  ];
  return (
    <div className="w-[min(88vw,360px)]">
      <span className="meta text-ink-soft">Data range · {anchor ? "now click the last month" : "click the first month"}</span>
      <div className="mt-3 grid grid-cols-4 gap-1">
        {months.map((m) => {
          const inR = m >= ws.range.from && m <= ws.range.to;
          return (
            <button
              key={m}
              type="button"
              onClick={() => pick(m)}
              className={`border py-2 font-mono text-[12px] uppercase transition-colors ${m === anchor ? "border-signal bg-signal text-cream" : inR ? "border-electric bg-electric text-cream" : "border-ink hover:bg-ink hover:text-cream"}`}
            >
              {monthShort(m)}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {presets.map(([label, from, to]) => (
          <button key={label} type="button" onClick={() => { actions.setRange({ from, to }); setAnchor(null); onDone(); }} className="border border-ink px-2 py-1 font-mono text-[10.5px] uppercase hover:bg-ink hover:text-cream">
            {label}
          </button>
        ))}
      </div>
      <p className="meta mt-3 text-ink-soft normal-case tracking-normal">Every exhibit and every investigator answer uses this range.</p>
    </div>
  );
}

function ExportMenu({ onDone }: { onDone: () => void }) {
  const ws = useWorkspace();
  const txs = filterRange(getDataset().transactions, ws.range);
  const flags = flagged(txs).map((f) => f.tx);
  const label = rangeLabel(ws.range.from, ws.range.to).toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const go = (name: string, list: typeof txs) => {
    downloadCSV(`margin-club_case-001_${name}_${label}.csv`, transactionsToCSV(list));
    onDone();
  };
  return (
    <div className="w-[min(88vw,320px)]">
      <span className="meta text-ink-soft">Export evidence as CSV</span>
      <div className="mt-2 flex flex-col gap-1.5">
        <ExportRow onClick={() => go("all-orders", txs)} title="All orders in range" count={txs.length} />
        <ExportRow onClick={() => go("flagged-orders", flags)} title="Flagged orders" count={flags.length} red />
        <ExportRow onClick={() => go("loss-making-orders", txs.filter((t) => t.profit < 0))} title="Loss-making orders" count={txs.filter((t) => t.profit < 0).length} red />
      </div>
      <p className="meta mt-2 text-ink-soft normal-case tracking-normal">Any evidence drawer can also export exactly what it shows.</p>
    </div>
  );
}

function ExportRow({ onClick, title, count, red = false }: { onClick: () => void; title: string; count: number; red?: boolean }) {
  return (
    <button type="button" onClick={onClick} className="flex items-center justify-between border border-ink px-3 py-2 text-left hover:bg-ink hover:text-cream">
      <span className="text-[13px]">{title}</span>
      <span className={`font-mono text-[11px] font-bold tnum ${red ? "text-signal" : ""}`}>{num(count)} ↓</span>
    </button>
  );
}

function ResetConfirm({ onDone }: { onDone: () => void }) {
  return (
    <div className="w-[min(88vw,300px)]">
      <span className="meta text-signal">Reset case #001?</span>
      <p className="mt-2 text-[13.5px] leading-snug">Clears the date range, selections, comparisons and your investigation history in this browser. Engine settings are kept.</p>
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={() => { actions.resetCase(); onDone(); }} className="flex-1 border border-signal bg-signal py-2 font-mono text-[11px] font-bold uppercase text-cream hover:bg-ink hover:border-ink">
          Reset
        </button>
        <button type="button" onClick={onDone} className="flex-1 border border-ink py-2 font-mono text-[11px] font-bold uppercase hover:bg-ink hover:text-cream">
          Cancel
        </button>
      </div>
    </div>
  );
}
