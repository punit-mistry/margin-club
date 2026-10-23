import { caseHeadline, caseStory } from "@/features/analytics/series";
import { smoothPath } from "@/features/analytics/scale";
import { change, num } from "@/lib/analytics/format";
import { fit, measure, Txt } from "./text";

/**
 * 1200 × 630 share card, drawn as a single SVG so the brand type (baked
 * glyph outlines) and the evidence chart sit on one precise grid.
 * Every figure comes from the case dataset at build time.
 */

export const OG_SIZE = { width: 1200, height: 630 };

const CREAM = "#F2EBDD";
const INK = "#161616";
const RED = "#E74732";
const BLUE = "#244BFF";

export type ShareVariant = "home" | "investigation" | "case-study";

const HEADLINES: Record<ShareVariant, { lines: { text: string; red?: boolean; scale?: number }[]; kicker: string }> = {
  home: {
    kicker: "CASE #001 / THE DISCOUNT TRAP",
    lines: [{ text: "YOUR SALES" }, { text: "ARE UP." }, { text: "SO WHY ARE YOU", scale: 0.56 }, { text: "BROKE?", red: true, scale: 1.12 }],
  },
  investigation: {
    kicker: "INVESTIGATION WORKSPACE",
    lines: [{ text: "CASE #001" }, { text: "IS OPEN." }, { text: "THE DISCOUNT TRAP", scale: 0.56, red: true }],
  },
  "case-study": {
    kicker: "BOMBAYCODER · CASE STUDY",
    lines: [{ text: "DESIGNING A" }, { text: "BUSINESS" }, { text: "DETECTIVE.", red: true }],
  },
};

export function ShareCard({ variant }: { variant: ShareVariant }) {
  const { months, first, last, eraStart } = caseStory();
  const head = caseHeadline();
  const H = HEADLINES[variant];
  const W = OG_SIZE.width;
  const Hh = OG_SIZE.height;

  // Headline column: x 50 → 714, clear of the evidence panel at x 790.
  const colW = 664;
  const base = Math.min(...H.lines.filter((l) => !l.scale).map((l) => fit(l.text, "display", colW, 168)));
  // Stack the lines, then shrink the whole stack if it would cross the footer rule.
  const top = 112;
  const bottom = 562;
  const sizes = H.lines.map((l) => Math.min(fit(l.text, "display", colW, 260), base * (l.scale ?? 1)));
  const stack = sizes.reduce((sum, sz) => sum + sz * 0.9, 0) - sizes[sizes.length - 1] * 0.04;
  const shrink = Math.min(1, (bottom - top) / stack);
  const lines: { text: string; size: number; y: number; red?: boolean }[] = [];
  let y = top;
  H.lines.forEach((l, i) => {
    const size = sizes[i] * shrink;
    y += size * 0.86;
    lines.push({ text: l.text, size, y, red: l.red });
    y += size * 0.04;
  });

  // Evidence chart panel.
  const cx0 = 790;
  const cx1 = 1140;
  const cy0 = 150;
  const cy1 = 500;
  // Leave 96px on the right for the revenue label and a band at the bottom for the profit callout.
  const X = (i: number) => cx0 + 18 + (i / (months.length - 1)) * (cx1 - cx0 - 18 - 96);
  const Y = (v: number) => cy1 - 120 - ((v - 60) / (160 - 60)) * (cy1 - cy0 - 150);
  const rev = months.map((m, i) => [X(i), Y(m.revenueIndex)] as const);
  const pro = months.map((m, i) => [X(i), Y(m.profitIndex)] as const);
  const curve = (pts: readonly (readonly [number, number])[]) => smoothPath(pts.map((p) => [p[0], p[1]] as [number, number]));
  const eraIdx = eraStart ? months.findIndex((m) => m.month === eraStart) : -1;
  const step = X(1) - X(0);
  const eraX = eraIdx > 0 ? X(eraIdx) - step / 2 : null;
  const revChange = change(first.net, last.net, 0);
  const proChange = change(first.profit, last.profit, 0);
  const lastRev = rev[rev.length - 1];
  const lastPro = pro[pro.length - 1];
  const proSize = 64;
  const proW = measure(proChange, "display", proSize);
  const proX = Math.min(cx1 - 30 - proW, lastPro[0] - proW / 2);
  const proY = cy1 - 26;

  const hatch: string[] = [];
  if (eraX !== null) {
    for (let x = eraX - (cy1 - cy0); x < cx1; x += 9) hatch.push(`M${x.toFixed(1)},${cy1} L${(x + (cy1 - cy0)).toFixed(1)},${cy0}`);
  }

  return (
    <div style={{ display: "flex", width: W, height: Hh, background: CREAM }}>
      <svg width={W} height={Hh} viewBox={`0 0 ${W} ${Hh}`}>
        <rect x={0} y={0} width={W} height={Hh} fill={CREAM} />

        {/* Masthead */}
        <rect x={56} y={44} width={13} height={13} fill={RED} />
        <Txt text={H.kicker} font="mono" size={17} x={80} y={57} tracking={0.06} />
        <Txt text="MARGIN" font="display" size={40} x={W - 56 - measure("CLUB", "display", 40) - 22} y={60} anchor="end" />
        <rect x={W - 56 - measure("CLUB", "display", 40) - 17} y={40} width={11} height={11} fill={RED} transform={`rotate(12 ${W - 56 - measure("CLUB", "display", 40) - 11.5} 45.5)`} />
        <Txt text="CLUB" font="display" size={40} x={W - 56} y={60} anchor="end" />
        <line x1={56} x2={W - 56} y1={84} y2={84} stroke={INK} strokeWidth={1.5} />

        {/* Headline */}
        {lines.map((l) => (
          <Txt key={l.text} text={l.text} font="display" size={l.size} x={50} y={l.y} fill={l.red ? RED : INK} />
        ))}

        {/* Evidence panel */}
        <rect x={cx0} y={cy0 - 40} width={cx1 - cx0} height={cy1 - cy0 + 70} fill="none" stroke={INK} strokeWidth={1.5} />
        <Txt text="FIG. 1 — REVENUE VS PROFIT, INDEXED" font="mono" size={11} x={cx0 + 14} y={cy0 - 18} tracking={0.05} />
        {eraX !== null && (
          <g>
            <clipPath id="era">
              <rect x={eraX} y={cy0} width={cx1 - 1 - eraX} height={cy1 - cy0} />
            </clipPath>
            <path d={hatch.join(" ")} stroke={RED} strokeOpacity={0.35} strokeWidth={1.2} clipPath="url(#era)" />
            <line x1={eraX} x2={eraX} y1={cy0} y2={cy1} stroke={RED} strokeWidth={1.2} strokeDasharray="3 4" />
          </g>
        )}
        <line x1={cx0 + 14} x2={X(months.length - 1)} y1={Y(100)} y2={Y(100)} stroke={INK} strokeDasharray="2 5" />
        <path d={curve(rev)} fill="none" stroke={CREAM} strokeWidth={9} strokeLinejoin="round" strokeLinecap="round" />
        <path d={curve(pro)} fill="none" stroke={CREAM} strokeWidth={9} strokeLinejoin="round" strokeLinecap="round" />
        <path d={curve(rev)} fill="none" stroke={INK} strokeWidth={4} strokeLinejoin="round" strokeLinecap="round" />
        <path d={curve(pro)} fill="none" stroke={RED} strokeWidth={4} strokeLinejoin="round" strokeLinecap="round" />
        {rev.map((p, i) => (
          <circle key={`r${i}`} cx={p[0]} cy={p[1]} r={4} fill={i === rev.length - 1 ? BLUE : INK} stroke={CREAM} strokeWidth={2} />
        ))}
        {pro.map((p, i) => (
          <circle key={`p${i}`} cx={p[0]} cy={p[1]} r={4} fill={i === pro.length - 1 ? BLUE : RED} stroke={CREAM} strokeWidth={2} />
        ))}
        {months.map((m, i) => (
          <Txt key={m.month} text={m.label.toUpperCase()} font="mono" size={10} x={X(i)} y={cy1 + 20} anchor="middle" fill={i === months.length - 1 ? INK : "#3B3936"} />
        ))}
        <Txt text={revChange} font="display" size={36} x={lastRev[0] + 12} y={lastRev[1] + 12} />
        <Txt text="REVENUE" font="mono" size={10} x={lastRev[0] + 12} y={lastRev[1] + 26} />
        <line x1={lastPro[0]} x2={lastPro[0]} y1={lastPro[1] + 8} y2={proY - proSize * 0.8 - 6} stroke={RED} strokeWidth={1.5} strokeDasharray="3 3" />
        <Txt text={`PROFIT, ${first.label.toUpperCase()}–${last.label.toUpperCase()}`} font="mono" size={10} x={proX - 64} y={proY - 22} fill={RED} anchor="end" />
        <Txt text={proChange} font="display" size={proSize} x={proX} y={proY} fill={RED} />
        <ellipse cx={proX + proW / 2} cy={proY - proSize * 0.36} rx={proW / 2 + 20} ry={proSize * 0.62} fill="none" stroke={RED} strokeWidth={2.5} transform={`rotate(-5 ${proX + proW / 2} ${proY - proSize * 0.36})`} />

        {/* Footer */}
        <line x1={56} x2={W - 56} y1={Hh - 46} y2={Hh - 46} stroke={INK} strokeWidth={1.5} />
        <Txt text="MARGIN CLUB — THE BUSINESS DETECTIVE" font="mono" size={14} x={56} y={Hh - 20} tracking={0.06} />
        <Txt
          text={`${num(head.orders)} ORDERS · FICTIONAL DEMO DATA · BOMBAYCODER`}
          font="mono"
          size={14}
          x={W - 56}
          y={Hh - 20}
          anchor="end"
          tracking={0.06}
          fill="#3B3936"
        />
      </svg>
    </div>
  );
}

/** Square brand mark for favicons: an ink tile, a cream M, the red block. */
export function BrandMark({ size }: { size: number }) {
  const s = size;
  const m = fit("M", "display", s * 0.62, s * 0.86);
  return (
    <div style={{ display: "flex", width: s, height: s, background: INK }}>
      <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
        <rect x={0} y={0} width={s} height={s} fill={INK} />
        <Txt text="M" font="display" size={m} x={s * 0.1} y={s * 0.8} fill={CREAM} />
        <rect x={s * 0.72} y={s * 0.6} width={s * 0.2} height={s * 0.2} fill={RED} transform={`rotate(12 ${s * 0.82} ${s * 0.7})`} />
      </svg>
    </div>
  );
}
