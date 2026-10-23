"use client";

import { useMemo } from "react";
import { AcquisitionColumns, CohortGrid, RepeatBars, ReturningSplit } from "@/features/analytics/customer-charts";
import { activityByMonth, cohorts, repeatBySegment, segmentOf, type AcquisitionSegment } from "@/lib/analytics/customers";
import { monthShort, num, pct } from "@/lib/analytics/format";
import { CASE_001 } from "../case";
import { CanvasHeader } from "../canvas-header";
import { Chip, Exhibit } from "../exhibit";
import { actions, useWorkspace } from "../store";
import { useScope } from "../use-scope";

export function CustomersCanvas() {
  const ws = useWorkspace();
  const s = useScope(ws.range);
  const mode = CASE_001.modes[2];
  const selCohort = ws.selection?.kind === "cohort" ? ws.selection.id : null;

  const data = useMemo(() => {
    const acquisition = s.months.map((month) => {
      const counts: Record<AcquisitionSegment, number> = { full: 0, welcome: 0, mid: 0, deep: 0 };
      for (const t of s.txs) if (t.month === month && t.customerOrderNo === 1) counts[segmentOf(t.discountPct)]++;
      return { month, counts };
    });
    const repeat = repeatBySegment(s.range, 60);
    const rows = cohorts(s.range);
    const returning = activityByMonth(s.txs, s.months).map((a) => ({ month: a.month, orders: a.returningOrders, discounted: a.returningDiscounted }));
    return { acquisition, repeat, rows, returning };
  }, [s]);

  const { full, deep } = data.repeat;
  const enough = full.eligible >= 30 && deep.eligible >= 30;

  return (
    <div>
      <CanvasHeader mode={mode} meta={`${num(data.rows.reduce((a, r) => a + r.size, 0))} new customers · ${s.label}`}>
        {enough ? (
          <p>
            Customers who paid full price on their first order came back within 60 days <strong className="marker tnum">{pct(full.rate)}</strong> of the time. Those
            who arrived on a 25%+ code: <strong className="marker-red tnum text-signal">{pct(deep.rate)}</strong>. The discount bought a customer once.
          </p>
        ) : (
          <p>Too few customers in this range have 60 days of history to compare repeat rates. Widen the range to include earlier months.</p>
        )}
      </CanvasHeader>

      <div className="grid grid-cols-12 gap-x-3 gap-y-12 @2xl:gap-x-8">
        <Exhibit
          letter="A"
          title="Who you acquired"
          kicker="new customers by first-order discount"
          className="col-span-12 @4xl:col-span-7"
          tone="red"
          hint="Click a month to open its cohort."
        >
          <AcquisitionColumns rows={data.acquisition} selected={selCohort} onSelect={(m) => actions.select({ kind: "cohort", id: m })} />
        </Exhibit>

        <Exhibit
          letter="B"
          title="Did they come back?"
          kicker="60-day repeat rate"
          className="col-span-12 @4xl:col-span-5 @4xl:mt-16"
          hint="Only customers with 60+ days of history are counted, so recent months don’t look artificially bad."
          actions={
            deep.customerIds.length + full.customerIds.length > 0 ? (
              <Chip
                onClick={() =>
                  actions.openDrawer({
                    title: "First orders · 25%+ off",
                    description: "First purchases made on deep codes in this range.",
                    orderIds: s.txs.filter((t) => t.customerOrderNo === 1 && t.discountPct >= 25).map((t) => t.id),
                    source: "Exhibit B · Customers",
                  })
                }
              >
                Deep-code first orders →
              </Chip>
            ) : null
          }
        >
          <RepeatBars stats={data.repeat} />
        </Exhibit>

        <Exhibit letter="C" title="Cohorts, month by month" kicker="share ordering again in month +k" className="col-span-12 @4xl:col-span-7" hint="Hatched cells are in the future for that cohort — not zero.">
          <CohortGrid rows={data.rows} selected={selCohort} onSelect={(m) => actions.select({ kind: "cohort", id: m })} />
        </Exhibit>

        <Exhibit
          letter="D"
          title="Loyal, but waiting for the sale"
          kicker="returning-customer orders"
          className="col-span-12 @4xl:col-span-5 @4xl:-mt-10"
          hint={
            data.returning.length > 1
              ? `${monthShort(data.returning[0].month)}: ${pct(data.returning[0].orders ? data.returning[0].discounted / data.returning[0].orders : 0, 0)} of returning orders used a code. ${monthShort(data.returning[data.returning.length - 1].month)}: ${pct(data.returning[data.returning.length - 1].orders ? data.returning[data.returning.length - 1].discounted / data.returning[data.returning.length - 1].orders : 0, 0)}.`
              : undefined
          }
          actions={
            <Chip
              onClick={() =>
                actions.openDrawer({
                  title: "Returning customers using codes",
                  description: "Repeat orders that carried a discount.",
                  orderIds: s.txs.filter((t) => t.customerOrderNo > 1 && t.discountPct > 0).map((t) => t.id),
                  source: "Exhibit D · Customers",
                })
              }
            >
              Open orders →
            </Chip>
          }
        >
          <ReturningSplit rows={data.returning} />
        </Exhibit>
      </div>
    </div>
  );
}
