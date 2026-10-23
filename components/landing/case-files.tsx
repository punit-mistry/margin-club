import Link from "next/link";
import { caseHeadline } from "@/features/analytics/series";
import { repeatBySegment } from "@/lib/analytics/customers";
import { allMonths, getDataset } from "@/lib/analytics/dataset";
import { num, pct } from "@/lib/analytics/format";
import { byChannel, byProduct, totals } from "@/lib/analytics/metrics";
import { fullRange, openingClosing } from "@/lib/analytics/periods";

/** "Investigations" — the case files you can open, each with a real teaser figure. */
export function CaseFiles() {
  const ds = getDataset();
  const head = caseHeadline();
  const { closing } = openingClosing(fullRange());
  const closingTx = ds.transactions.filter((t) => closing.includes(t.month));
  const blended = totals(closingTx).margin;
  // Biggest margin drag: revenue share × (blended margin − product margin), as in the engine.
  const trap = byProduct(closingTx).sort((a, b) => b.revenueShare * (blended - b.margin) - a.revenueShare * (blended - a.margin))[0];
  const rep = repeatBySegment(fullRange(), 60);
  const worstCh = byChannel(ds.transactions).filter((c) => c.orders > 0).sort((a, b) => a.margin - b.margin)[0];
  const months = allMonths();

  const files = [
    {
      n: "001",
      title: "The Discount Trap",
      href: "/investigation#mode=trap",
      body: "Revenue against profit, every order against its discount, and the cost of every code you ran.",
      stat: `${num(head.lossOrders)} orders lost money`,
    },
    {
      n: "001.B",
      title: "Product Profitability",
      href: "/investigation#mode=products",
      body: "Which SKUs sell well but keep almost nothing — and the discount at which each one breaks even.",
      stat: `${trap.product.name.split(",")[0]}: ${pct(trap.revenueShare, 0)} of sales, ${pct(trap.margin, 0)} margin`,
    },
    {
      n: "001.C",
      title: "Customer Behaviour",
      href: "/investigation#mode=customers",
      body: "Who comes back, who only buys on sale, and how each month's new customers behave afterwards.",
      stat: `Repeat: ${pct(rep.full.rate, 0)} full price vs ${pct(rep.deep.rate, 0)} deep-code`,
    },
    {
      n: "001.D",
      title: "Sales Channels",
      href: "/investigation#mode=channels",
      body: "Where each ₹100 of sales really goes — discount, product cost, fees, shipping — on every channel.",
      stat: `${worstCh.channel.name}: ${pct(worstCh.margin, 0)} margin`,
    },
  ];

  return (
    <section id="investigations" className="scroll-mt-14 border-b border-ink">
      <div className="flex items-center justify-between border-b border-ink px-4 py-3 sm:px-8">
        <span className="meta">02 — Investigations</span>
        <span className="meta text-ink-soft">
          {months.length} months · {ds.products.length} products · {ds.channels.length} channels
        </span>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12">
        <div className="min-w-0 px-4 pt-8 pb-10 sm:px-8 lg:col-span-5 lg:border-r lg:border-ink">
          <h2 className="display text-[15vw] lg:text-[6.4vw]">
            A detective
            <br />
            for your <span className="serif-italic text-[0.8em] text-signal">P&amp;L.</span>
          </h2>
          <div className="mt-8 grid gap-5 text-[16px] leading-snug sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <p>
              <strong className="font-semibold">MARGIN CLUB</strong> reads a business the way an investigator reads a ledger: line by line, looking for the
              number that doesn&apos;t add up.
            </p>
            <p>
              It doesn&apos;t summarise. It shows its working. Every claim it makes links to the transactions behind it — so you can check it, export it,
              and act on it.
            </p>
          </div>
        </div>
        <ol className="min-w-0 lg:col-span-7">
          {files.map((f) => (
            <li key={f.n} className="border-b border-ink last:border-b-0">
              <Link href={f.href} className="group grid grid-cols-[52px_minmax(0,1fr)_auto] sm:grid-cols-[64px_minmax(0,1fr)_auto] items-baseline gap-x-5 gap-y-2 px-4 py-6 transition-colors duration-200 hover:bg-ink hover:text-cream sm:px-8">
                <span className="meta text-ink-soft group-hover:text-cream/60">#{f.n}</span>
                <span className="display min-w-0 text-[34px] sm:text-[52px]">{f.title}</span>
                <span aria-hidden className="text-[26px] transition-transform duration-300 group-hover:translate-x-2">→</span>
                <span />
                <span className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
                  <span className="max-w-[46ch] text-[15px] leading-snug text-ink-soft group-hover:text-cream/80">{f.body}</span>
                  <span className="font-mono text-[11.5px] font-bold text-signal uppercase sm:whitespace-nowrap">{f.stat}</span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
