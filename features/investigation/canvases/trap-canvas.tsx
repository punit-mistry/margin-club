"use client";

import { useMemo, useState } from "react";
import { HandCircle } from "@/components/brand";
import { CostStack, StackLegend } from "@/features/analytics/cost-stack";
import { MarginShift } from "@/features/analytics/margin-shift";
import { OrderScatter } from "@/features/analytics/order-scatter";
import { RevenueProfitChart } from "@/features/analytics/revenue-profit-chart";
import { SuspectLedger } from "@/features/analytics/suspect-ledger";
import { change, monthShort, monthYear, num, pct } from "@/lib/analytics/format";
import { bandById, byProduct, DISCOUNT_BANDS, totals } from "@/lib/analytics/metrics";
import { flagged } from "@/lib/analytics/suspicious";
import type { DiscountBandId, MonthKey, MonthMetrics } from "@/lib/analytics/types";
import { CASE_001 } from "../case";
import { CanvasHeader } from "../canvas-header";
import { Chip, Exhibit } from "../exhibit";
import { actions, useWorkspace } from "../store";
import { useScope } from "../use-scope";

const isSuspicious = (m: MonthMetrics) => m.orders > 0 && m.heavyDiscountOrders / m.orders >= 0.25;

export function TrapCanvas() {
  const ws = useWorkspace();
  const s = useScope(ws.range);
  const mode = CASE_001.modes[0];
  const [compareArmed, setCompareArmed] = useState(false);

  const selMonth = ws.selection?.kind === "month" ? ws.selection.id : null;
  const selBand = ws.selection?.kind === "band" ? ws.selection.id : null;
  const selOrder = ws.selection?.kind === "order" ? ws.selection.id : null;
  const selProduct = ws.selection?.kind === "product" ? ws.selection.id : null;

  const flags = useMemo(() => flagged(s.txs), [s.txs]);
  const before = useMemo(() => byProduct(s.oTx), [s.oTx]);
  const after = useMemo(() => byProduct(s.cTx), [s.cTx]);

  const stack = useMemo(() => {
    if (ws.compare) {
      const [a, b] = ws.compare;
      return {
        a: totals(s.txs.filter((t) => t.month === a)),
        b: totals(s.txs.filter((t) => t.month === b)),
        aLabel: monthYear(a),
        bLabel: monthYear(b),
      };
    }
    return { a: s.o, b: s.c, aLabel: s.oLabel, bLabel: s.cLabel };
  }, [ws.compare, s]);

  const onMonth = (m: MonthKey, extend: boolean) => {
    if ((extend || compareArmed) && selMonth && selMonth !== m) {
      actions.setCompare([selMonth, m]);
      setCompareArmed(false);
      return;
    }
    actions.select({ kind: "month", id: m });
  };

  const emphasis = useMemo(() => {
    if (selBand) {
      const b = bandById(selBand);
      return (t: { discountPct: number }) => t.discountPct >= b.min && t.discountPct < b.max;
    }
    if (selMonth) return (t: { month: string }) => t.month === selMonth;
    return undefined;
  }, [selBand, selMonth]);

  const openBand = (id: DiscountBandId) => {
    const b = bandById(id);
    const list = s.txs.filter((t) => t.discountPct >= b.min && t.discountPct < b.max).sort((x, y) => x.profit - y.profit);
    actions.openDrawer({ title: `${b.label} orders · ${s.label}`, description: "Sorted by contribution profit, worst first.", orderIds: list.map((t) => t.id), source: "Exhibit B" });
  };

  const firstM = s.monthly[0];
  const lastM = s.monthly[s.monthly.length - 1];

  return (
    <div>
      <CanvasHeader mode={mode} meta={`${num(s.txs.length)} orders · ${num(flags.length)} flagged · ${s.label}`}>
        {s.single ? (
          <p>One month selected. Widen the date range to see the trend.</p>
        ) : (
          <p>
            Between {monthShort(firstM.month)} and {monthShort(lastM.month)}, monthly revenue went{" "}
            <strong className={`tnum ${lastM.net >= firstM.net ? "marker" : "marker-red text-signal"}`}>{change(firstM.net, lastM.net)}</strong> while contribution profit
            went{" "}
            <span className="relative inline-block px-1">
              <strong className={`tnum ${lastM.profit < firstM.profit ? "text-signal" : ""}`}>{change(firstM.profit, lastM.profit)}</strong>
              {lastM.profit < firstM.profit && <HandCircle className="-inset-x-2 -inset-y-1.5 h-[calc(100%+12px)] w-[calc(100%+16px)] text-signal" />}
            </span>
            . Margin slid from {pct(firstM.margin)} to {pct(lastM.margin)}.
          </p>
        )}
      </CanvasHeader>

      <div className="grid grid-cols-12 gap-x-3 gap-y-12 @2xl:gap-x-8">
        <Exhibit
          letter="A"
          title="Revenue vs. the profit that stayed"
          kicker="monthly"
          className="col-span-12"
          tone="red"
          hint="Click a month to inspect it. Shift-click (or arm “Compare”) and click a second month to compare."
          actions={
            <>
              <Chip active={compareArmed} onClick={() => setCompareArmed((v) => !v)}>
                {compareArmed ? "Pick 2nd month…" : "Compare"}
              </Chip>
              {!s.single && (
                <Chip onClick={() => actions.setCompare([s.months[0], s.months[s.months.length - 1]])}>
                  {monthShort(s.months[0])} vs {monthShort(s.months[s.months.length - 1])}
                </Chip>
              )}
              {ws.compare && <Chip onClick={() => actions.setCompare(null)}>Clear compare ×</Chip>}
            </>
          }
        >
          <RevenueProfitChart months={s.monthly} selected={selMonth} compare={ws.compare} suspicious={isSuspicious} onSelect={onMonth} />
        </Exhibit>

        <Exhibit
          letter="B"
          title="Every order, against its discount"
          kicker={`${num(s.txs.length)} dots`}
          className="col-span-12 @4xl:col-span-8"
          hint="Hover a dot to read it, click to open the order. Use the bands to isolate a discount level."
          actions={
            <>
              {DISCOUNT_BANDS.map((b) => (
                <Chip key={b.id} active={selBand === b.id} tone={b.id === "deep" ? "red" : "blue"} onClick={() => actions.select(selBand === b.id ? null : { kind: "band", id: b.id })}>
                  {b.label}
                </Chip>
              ))}
              {selBand && <Chip onClick={() => openBand(selBand)}>Open orders →</Chip>}
            </>
          }
        >
          <div className="border border-ink bg-cream-deep/40 p-2">
            <OrderScatter
              orders={s.txs}
              threshold={25}
              emphasis={emphasis}
              selectedId={selOrder}
              onSelect={(t) => actions.select({ kind: "order", id: t.id })}
              className="h-[340px] sm:h-[400px]"
            />
          </div>
        </Exhibit>

        <Exhibit
          letter="C"
          title="Where every ₹100 goes"
          kicker={ws.compare ? "compare" : "open vs close"}
          className="col-span-12 @xl:col-span-8 @xl:col-start-3 @4xl:col-span-4 @4xl:col-start-auto @4xl:mt-20"
          hint={ws.compare ? "Showing the two compared months." : "Opening window vs closing window. Compare two months in Exhibit A to swap."}
        >
          {s.single && !ws.compare ? (
            <p className="meta py-8 text-ink-soft">Needs at least two months.</p>
          ) : (
            <>
              <div className="mx-auto max-w-[380px]">
                <CostStack a={stack.a} b={stack.b} aLabel={stack.aLabel} bLabel={stack.bLabel} />
              </div>
              <div className="mt-3">
                <StackLegend />
              </div>
            </>
          )}
        </Exhibit>

        <Exhibit
          letter="D"
          title="Margins that moved"
          kicker={`${s.oLabel} → ${s.cLabel}`}
          className="col-span-12 @4xl:col-span-7"
          hint="Hollow = opening window, solid = closing window, thickness = revenue share. Click to inspect a product."
        >
          {s.single ? (
            <p className="meta py-8 text-ink-soft">Needs at least two months.</p>
          ) : (
            <MarginShift before={before} after={after} selected={selProduct} onSelect={(id) => actions.select({ kind: "product", id })} />
          )}
        </Exhibit>

        <Exhibit
          letter="E"
          title="The suspects"
          kicker="highest-scoring orders"
          tone="red"
          className="col-span-12 @4xl:col-span-5 @4xl:-mt-6"
          actions={
            <Chip
              tone="red"
              onClick={() =>
                actions.openDrawer({
                  title: `Flagged orders · ${s.label}`,
                  description: "Orders that broke at least one profitability rule, highest score first.",
                  orderIds: flags.map((f) => f.tx.id),
                  source: "Exhibit E",
                })
              }
            >
              All {num(flags.length)} →
            </Chip>
          }
        >
          <SuspectLedger items={flags.slice(0, 7)} selected={selOrder} onSelect={(id) => actions.select({ kind: "order", id })} />
        </Exhibit>
      </div>
    </div>
  );
}
