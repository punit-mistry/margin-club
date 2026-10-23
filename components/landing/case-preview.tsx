import { CTALink, EvidenceTag, HandArrow, HandCircle, Note, Stamp } from "@/components/brand";
import { caseHeadline, caseStory } from "@/features/analytics/series";
import { channelById, customerById, getDataset, productById } from "@/lib/analytics/dataset";
import { change, dateShort, inr, inrCompact, monthShort, num, pct } from "@/lib/analytics/format";
import type { Transaction } from "@/lib/analytics/types";

export function CasePreview() {
  const { months, first, last } = caseStory();
  const head = caseHeadline();
  const ds = getDataset();
  // The receipts: the three highest-scoring loss-making orders.
  const receipts = head.worst.filter((t) => t.profit < 0).slice(0, 3);

  return (
    <section id="case" className="scroll-mt-14 border-b border-ink">
      <div className="flex items-center justify-between border-b border-ink px-4 py-3 sm:px-8">
        <span className="meta">01 — The case file</span>
        <span className="meta text-ink-soft">Fictional business · demo data</span>
      </div>

      <div className="px-3 pt-6 sm:px-6">
        <h2 className="display text-[19vw] sm:text-[14.5vw]">
          The discount <span className="relative inline-block">trap<span className="text-signal">.</span></span>
        </h2>
      </div>

      <div className="grid lg:grid-cols-12">
        {/* Brief */}
        <div className="border-ink px-4 pt-6 pb-10 sm:px-8 lg:col-span-4 lg:border-r">
          <Stamp className="mb-5" rotate={-4}>
            Fictional case · for demonstration
          </Stamp>
          <p className="text-[19px] leading-snug">
            <strong className="font-semibold">Ordinary Objects</strong> sells kulhad mugs, handloom throws and dinner sets from a studio in Mumbai.
            In {monthShort(first.month)} it made <span className="marker tnum">{inrCompact(first.profit)}</span> of contribution profit on{" "}
            <span className="marker tnum">{inrCompact(first.net)}</span> of sales.
          </p>
          <p className="mt-4 text-[19px] leading-snug">
            By {monthShort(last.month)}, sales were up to <span className="marker tnum">{inrCompact(last.net)}</span>. Profit was down to{" "}
            <span className="marker-red tnum text-signal">{inrCompact(last.profit)}</span>.
          </p>
          <p className="serif-italic mt-4 text-[24px] leading-tight">The founder thinks they need more sales. The books say otherwise.</p>

          <dl className="mt-8 border-t border-ink font-mono text-[12px] tnum">
            {[
              ["Sector", "D2C lifestyle, India"],
              ["Period", `${monthShort(first.month)}–${monthShort(last.month)} 2026`],
              ["Orders", num(head.orders)],
              ["Customers", num(head.customers)],
              ["Products", `${head.products} SKUs`],
              ["Channels", ds.channels.map((c) => c.short).join(" · ")],
              ["Currency", "INR"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between border-b border-ink/25 py-2">
                <dt className="uppercase tracking-[0.08em] text-ink-soft">{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
          <CTALink href="/investigation" variant="red" size="lg" className="mt-8">
            Open investigation
          </CTALink>
        </div>

        {/* Evidence board */}
        <div className="relative bg-paper lg:col-span-8">
          <div
            aria-hidden
            className="absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                "linear-gradient(#16161614 1px, transparent 1px), linear-gradient(90deg, #16161614 1px, transparent 1px)",
              backgroundSize: "28px 28px",
            }}
          />
          <div className="relative flex flex-col gap-6 p-4 sm:p-8 lg:block lg:h-[760px] lg:p-0">
            {/* red string (desktop) */}
            <svg aria-hidden viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 z-0 hidden h-full w-full lg:block">
              <path
                d="M 26 6 Q 50 16 75 11 M 75 11 Q 52 34 27 53 M 27 53 Q 50 64 76 55"
                fill="none"
                stroke="#E74732"
                strokeWidth={1.6}
                vectorEffect="non-scaling-stroke"
                pathLength={1}
                strokeDasharray={1}
                strokeDashoffset={0}
              />
            </svg>

            <EvidenceCard n="01" title="Revenue is growing." className="lg:absolute lg:top-[4%] lg:left-[4%] lg:w-[44%] lg:-rotate-2">
              <MiniBars values={months.map((m) => m.net)} labels={months.map((m) => m.label)} />
              <div className="mt-3 flex items-end justify-between">
                <span className="display text-[64px] leading-[0.8]">{change(first.net, last.net, 0)}</span>
                <span className="meta text-right text-ink-soft">
                  Monthly revenue
                  <br />
                  {inrCompact(first.net)} → {inrCompact(last.net)}
                </span>
              </div>
            </EvidenceCard>

            <EvidenceCard n="02" title="Discounting is increasing." className="lg:absolute lg:top-[9%] lg:right-[3%] lg:w-[44%] lg:rotate-[1.5deg]">
              <DiscountStrip months={months.map((m) => ({ label: m.label, share: m.discountedShare, deep: m.heavyDiscountOrders / m.orders }))} />
              <div className="mt-3 flex items-end justify-between gap-3">
                <span className="display text-[44px] leading-[0.85]">
                  {pct(first.discountedShare, 0)} <span className="text-signal">→ {pct(last.discountedShare, 0)}</span>
                </span>
                <span className="meta text-right text-ink-soft">of orders carried a code</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {["SUMMER25", "MONSOON30", "FREEDOM40", "HOME35"].map((c, i) => (
                  <Stamp key={c} rotate={[-4, 3, -2, 5][i]}>
                    {c}
                  </Stamp>
                ))}
              </div>
            </EvidenceCard>

            <EvidenceCard n="03" title="Profitability is declining." className="lg:absolute lg:top-[51%] lg:left-[6%] lg:w-[42%] lg:rotate-1">
              <MiniLine values={months.map((m) => m.margin)} labels={months.map((m) => m.label)} />
              <div className="mt-3 flex items-end justify-between">
                <span className="display text-[44px] leading-[0.85]">
                  {pct(first.margin, 0)} <span className="text-signal">→ {pct(last.margin, 0)}</span>
                </span>
                <span className="meta text-right text-ink-soft">contribution margin</span>
              </div>
            </EvidenceCard>

            {/* Receipt */}
            <div className="relative z-10 border border-ink bg-cream p-4 shadow-[5px_5px_0_#161616] lg:absolute lg:top-[52%] lg:right-[4%] lg:w-[40%] lg:-rotate-1">
              <Pin />
              <div className="flex items-center justify-between">
                <span className="meta">Exhibit 04 · highlighted transactions</span>
                <EvidenceTag n="04" />
              </div>
              <ul className="mt-3 divide-y divide-dashed divide-ink/40 font-mono text-[11.5px] tnum">
                {receipts.map((t, i) => (
                  <Receipt key={t.id} t={t} circled={i === 0} />
                ))}
              </ul>
              <Note className="absolute -bottom-9 left-6 text-[24px]" rotate={-4}>
                sold at a loss — on purpose?!
              </Note>
            </div>

            <Note className="absolute top-[44.5%] left-[5%] z-30 hidden text-[25px] lg:block" rotate={-3}>
              same customers, deeper codes
            </Note>
            <HandArrow variant="straight" className="absolute top-[44%] left-[33%] z-30 hidden h-8 w-24 -rotate-[14deg] text-signal lg:block" draw={false} />
          </div>
        </div>
      </div>
    </section>
  );
}

function Pin() {
  return <span aria-hidden className="absolute -top-2 left-1/2 z-30 h-4 w-4 -translate-x-1/2 rounded-full border-2 border-ink bg-signal shadow-[1px_2px_0_#161616]" />;
}

function EvidenceCard({ n, title, className = "", children }: { n: string; title: string; className?: string; children: React.ReactNode }) {
  return (
    <article className={`relative z-10 border border-ink bg-cream p-4 shadow-[5px_5px_0_#161616] transition-transform duration-300 hover:z-40 hover:rotate-0 ${className}`}>
      <Pin />
      <div className="flex items-start justify-between gap-3">
        <h3 className="display text-[30px] leading-[0.9]">
          <span className="text-signal">{n} — </span>
          {title}
        </h3>
        <EvidenceTag n={n} tone="ink" />
      </div>
      <div className="mt-3">{children}</div>
    </article>
  );
}

function MiniBars({ values, labels }: { values: number[]; labels: string[] }) {
  const max = Math.max(...values);
  return (
    <svg viewBox="0 0 240 90" className="w-full" role="img" aria-label="Monthly revenue bars">
      {values.map((v, i) => {
        const h = (v / max) * 70;
        const last = i === values.length - 1;
        return (
          <g key={i}>
            <rect x={i * 30 + 4} y={76 - h} width={20} height={h} fill={last ? "#244BFF" : "#161616"} />
            <text x={i * 30 + 14} y={88} textAnchor="middle" className="fill-ink font-mono text-[8px] uppercase">
              {labels[i]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function DiscountStrip({ months }: { months: { label: string; share: number; deep: number }[] }) {
  return (
    <svg viewBox="0 0 240 90" className="w-full" role="img" aria-label="Share of orders discounted per month">
      {months.map((m, i) => (
        <g key={i}>
          <rect x={i * 30 + 4} y={6} width={20} height={70} fill="none" stroke="#161616" strokeWidth={0.8} />
          <rect x={i * 30 + 4} y={76 - m.share * 70} width={20} height={m.share * 70} fill="#161616" opacity={0.18} />
          <rect x={i * 30 + 4} y={76 - m.deep * 70} width={20} height={m.deep * 70} fill="#E74732" />
          <text x={i * 30 + 14} y={88} textAnchor="middle" className="fill-ink font-mono text-[8px] uppercase">
            {m.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

function MiniLine({ values, labels }: { values: number[]; labels: string[] }) {
  const max = Math.max(...values) * 1.08;
  const pts = values.map((v, i) => [i * 30 + 14, 76 - (v / max) * 70] as const);
  const d = pts.map((p, i) => `${i ? "L" : "M"}${p[0]},${p[1]}`).join("");
  return (
    <svg viewBox="0 0 240 90" className="w-full" role="img" aria-label="Contribution margin by month">
      <path d={d} fill="none" stroke="#E74732" strokeWidth={2.5} />
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p[0]} cy={p[1]} r={3} fill={i === pts.length - 1 ? "#E74732" : "#161616"} />
          <text x={p[0]} y={88} textAnchor="middle" className="fill-ink font-mono text-[8px] uppercase">
            {labels[i]}
          </text>
        </g>
      ))}
    </svg>
  );
}

function Receipt({ t, circled }: { t: Transaction; circled: boolean }) {
  const c = customerById(t.customerId);
  return (
    <li className="py-2.5">
      <div className="flex justify-between">
        <span className="font-bold">{t.id}</span>
        <span>
          {dateShort(t.date)} · {channelById(t.channel).short}
        </span>
      </div>
      <div className="mt-0.5 flex justify-between text-ink-soft">
        <span className="truncate pr-2">
          {t.lines.map((l) => `${l.qty}× ${productById(l.productId).name.split(",")[0]}`).join(" + ")}
        </span>
        <span>{c.city}</span>
      </div>
      <div className="mt-1 flex items-center justify-between">
        <span>
          {inr(t.gross)} <span className="text-signal">− {t.coupon} {inr(t.discount)}</span>
        </span>
        <span className={`relative font-bold text-signal ${circled ? "px-1" : ""}`}>
          {circled && <HandCircle className="-inset-x-3 -inset-y-2 h-[calc(100%+16px)] w-[calc(100%+24px)]" draw={false} />}
          {inr(t.profit)}
        </span>
      </div>
    </li>
  );
}
