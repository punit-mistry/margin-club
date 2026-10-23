"use client";

import { useMemo, useState } from "react";
import { Note } from "@/components/brand";
import { OrderScatter } from "@/features/analytics/order-scatter";
import { getDataset } from "@/lib/analytics/dataset";
import { inr, num, pct } from "@/lib/analytics/format";
import { totals } from "@/lib/analytics/metrics";

const STOPS = [0, 10, 15, 20, 25, 30, 35, 40];

export function OrderField() {
  const orders = getDataset().transactions;
  const all = useMemo(() => totals(orders), [orders]);
  const [i, setI] = useState(5); // 30%
  const threshold = STOPS[i];
  const sub = useMemo(() => totals(orders.filter((t) => t.discountPct >= threshold)), [orders, threshold]);
  const revShare = sub.net / all.net;
  const profitShare = sub.profit / all.profit;

  return (
    <section id="evidence" className="scroll-mt-14 border-b border-ink bg-paper">
      <div className="flex items-center justify-between border-b border-ink px-4 py-3 sm:px-8">
        <span className="meta">05 — Exhibit B, interactive</span>
        <span className="meta text-ink-soft">{num(orders.length)} orders · Feb–Sep 2026</span>
      </div>
      <div className="grid lg:grid-cols-12">
        <div className="px-4 pt-8 pb-6 sm:px-8 lg:col-span-4 lg:border-r lg:border-ink lg:pb-10">
          <h2 className="display text-[16vw] lg:text-[6.6vw]">
            Every dot
            <br />
            is an <span className="text-electric">order.</span>
          </h2>
          <p className="mt-5 max-w-[36ch] text-[16px] leading-snug">
            Left to right: how much discount it carried. Bottom to top: how much of its revenue it kept. Drag the threshold and watch what the
            discounted orders are really worth.
          </p>

          <label className="mt-8 block">
            <span className="meta flex justify-between">
              <span>Orders discounted at least</span>
              <span className="text-electric">{threshold}%</span>
            </span>
            <input
              type="range"
              min={0}
              max={STOPS.length - 1}
              step={1}
              value={i}
              onChange={(e) => setI(Number(e.target.value))}
              className="mt-3 w-full accent-[#244BFF]"
              aria-valuetext={`${threshold}% or more`}
            />
            <span className="meta mt-1 flex justify-between text-ink-soft">
              {STOPS.map((s) => (
                <span key={s}>{s}</span>
              ))}
            </span>
          </label>

          <dl className="mt-8 grid grid-cols-2 gap-px border border-ink bg-ink">
            <div className="bg-cream p-3">
              <dt className="meta text-ink-soft">Orders</dt>
              <dd className="display mt-1 text-[38px] tnum">{num(sub.orders)}</dd>
            </div>
            <div className="bg-cream p-3">
              <dt className="meta text-ink-soft">Lost money</dt>
              <dd className="display mt-1 text-[38px] text-signal tnum">{num(sub.lossOrders)}</dd>
            </div>
            <div className="bg-cream p-3">
              <dt className="meta text-ink-soft">Share of revenue</dt>
              <dd className="display mt-1 text-[38px] text-electric tnum">{pct(revShare, 0)}</dd>
            </div>
            <div className="bg-cream p-3">
              <dt className="meta text-ink-soft">Share of profit</dt>
              <dd className="display mt-1 text-[38px] text-signal tnum">{pct(profitShare, 0)}</dd>
            </div>
          </dl>
          <p className="mt-4 text-[15px] leading-snug">
            {threshold === 0 ? (
              <>All orders: {inr(all.net)} of revenue, {inr(all.profit)} of contribution profit.</>
            ) : (
              <>
                Orders at {threshold}%+ off brought <strong className="marker">{pct(revShare, 0)}</strong> of revenue but only{" "}
                <strong className="marker-red text-signal">{pct(profitShare, 0)}</strong> of profit.
              </>
            )}
          </p>
        </div>
        <div className="relative px-2 py-6 sm:px-6 lg:col-span-8">
          <OrderScatter orders={orders} threshold={threshold} className="h-[420px] sm:h-[520px] lg:h-[600px]" />
          <Note className="absolute right-8 bottom-[22%] hidden text-[24px] sm:block" rotate={-5}>
            red = the order lost money
          </Note>
        </div>
      </div>
    </section>
  );
}
