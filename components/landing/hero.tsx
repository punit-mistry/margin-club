"use client";

import Link from "next/link";
import { useMemo, useState, type KeyboardEvent } from "react";
import { CTALink, EvidenceTag, HandArrow, HandCircle, Note, Stamp } from "@/components/brand";
import { caseHeadline, caseStory, type MonthStory } from "@/features/analytics/series";
import { linear, smoothPath } from "@/features/analytics/scale";
import { useSize } from "@/features/analytics/use-size";
import { change, inrCompact, monthLong, monthShort, num, pct } from "@/lib/analytics/format";

export function Hero() {
  const { months, first, last, eraStart } = caseStory();
  const head = caseHeadline();
  const [hover, setHover] = useState<number | null>(null);
  const [inspected, setInspected] = useState(months.length - 1);
  const active = hover ?? inspected;

  return (
    <section className="relative overflow-hidden border-b border-ink">
      {/* metadata strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-5 sm:px-8">
        <span className="meta flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 bg-signal" /> Case #001 / The Discount Trap
        </span>
        <span className="meta hidden text-ink-soft sm:block">
          Ordinary Objects · {monthShort(first.month)}–{monthShort(last.month)} 2026 · {num(head.orders)} orders · fictional
        </span>
      </div>

      <div className="relative">
        {/* Line 1–2 */}
        <h1 className="pointer-events-none relative z-20 px-3 pt-4 sm:px-6">
          <span className="display block animate-rise text-[21vw] sm:text-[16.5vw] lg:text-[15vw]">Your sales</span>
          <span className="flex items-end gap-[2vw] pl-[24vw] sm:pl-[33vw]">
            <span className="display block animate-rise text-[21vw] [animation-delay:120ms] sm:text-[16.5vw] lg:text-[15vw]">are up.</span>
            <HandArrow variant="down" className="mb-[3vw] hidden h-[7vw] w-[4vw] -scale-y-100 text-electric sm:block" />
          </span>
          <span className="sr-only">So why are you broke?</span>
        </h1>

        {/* The evidence: revenue vs profit, indexed */}
        <HeroChart months={months} eraStart={eraStart} active={active} hover={hover} setHover={setHover} onInspect={setInspected} />

        <div aria-hidden className="pointer-events-none relative z-20 mt-[1vw] px-3 sm:px-6">
          <span className="display block animate-rise text-[16vw] [animation-delay:260ms] sm:text-[11vw]">So why are you</span>
          <span className="relative -mb-[5.2vw] block">
            <span className="display block animate-rise text-[33vw] leading-[0.78] text-signal [animation-delay:380ms] sm:text-[27vw]">Broke?</span>
            <Note className="absolute top-[6vw] right-[4vw] hidden text-[clamp(18px,2vw,30px)] text-ink lg:block" rotate={4}>
              ← the books know.
            </Note>
          </span>
        </div>
      </div>

      {/* Deck: copy + CTA + period inspector */}
      <div className="relative z-30 grid gap-0 border-t border-ink bg-cream lg:grid-cols-12">
        <div className="flex flex-col justify-between gap-6 border-ink px-4 py-7 sm:px-8 lg:col-span-5 lg:border-r">
          <p className="max-w-[34ch] text-[19px] leading-snug sm:text-[22px]">
            Every business has numbers that don&apos;t add up.{" "}
            <span className="serif-italic text-[1.15em]">Find the patterns hiding behind your revenue.</span>
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <CTALink href="/investigation" size="lg">
              Investigate case #001
            </CTALink>
            <Link href="#case" className="meta underline decoration-1 underline-offset-4 hover:text-signal">
              Read the case file ↓
            </Link>
          </div>
        </div>
        <PeriodInspector m={months[active]} base={first} pinned={hover === null} index={active} />
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

function HeroChart({
  months,
  eraStart,
  active,
  hover,
  setHover,
  onInspect,
}: {
  months: MonthStory[];
  eraStart: string | null;
  active: number;
  hover: number | null;
  setHover: (i: number | null) => void;
  onInspect: (i: number) => void;
}) {
  const [ref, { width, height, measured }] = useSize<HTMLDivElement>({ width: 1280, height: 440 });
  const padL = Math.max(16, width * 0.04);
  const padR = Math.max(120, width * 0.19);
  const geo = useMemo(() => {
    const x = linear([0, months.length - 1], [padL, width - padR]);
    const y = linear([55, 160], [height - 26, 10]);
    const rev = months.map((m, i) => [x(i), y(m.revenueIndex)] as [number, number]);
    const pro = months.map((m, i) => [x(i), y(m.profitIndex)] as [number, number]);
    const eraIdx = eraStart ? months.findIndex((m) => m.month === eraStart) : -1;
    return { x, y, rev, pro, eraIdx, step: x(1) - x(0) };
  }, [months, width, height, padL, padR, eraStart]);

  const last = months[months.length - 1];
  const lastRev = geo.rev[geo.rev.length - 1];
  const lastPro = geo.pro[geo.pro.length - 1];

  const pick = (clientX: number, rect: DOMRect) => {
    const px = clientX - rect.left;
    const i = Math.round(geo.x.invert(px));
    return Math.max(0, Math.min(months.length - 1, i));
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const next = Math.max(0, Math.min(months.length - 1, active + (e.key === "ArrowRight" ? 1 : -1)));
      onInspect(next);
    }
  };

  return (
    <div
      ref={ref}
      tabIndex={0}
      role="group"
      aria-label="Revenue versus profit by month, indexed to February = 100. Use arrow keys to inspect months."
      onKeyDown={onKey}
      onPointerMove={(e) => setHover(pick(e.clientX, e.currentTarget.getBoundingClientRect()))}
      onPointerLeave={() => setHover(null)}
      onClick={(e) => onInspect(pick(e.clientX, e.currentTarget.getBoundingClientRect()))}
      className="relative z-30 -mt-[9vw] h-[78vw] cursor-crosshair outline-none sm:-mt-[7vw] sm:h-[44vw] lg:h-[36vw] lg:max-h-[560px]"
    >
      {/* Draw only once the real size is known; the container reserves the space. */}
      {measured && (
      <>
      <svg width={width} height={height} className="absolute inset-0 overflow-visible" aria-hidden>
        <defs>
          <pattern id="hero-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
            <line x1="0" y1="0" x2="0" y2="8" stroke="#E74732" strokeWidth="1.2" opacity="0.38" />
          </pattern>
        </defs>

        {/* Suspicious period */}
        {geo.eraIdx > 0 && (
          <g>
            <rect
              x={geo.x(geo.eraIdx) - geo.step / 2}
              y={0}
              width={Math.max(0, width - padR - (geo.x(geo.eraIdx) - geo.step / 2) + geo.step / 2)}
              height={Math.max(0, height - 18)}
              fill="url(#hero-hatch)"
            />
            <line x1={geo.x(geo.eraIdx) - geo.step / 2} x2={geo.x(geo.eraIdx) - geo.step / 2} y1={0} y2={height - 18} stroke="#E74732" strokeWidth={1.2} strokeDasharray="3 4" />
          </g>
        )}

        {/* Baseline 100 */}
        <line x1={padL} x2={width - padR} y1={geo.y(100)} y2={geo.y(100)} stroke="#161616" strokeWidth={1} strokeDasharray="2 5" />

        {/* Active month cursor */}
        <line x1={geo.x(active)} x2={geo.x(active)} y1={0} y2={height - 18} stroke="#244BFF" strokeWidth={1.2} />

        {/* Lines — a cream halo lets them cut cleanly through the headline */}
        <path d={smoothPath(geo.rev)} stroke="#F2EBDD" strokeWidth={Math.max(3, width * 0.0032) + 7} fill="none" strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1} className="animate-draw [animation-duration:1.8s]" />
        <path d={smoothPath(geo.pro)} stroke="#F2EBDD" strokeWidth={Math.max(3, width * 0.0032) + 7} fill="none" strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1} className="animate-draw [animation-delay:250ms] [animation-duration:1.8s]" />
        <path d={smoothPath(geo.rev)} stroke="#161616" strokeWidth={Math.max(3, width * 0.0032)} fill="none" pathLength={1} strokeDasharray={1} strokeDashoffset={1} className="animate-draw [animation-duration:1.8s]" />
        <path d={smoothPath(geo.pro)} stroke="#E74732" strokeWidth={Math.max(3, width * 0.0032)} fill="none" pathLength={1} strokeDasharray={1} strokeDashoffset={1} className="animate-draw [animation-delay:250ms] [animation-duration:1.8s]" />

        {/* Points */}
        {months.map((m, i) => (
          <g key={m.month}>
            <circle cx={geo.rev[i][0]} cy={geo.rev[i][1]} r={i === active ? 7 : 4.5} fill={i === active ? "#244BFF" : "#161616"} stroke="#F2EBDD" strokeWidth={2.5} className="transition-all" />
            <circle cx={geo.pro[i][0]} cy={geo.pro[i][1]} r={i === active ? 7 : 4.5} fill={i === active ? "#244BFF" : "#E74732"} stroke="#F2EBDD" strokeWidth={2.5} className="transition-all" />
            <text x={geo.x(i)} y={height - 2} textAnchor="middle" className="fill-ink font-mono text-[10px] tracking-[0.1em] uppercase" opacity={i === active ? 1 : 0.6}>
              {m.label}
            </text>
          </g>
        ))}
      </svg>

      {/* Era label */}
      {geo.eraIdx > 0 && (
        <span className="absolute hidden bg-cream px-1.5 sm:block" style={{ left: geo.x(geo.eraIdx) - geo.step / 2 + 8, top: height - 44 }}>
          <span className="meta text-signal">▨ Suspicious period · {monthShort(months[geo.eraIdx].month)}→{monthShort(last.month)} · 25%+ codes live</span>
        </span>
      )}
      <span className="meta absolute hidden sm:block" style={{ left: padL, top: geo.y(100) + 6 }}>
        Index · {monthShort(months[0].month)} = 100
      </span>

      {/* End labels + the central number */}
      <div className="pointer-events-none absolute text-right" style={{ left: lastRev[0] + 14, top: lastRev[1] - 16 }}>
        <span className="display block text-[clamp(22px,3.2vw,52px)]">{change(months[0].net, last.net, 0)}</span>
        <span className="meta block">revenue</span>
      </div>
      <div className="pointer-events-none absolute" style={{ left: lastPro[0] - 18, top: lastPro[1] - 58 }}>
        <span className="meta mb-1 block pl-3 text-signal">profit, {monthShort(months[0].month)}→{monthShort(last.month)}</span>
        <span className="relative inline-block px-3 py-2 text-signal">
          <HandCircle className="-inset-x-3 -inset-y-2 h-[calc(100%+16px)] w-[calc(100%+24px)] [&_path]:[animation-delay:1.6s]" />
          <span className="display block text-[clamp(40px,7.4vw,124px)] leading-[0.8]">{change(months[0].profit, last.profit, 0)}</span>
        </span>
      </div>

      {/* Hover evidence */}
      {hover !== null && (
        <div
          className="pointer-events-none absolute z-30 hidden w-[230px] border border-ink bg-cream p-3 shadow-[4px_4px_0_#161616] sm:block"
          style={{
            left: geo.x(hover) + (geo.x(hover) > width * 0.6 ? -246 : 16),
            top: Math.min(geo.pro[hover][1], height - 190) - 10,
          }}
        >
          <div className="flex items-center justify-between">
            <span className="meta">Evidence · {monthShort(months[hover].month)}</span>
            <EvidenceTag n={String(hover + 1).padStart(2, "0")} tone="blue" />
          </div>
          <dl className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 font-mono text-[11px] tnum">
            <dt className="text-ink-soft">Revenue</dt>
            <dd className="text-right">{inrCompact(months[hover].net)}</dd>
            <dt className="text-ink-soft">Profit</dt>
            <dd className="text-right text-signal">{inrCompact(months[hover].profit)}</dd>
            <dt className="text-ink-soft">Discounted</dt>
            <dd className="text-right">{pct(months[hover].discountedShare, 0)} of orders</dd>
            <dt className="text-ink-soft">Lost money</dt>
            <dd className="text-right">{num(months[hover].lossOrders)} orders</dd>
          </dl>
          <p className="meta mt-2 text-electric">Click to inspect the period →</p>
        </div>
      )}
      </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function PeriodInspector({ m, base, pinned, index }: { m: MonthStory; base: MonthStory; pinned: boolean; index: number }) {
  const isBase = m.month === base.month;
  return (
    <div className="grid grid-cols-2 gap-px bg-ink sm:grid-cols-4 lg:col-span-7">
      <div className="col-span-2 flex items-start justify-between gap-3 bg-cream px-4 py-4 sm:col-span-4 sm:px-6">
        <div>
          <span className="meta text-ink-soft">{pinned ? "Period under inspection" : "Previewing"}</span>
          <h3 className="display mt-1 text-[38px] sm:text-[46px]">
            {monthLong(m.month)} <span className="text-signal">#{String(index + 1).padStart(2, "0")}</span>
          </h3>
        </div>
        <div className="flex flex-col items-end gap-2 pt-1">
          {m.codes.length ? (
            m.codes.slice(-2).map((c, i) => (
              <Stamp key={c} rotate={i ? 3 : -5}>
                {c}
              </Stamp>
            ))
          ) : (
            <Stamp tone="ink" rotate={-3}>
              No sitewide code
            </Stamp>
          )}
        </div>
      </div>
      <Cell label="Revenue" value={inrCompact(m.net)} note={isBase ? "baseline" : `${change(base.net, m.net, 0)} vs ${base.label}`} />
      <Cell label="Profit" value={inrCompact(m.profit)} note={isBase ? "baseline" : `${change(base.profit, m.profit, 0)} vs ${base.label}`} red={m.profit < base.profit} />
      <Cell label="Margin" value={pct(m.margin)} note={`${pct(m.discountedShare, 0)} orders discounted`} red={m.margin < base.margin - 0.05} />
      <Cell label="Loss-making orders" value={num(m.lossOrders)} note={`thin-margin SKUs ${pct(m.thinShare, 0)} of sales`} red={m.lossOrders > 0} />
      <Link
        href={`/investigation#month=${m.month}`}
        className="col-span-2 flex items-center justify-between bg-cream px-4 py-3 transition-colors hover:bg-ink hover:text-cream sm:col-span-4 sm:px-6"
      >
        <span className="meta">Open {monthShort(m.month)} in the investigation</span>
        <span aria-hidden>→</span>
      </Link>
    </div>
  );
}

function Cell({ label, value, note, red = false }: { label: string; value: string; note: string; red?: boolean }) {
  return (
    <div className="bg-cream px-4 py-3 sm:px-6">
      <span className="meta text-ink-soft">{label}</span>
      <span className={`display mt-1 block text-[34px] tnum ${red ? "text-signal" : ""}`}>{value}</span>
      <span className="meta block text-ink-soft normal-case tracking-normal">{note}</span>
    </div>
  );
}
