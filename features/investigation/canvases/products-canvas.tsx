"use client";

import { useMemo } from "react";
import { BreakEvenRulers } from "@/features/analytics/breakeven-ruler";
import { ProductLedger } from "@/features/analytics/product-ledger";
import { ProductQuadrant } from "@/features/analytics/product-quadrant";
import { channelById } from "@/lib/analytics/dataset";
import { pct } from "@/lib/analytics/format";
import { breakEvenDiscount, byProduct, productMonthly } from "@/lib/analytics/metrics";
import { CASE_001 } from "../case";
import { CanvasHeader } from "../canvas-header";
import { Chip, Exhibit } from "../exhibit";
import { actions, useWorkspace } from "../store";
import { useScope } from "../use-scope";

export function ProductsCanvas() {
  const ws = useWorkspace();
  const s = useScope(ws.range);
  const mode = CASE_001.modes[1];
  const selProduct = ws.selection?.kind === "product" ? ws.selection.id : null;
  const select = (id: string) => actions.select({ kind: "product", id });

  const data = useMemo(() => {
    const now = byProduct(s.single ? s.txs : s.cTx);
    const before = s.single ? null : byProduct(s.oTx);
    const whole = byProduct(s.txs);
    const series = productMonthly(s.txs, s.months);
    const web = channelById("website");
    const rows = whole.map((m) => {
      const deepest = s.txs.reduce((d, t) => (t.discountPct / 100 > d && t.lines.some((l) => l.productId === m.product.id) ? t.discountPct / 100 : d), 0);
      return { m, series: series.get(m.product.id)!, breakEven: breakEvenDiscount(m.product, web), deepest };
    });
    const blended = (s.single ? s.all : s.c).margin;
    const trap = now.filter((p) => p.revenueShare > 1 / now.length && p.margin < blended).sort((a, b) => b.revenueShare - a.revenueShare);
    return { now, before, rows, blended, trap };
  }, [s]);

  const overSold = data.rows.filter((r) => r.deepest >= r.breakEven);
  const lead = data.trap[0];

  return (
    <div>
      <CanvasHeader mode={mode} meta={`${data.now.length} SKUs · ${s.single ? s.label : s.cLabel}`}>
        {lead ? (
          <p>
            In {s.single ? s.label : s.cLabel}, <strong>{data.trap.map((t) => t.product.name).join(" and ")}</strong> sat in the trap: big sellers below
            the blended margin. {lead.product.name} alone was <strong className="marker tnum">{pct(lead.revenueShare)}</strong> of revenue at a{" "}
            <strong className="marker-red tnum text-signal">{pct(lead.margin)}</strong> margin.
          </p>
        ) : (
          <p>No product sits in the trap quadrant for this range.</p>
        )}
      </CanvasHeader>

      <div className="grid grid-cols-12 gap-x-3 gap-y-12 @2xl:gap-x-8">
        <Exhibit
          letter="A"
          title="The drift into the trap"
          kicker={s.single ? s.label : `${s.oLabel} → ${s.cLabel}`}
          className="col-span-12 @4xl:col-span-8"
          tone="red"
          hint="Each dot is a product in the closing window; the dotted trail shows where it sat in the opening window. Size = units."
        >
          <div className="border border-ink p-2">
            <ProductQuadrant before={data.before} after={data.now} blended={data.blended} selected={selProduct} onSelect={select} />
          </div>
        </Exhibit>

        <Exhibit
          letter="B"
          title="Break-even discounts"
          kicker="single unit · website"
          className="col-span-12 @4xl:col-span-4 @4xl:mt-24"
          hint="Where the red tick sits left of the blue bar, a code pushed that product below break-even."
          actions={
            overSold.length > 0 ? (
              <Chip
                tone="red"
                onClick={() =>
                  actions.openDrawer({
                    title: "Orders below break-even discount",
                    description: `Orders where ${overSold.map((r) => r.m.product.name.split(",")[0]).join(", ")} sold past break-even.`,
                    orderIds: s.txs
                      .filter((t) => t.lines.some((l) => overSold.some((r) => r.m.product.id === l.productId && t.discountPct / 100 >= r.breakEven)))
                      .sort((a, b) => a.profit - b.profit)
                      .map((t) => t.id),
                    source: "Exhibit B · Products",
                  })
                }
              >
                Open orders →
              </Chip>
            ) : null
          }
        >
          <BreakEvenRulers rows={data.rows} selected={selProduct} onSelect={select} />
        </Exhibit>

        <Exhibit letter="C" title="The product ledger" kicker={`${s.label} · sortable`} className="col-span-12" hint="Headroom = break-even discount − average discount. Under 15 points is a warning.">
          <ProductLedger rows={data.rows} selected={selProduct} onSelect={select} />
        </Exhibit>
      </div>
    </div>
  );
}
