"use client";

import { useMemo, useState } from "react";
import { CostStack, StackLegend } from "@/features/analytics/cost-stack";
import { OrderScatter } from "@/features/analytics/order-scatter";
import { ProductQuadrant } from "@/features/analytics/product-quadrant";
import { RevenueProfitChart } from "@/features/analytics/revenue-profit-chart";
import { getDataset } from "@/lib/analytics/dataset";
import { byMonth, byProduct, totals } from "@/lib/analytics/metrics";
import { fullRange, monthsInRange, openingClosing } from "@/lib/analytics/periods";
import { rangeLabel } from "@/lib/analytics/format";
import type { MonthKey } from "@/lib/analytics/types";

/** Live product components rendered with the case data — not screenshots. */
export function ProductPreviews() {
  const data = useMemo(() => {
    const ds = getDataset();
    const r = fullRange();
    const months = monthsInRange(r);
    const { opening, closing } = openingClosing(r);
    const oTx = ds.transactions.filter((t) => opening.includes(t.month));
    const cTx = ds.transactions.filter((t) => closing.includes(t.month));
    return {
      txs: ds.transactions,
      monthly: byMonth(ds.transactions, months),
      o: totals(oTx),
      c: totals(cTx),
      before: byProduct(oTx),
      after: byProduct(cTx),
      blended: totals(cTx).margin,
      oLabel: rangeLabel(opening[0], opening[opening.length - 1]),
      cLabel: rangeLabel(closing[0], closing[closing.length - 1]),
    };
  }, []);
  const [month, setMonth] = useState<MonthKey | null>(null);
  const [product, setProduct] = useState<string | null>(null);

  return (
    <div className="grid grid-cols-12 gap-6">
      <Frame n="P1" caption="Exhibit A — revenue vs. the profit that stayed. Click a month." className="col-span-12">
        <RevenueProfitChart months={data.monthly} selected={month} onSelect={(m) => setMonth(m)} suspicious={(m) => m.heavyDiscountOrders / m.orders >= 0.25} height={300} />
      </Frame>
      <Frame n="P2" caption="Exhibit B — every order as a dot (canvas, 5k+ points, hit-tested)." className="col-span-12 lg:col-span-7">
        <OrderScatter orders={data.txs} threshold={25} className="h-[340px]" />
      </Frame>
      <Frame n="P3" caption="Where every ₹100 goes, opening vs closing window." className="col-span-12 sm:col-span-6 lg:col-span-5">
        <div className="mx-auto max-w-[340px]">
          <CostStack a={data.o} b={data.c} aLabel={data.oLabel} bLabel={data.cLabel} />
        </div>
        <div className="mt-2">
          <StackLegend />
        </div>
      </Frame>
      <Frame n="P4" caption="Products drifting into the trap quadrant. Click a product." className="col-span-12 sm:col-span-6 lg:col-span-12">
        <ProductQuadrant before={data.before} after={data.after} blended={data.blended} selected={product} onSelect={setProduct} height={380} />
      </Frame>
    </div>
  );
}

function Frame({ n, caption, className = "", children }: { n: string; caption: string; className?: string; children: React.ReactNode }) {
  return (
    <figure className={`border border-ink bg-cream p-3 shadow-[6px_6px_0_#161616] sm:p-4 ${className}`}>
      {children}
      <figcaption className="mt-3 flex gap-3 border-t border-ink pt-2">
        <span className="font-mono text-[10.5px] font-bold text-signal">{n}</span>
        <span className="meta text-ink-soft normal-case tracking-[0.02em]">{caption}</span>
      </figcaption>
    </figure>
  );
}
