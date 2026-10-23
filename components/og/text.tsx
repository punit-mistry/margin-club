import { OG_FONTS } from "./glyphs";

/**
 * Minimal text-to-SVG-path renderer for next/og images, using glyph outlines
 * baked from the brand fonts (see scripts/generate-og-glyphs.mjs).
 */

export type OgFont = keyof typeof OG_FONTS;

type Glyph = readonly [number, string];

function glyph(font: OgFont, ch: string): Glyph {
  const g = OG_FONTS[font].glyphs as unknown as Record<string, Glyph>;
  return g[ch] ?? g["?"];
}

/** Advance width of `text` in px. `tracking` is in em. */
export function measure(text: string, font: OgFont, size: number, tracking = 0): number {
  const f = OG_FONTS[font];
  let adv = 0;
  for (const ch of text) adv += glyph(font, ch)[0] + tracking * f.upm;
  return (adv * size) / f.upm;
}

/** Largest size (≤ max) at which `text` fits in `width`. */
export function fit(text: string, font: OgFont, width: number, max: number, tracking = 0): number {
  return Math.min(max, (width / measure(text, font, 1000, tracking)) * 1000);
}

/** Text drawn as paths, positioned on its baseline at (x, y). */
export function Txt({
  text,
  font,
  size,
  x,
  y,
  fill = "#161616",
  tracking = 0,
  anchor = "start",
}: {
  text: string;
  font: OgFont;
  size: number;
  x: number;
  y: number;
  fill?: string;
  tracking?: number;
  anchor?: "start" | "middle" | "end";
}) {
  const f = OG_FONTS[font];
  const k = size / f.upm;
  const w = measure(text, font, size, tracking);
  const x0 = anchor === "end" ? x - w : anchor === "middle" ? x - w / 2 : x;
  let adv = 0;
  const paths: { d: string; dx: number }[] = [];
  for (const ch of text) {
    const [a, d] = glyph(font, ch);
    if (d) paths.push({ d, dx: adv });
    adv += a + tracking * f.upm;
  }
  return (
    <g transform={`translate(${x0.toFixed(1)} ${y.toFixed(1)}) scale(${k.toFixed(5)} ${(-k).toFixed(5)})`} fill={fill}>
      {paths.map((p, i) => (
        <path key={i} d={p.d} transform={`translate(${p.dx} 0)`} />
      ))}
    </g>
  );
}
