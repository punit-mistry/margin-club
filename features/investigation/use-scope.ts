"use client";

import { useMemo } from "react";
import { getDataset } from "@/lib/analytics/dataset";
import { byMonth, totals } from "@/lib/analytics/metrics";
import { filterRange, monthsInRange, openingClosing } from "@/lib/analytics/periods";
import { rangeLabel } from "@/lib/analytics/format";
import type { MonthRange } from "@/lib/analytics/types";

/** Everything a canvas needs for the current date range, memoised on the range. */
export function useScope(range: MonthRange) {
  return useMemo(() => {
    const txs = filterRange(getDataset().transactions, range);
    const months = monthsInRange(range);
    const monthly = byMonth(txs, months);
    const { opening, closing } = openingClosing(range);
    const oTx = txs.filter((t) => opening.includes(t.month));
    const cTx = txs.filter((t) => closing.includes(t.month));
    return {
      range,
      txs,
      months,
      monthly,
      all: totals(txs),
      opening,
      closing,
      oTx,
      cTx,
      o: totals(oTx),
      c: totals(cTx),
      label: rangeLabel(range.from, range.to),
      oLabel: rangeLabel(opening[0], opening[opening.length - 1]),
      cLabel: rangeLabel(closing[0], closing[closing.length - 1]),
      single: months.length < 2,
    };
  }, [range]);
}

export type Scope = ReturnType<typeof useScope>;
