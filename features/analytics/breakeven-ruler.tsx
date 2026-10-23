import { pct } from "@/lib/analytics/format";
import type { LedgerRow } from "./product-ledger";

/**
 * One ruler per product, 0–60% off. The red tick is where a single-unit
 * website order stops making money; the blue marker is the average discount
 * it actually sold at; the blue bar is the deepest code it was sold under.
 */
export function BreakEvenRulers({ rows, maxDiscount, selected, onSelect }: { rows: (LedgerRow & { deepest: number })[]; maxDiscount?: number; selected?: string | null; onSelect?: (id: string) => void }) {
  const MAX = maxDiscount ?? 0.6;
  const X = (v: number) => `${(Math.min(MAX, Math.max(0, v)) / MAX) * 100}%`;
  const sorted = [...rows].sort((a, b) => a.breakEven - b.breakEven);
  return (
    <div>
      <div className="relative mb-1 ml-[34%] h-4">
        {[0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6].map((v) => (
          <span key={v} className="meta absolute -translate-x-1/2 text-ink-soft" style={{ left: X(v) }}>
            {Math.round(v * 100)}
          </span>
        ))}
      </div>
      {sorted.map((r) => {
        const danger = r.deepest >= r.breakEven;
        const isSel = selected === r.m.product.id;
        return (
          <button
            key={r.m.product.id}
            type="button"
            onClick={() => onSelect?.(r.m.product.id)}
            className={`grid w-full grid-cols-[34%_1fr] items-center py-1 text-left ${isSel ? "bg-electric/10" : "hover:bg-ink/5"}`}
            title={`${r.m.product.name}: break-even ${pct(r.breakEven, 0)} off, average ${pct(r.m.avgDiscount, 0)}, deepest ${pct(r.deepest, 0)}`}
          >
            <span className={`truncate pr-2 text-[12.5px] ${danger ? "text-signal" : ""} ${isSel ? "font-semibold" : ""}`}>{r.m.product.name.split(",")[0]}</span>
            <span className="relative h-5 border-x border-ink/40">
              <span className="absolute top-1/2 h-px w-full bg-ink/30" />
              {[0.1, 0.2, 0.3, 0.4, 0.5].map((v) => (
                <span key={v} className="absolute top-1/2 h-2 w-px -translate-y-1/2 bg-ink/30" style={{ left: X(v) }} />
              ))}
              <span className="absolute top-1/2 h-1.5 -translate-y-1/2 bg-electric/30" style={{ left: 0, width: X(r.deepest) }} />
              <span className="absolute top-1/2 h-3 w-1 -translate-x-1/2 -translate-y-1/2 bg-electric" style={{ left: X(r.m.avgDiscount) }} />
              <span className="absolute top-0 h-5 w-[3px] -translate-x-1/2 bg-signal" style={{ left: X(r.breakEven) }} />
              <span className="absolute -top-0.5 ml-1.5 font-mono text-[9.5px] font-bold text-signal" style={{ left: X(r.breakEven) }}>
                {pct(r.breakEven, 0)}
              </span>
            </span>
          </button>
        );
      })}
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
        <li className="meta flex items-center gap-1.5"><span className="inline-block h-3 w-[3px] bg-signal" /> Break-even discount</li>
        <li className="meta flex items-center gap-1.5"><span className="inline-block h-3 w-1 bg-electric" /> Average discount sold at</li>
        <li className="meta flex items-center gap-1.5"><span className="inline-block h-1.5 w-4 bg-electric/30" /> Deepest code used</li>
      </ul>
    </div>
  );
}
