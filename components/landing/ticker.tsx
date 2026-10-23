import { caseHeadline } from "@/features/analytics/series";
import { channelById, productById } from "@/lib/analytics/dataset";
import { dateShort, inr } from "@/lib/analytics/format";

/** A wire-service style strip of real flagged orders from the case file. */
export function EvidenceTicker() {
  const { worst } = caseHeadline();
  const items = worst.map((t) => ({
    id: t.id,
    text: `${dateShort(t.date)} · ${channelById(t.channel).short} · ${t.coupon ?? "FULL PRICE"} · ${productById(t.lines[0].productId).name}`,
    profit: inr(t.profit),
  }));
  const row = (
    <div className="flex shrink-0 items-center">
      {items.map((it) => (
        <span key={it.id} className="flex items-center gap-3 px-6 font-mono text-[12px] tracking-[0.06em] uppercase whitespace-nowrap">
          <span className="text-paper">{it.id}</span>
          <span className="text-cream/80">{it.text}</span>
          <span className="font-bold text-signal tnum">{it.profit}</span>
          <span className="ml-3 inline-block h-1.5 w-1.5 rotate-45 bg-cream/40" />
        </span>
      ))}
    </div>
  );
  return (
    <div className="relative flex overflow-hidden border-b border-ink bg-ink py-3 text-cream" aria-label="Loss-making orders from the case file">
      <span className="meta absolute top-0 left-0 z-10 flex h-full items-center bg-signal px-3 text-cream">Live evidence</span>
      <div className="flex animate-marquee pl-32 motion-reduce:animate-none">
        {row}
        {row}
      </div>
    </div>
  );
}
