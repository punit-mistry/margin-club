import type { Metadata } from "next";
import type { ReactNode } from "react";
import { CTALink, EvidenceTag, HandArrow, HandCircle, HandUnderline, Note, Stamp } from "@/components/brand";
import { ProductPreviews } from "@/components/case-study/previews";
import { SiteFooter } from "@/components/landing/final-cta";
import { SiteNav } from "@/components/landing/site-nav";
import { RichText } from "@/components/rich-text";
import { caseHeadline, caseStory } from "@/features/analytics/series";
import { investigate } from "@/lib/ai/engine";
import { change, inrCompact, monthShort, num, pct } from "@/lib/analytics/format";
import { fullRange } from "@/lib/analytics/periods";

export const metadata: Metadata = {
  title: "Case study — designing a business detective",
  description: "MARGIN CLUB, a BombayCoder concept product: creative direction, AI architecture and implementation. Fictional business and data.",
};

const PALETTE = [
  { hex: "#F2EBDD", name: "Archival cream", role: "The paper. Primary background.", ink: true },
  { hex: "#161616", name: "Ink black", role: "Type, rules, the evidence itself." },
  { hex: "#E74732", name: "Signal red", role: "Suspicious patterns, money lost, warnings." },
  { hex: "#244BFF", name: "Electric blue", role: "Selection and interactive data." },
  { hex: "#D7D2C8", name: "Paper grey", role: "Evidence boards, secondary surfaces.", ink: true },
];

export default function CaseStudyPage() {
  const { first, last } = caseStory();
  const head = caseHeadline();
  // Real engine output, computed at build time from the same dataset the app uses.
  const sample = investigate("Why is my profit declining?", { range: fullRange() }, "case-study-sample", 0);

  return (
    <>
      <SiteNav />
      <main>
        {/* Title */}
        <section className="border-b border-ink">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink px-4 py-3 sm:px-8">
            <span className="meta">BombayCoder · Case study · Concept product</span>
            <Stamp rotate={-3}>Fictional business · demo data</Stamp>
          </div>
          <div className="px-3 pt-6 sm:px-6">
            <h1 className="display text-[17vw] leading-[0.78]">
              Margin<span className="text-signal">.</span>Club
            </h1>
          </div>
          <div className="grid gap-8 px-4 py-8 sm:px-8 lg:grid-cols-12">
            <p className="serif-italic text-[30px] leading-[1.05] sm:text-[40px] lg:col-span-7">
              Designing a business detective — an analytics product that reads like an investigative magazine and shows its working like an auditor.
            </p>
            <dl className="grid grid-cols-2 gap-px self-start border border-ink bg-ink font-mono text-[11.5px] lg:col-span-5">
              {[
                ["Studio", "BombayCoder"],
                ["Type", "Self-initiated concept"],
                ["Year", "2026"],
                ["Client", "None — fictional"],
                ["Scope", "Creative direction, product design, frontend, analytics engine"],
                ["Stack", "Next.js 16 · TypeScript · Tailwind v4 · SVG/Canvas"],
              ].map(([k, v]) => (
                <div key={k} className="bg-cream p-3">
                  <dt className="meta text-ink-soft">{k}</dt>
                  <dd className="mt-1 leading-snug">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <Chapter n="01" title="The fictional problem">
          <div className="grid gap-8 lg:grid-cols-12">
            <div className="space-y-4 text-[18px] leading-snug lg:col-span-7">
              <p>
                <strong className="font-semibold">Ordinary Objects</strong> is an invented Mumbai D2C brand selling mugs, throws and dinner sets across a website,
                Instagram, a marketplace and quick commerce. Its revenue dashboard looks great. Its bank balance doesn&apos;t.
              </p>
              <p>
                We generated {num(head.orders)} deterministic orders that encode one coherent business problem: as promotions got deeper and more frequent,
                and ads pushed two thin-margin products, revenue climbed while contribution profit fell. From {monthShort(first.month)} to {monthShort(last.month)},
                monthly revenue moved <span className="marker tnum">{change(first.net, last.net)}</span> and contribution profit{" "}
                <span className="marker-red tnum text-signal">{change(first.profit, last.profit)}</span>.
              </p>
              <p className="text-ink-soft">
                Nothing is staged in the UI: every figure on every screen — including the investigator&apos;s answers — is calculated from that dataset at
                runtime.
              </p>
            </div>
            <aside className="border-2 border-signal p-5 lg:col-span-5">
              <span className="meta text-signal">Disclosure</span>
              <p className="mt-2 text-[15px] leading-snug">
                The business, its customers and its results are fictional demo content. This case study makes no claims about real clients, user adoption,
                testimonials or commercial performance.
              </p>
            </aside>
          </div>
        </Chapter>

        <Chapter n="02" title="Product concept">
          <p className="display max-w-[18ch] text-[12vw] leading-[0.82] lg:text-[6vw]">
            Not a dashboard. <span className="text-signal">A case file.</span>
          </p>
          <div className="mt-10 grid gap-0 border-t border-ink sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Evidence first", "The canvas is a pinboard of exhibits — revenue against profit, every order as a dot, every product against its margin — not twelve KPI tiles."],
              ["Every number opens", "Click a bar, a dot, a row or a product and the records behind it come up in a drawer you can search and export as CSV."],
              ["An honest investigator", "Questions are answered by a transparent local engine that shows each step. It never claims to be an LLM."],
              ["Lenses, not tabs", "Discount Trap, Products, Customers and Channels each get their own composition and visual language."],
            ].map(([t, b], i) => (
              <div key={t} className="border-b border-ink py-5 sm:border-r sm:px-4 lg:border-b-0">
                <span className="font-mono text-[11px] text-signal">0{i + 1}</span>
                <h3 className="display mt-2 text-[30px] leading-[0.9]">{t}</h3>
                <p className="mt-2 text-[14.5px] leading-snug text-ink-soft">{b}</p>
              </div>
            ))}
          </div>
        </Chapter>

        <Chapter n="03" title="Creative direction">
          <div className="grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <p className="text-[18px] leading-snug">
                An independent investigative magazine, a financial-crime documentary and an experimental studio, sharing one desk. Swiss grids and hairline
                rules carry the information; stamps, scribbled circles and handwritten notes carry the suspicion.
              </p>
              <ul className="mt-6 space-y-3">
                {PALETTE.map((c) => (
                  <li key={c.hex} className="flex items-center gap-4">
                    <span className="h-14 w-14 shrink-0 border border-ink" style={{ background: c.hex }} />
                    <span>
                      <span className="display block text-[24px] leading-none">{c.name}</span>
                      <span className="font-mono text-[11px]">{c.hex}</span>
                      <span className="block text-[13px] text-ink-soft">{c.role}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-6 lg:col-span-7">
              <Specimen label="Display · Archivo, width 62, weight 900">
                <span className="display text-[72px] leading-[0.8] sm:text-[110px]">Broke?</span>
              </Specimen>
              <Specimen label="Interface · Instrument Sans">
                <span className="text-[24px]">Revenue rose; contribution profit fell.</span>
              </Specimen>
              <Specimen label="Editorial accent · Instrument Serif Italic">
                <span className="serif-italic text-[36px] leading-none">The books say otherwise.</span>
              </Specimen>
              <Specimen label="Evidence · JetBrains Mono">
                <span className="font-mono text-[15px]">OO-15322 · 22 SEP · MKT · HOME35 · −₹1,026</span>
              </Specimen>
              <Specimen label="Annotation · Caveat">
                <span className="hand text-[34px] text-signal">sold at a loss — on purpose?!</span>
              </Specimen>
              <div className="relative border border-ink bg-paper p-6">
                <span className="meta text-ink-soft">Investigative vocabulary — live components</span>
                <div className="mt-4 flex flex-wrap items-center gap-6">
                  <Stamp rotate={-6}>Loss</Stamp>
                  <Stamp tone="blue" rotate={3}>Selected</Stamp>
                  <EvidenceTag n="04" />
                  <EvidenceTag n="A" tone="ink" />
                  <span className="relative inline-block px-3 py-1 text-signal">
                    <HandCircle draw={false} className="-inset-x-2 -inset-y-1 h-[calc(100%+8px)] w-[calc(100%+16px)]" />
                    <span className="display text-[40px] leading-none">{pct(last.margin, 0)}</span>
                  </span>
                  <HandArrow variant="curve" draw={false} className="h-10 w-24 text-signal" />
                  <span className="relative">
                    <span className="display text-[34px]">profit</span>
                    <HandUnderline draw={false} className="absolute -bottom-1 left-0 h-3 w-full text-electric" />
                  </span>
                  <Note rotate={-4}>follow the discount</Note>
                </div>
              </div>
            </div>
          </div>
        </Chapter>

        <Chapter n="04" title="AI architecture — free by default">
          <div className="grid gap-10 lg:grid-cols-12">
            <div className="space-y-4 text-[17px] leading-snug lg:col-span-5">
              <p>
                The investigator runs entirely in the browser. A rules-based parser turns a question into an intent and entities (product, month, channel,
                coupon). A handler pulls exactly the metrics it needs from the analytics library and writes an answer whose every figure is computed — not
                generated.
              </p>
              <p>
                It is labelled <strong className="font-semibold">Local analysis engine</strong>, everywhere. No OpenAI, Anthropic or Gemini keys; no hosted
                calls; no simulated connection.
              </p>
              <p>
                Optionally, a user can connect <strong className="font-semibold">Ollama</strong> on their own machine. The model only re-words the engine&apos;s
                facts; any number it writes that isn&apos;t in those facts is flagged in red. Switching requires a real, successful connection test.
              </p>
            </div>
            <div className="lg:col-span-7">
              <ArchitectureDiagram />
            </div>
          </div>
          <div className="mt-12 grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <span className="meta text-ink-soft">Actual engine output</span>
              <h3 className="display mt-1 text-[40px] leading-[0.9]">“{sample.question}”</h3>
              <ol className="mt-4 space-y-1 font-mono text-[11.5px]">
                {sample.steps.map((s, i) => (
                  <li key={i} className="grid grid-cols-[24px_1fr] gap-1">
                    <span className="text-electric">{String(i + 1).padStart(2, "0")}</span>
                    <span>
                      <span className="font-bold uppercase">{s.label}</span> <span className="text-ink-soft">— {s.detail}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
            <div className="border border-ink bg-cream p-5 shadow-[6px_6px_0_#161616] lg:col-span-7">
              <span className="meta text-signal">{sample.caseTitle}</span>
              <p className="display mt-1 text-[34px] leading-[0.92]">{sample.headline}</p>
              <div className="mt-3 space-y-2 text-[14.5px] leading-relaxed">
                {sample.explanation.map((p, i) => (
                  <p key={i}>
                    <RichText text={p} />
                  </p>
                ))}
              </div>
              <p className="meta mt-4 text-electric">
                {sample.evidence.length} evidence sets · {sample.evidence.reduce((s, e) => s + e.orderIds.length, 0)} supporting order ids · rule: {sample.rule}
              </p>
            </div>
          </div>
        </Chapter>

        <Chapter n="05" title="Technical implementation">
          <div className="grid gap-10 lg:grid-cols-12">
            <pre className="overflow-x-auto border border-ink bg-ink p-5 font-mono text-[12px] leading-relaxed text-cream lg:col-span-5">
{`app/
  page.tsx              landing
  investigation/        workspace route
  case-study/           this page
components/             brand + landing sections
features/
  investigation/        workspace, store, canvases,
                        drawer, investigator UI
  analytics/            custom SVG + canvas exhibits
lib/
  analytics/            types, metrics, bridge,
                        cohorts, rules, CSV
  ai/                   parser, handlers, engine,
                        optional Ollama narrator
data/
  catalog.ts            products, channels, codes
  generate.ts           seeded simulation`}
            </pre>
            <ul className="grid gap-0 border-t border-ink sm:grid-cols-2 lg:col-span-7">
              {[
                ["Deterministic data", "A seeded PRNG and integer-only arithmetic produce identical orders on server and client, so pages prerender statically and hydrate cleanly."],
                ["Calculations apart from UI", "lib/analytics is pure TypeScript. The same functions power the canvas, the investigator, the landing page and this case study."],
                ["Exact profit bridge", "Each ₹1 of list value splits into discount, COGS, shipping, packaging, fees and profit — so margin changes are explained with no residual."],
                ["Fair cohort maths", "Repeat rates only count customers observable for the full window, so newer cohorts aren't mistaken for churn."],
                ["No chart library", "Every exhibit is hand-built SVG, plus a canvas layer for 5k+ order dots with nearest-point hit testing."],
                ["State & persistence", "A tiny external store (useSyncExternalStore) keeps range, lens, engine settings and investigation history in localStorage."],
              ].map(([t, b]) => (
                <li key={t} className="border-b border-ink py-4 sm:pr-6">
                  <h3 className="display text-[24px] leading-none">{t}</h3>
                  <p className="mt-1.5 text-[14px] leading-snug text-ink-soft">{b}</p>
                </li>
              ))}
            </ul>
          </div>
        </Chapter>

        <Chapter n="06" title="Product previews — live, not screenshots">
          <p className="mb-8 max-w-[60ch] text-[16px] leading-snug text-ink-soft">
            These are the production components rendering the case data in place. Hover and click them. Revenue shown: {inrCompact(first.net)} →{" "}
            {inrCompact(last.net)} a month.
          </p>
          <ProductPreviews />
          <div className="mt-12 flex flex-wrap items-center gap-4">
            <CTALink href="/investigation" variant="red" size="lg">
              Open the full investigation
            </CTALink>
            <CTALink href="/" variant="outline" size="lg">
              Back to the cover
            </CTALink>
          </div>
        </Chapter>
      </main>
      <SiteFooter />
    </>
  );
}

function Chapter({ n, title, children }: { n: string; title: string; children: ReactNode }) {
  return (
    <section className="border-b border-ink">
      <div className="flex items-center justify-between border-b border-ink px-4 py-3 sm:px-8">
        <span className="meta">{n} — {title}</span>
      </div>
      <div className="px-4 py-10 sm:px-8 lg:py-14">
        <h2 className="display mb-8 text-[13vw] leading-[0.82] sm:text-[9vw] lg:text-[5.4vw]">{title}</h2>
        {children}
      </div>
    </section>
  );
}

function Specimen({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="border-t border-ink pt-2">
      <span className="meta text-ink-soft">{label}</span>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function ArchitectureDiagram() {
  return (
    <div className="border border-ink bg-paper p-4 sm:p-6" role="img" aria-label="Investigator architecture: question, parser, handler, analytics over dataset, analysis result, optional Ollama narration">
      <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
        <div>
          <Box title="Question" sub="“Why is my profit declining?” + previous step (for follow-ups)" />
          <Down label="lib/ai/parse.ts" />
          <Box title="Rules parser" sub="ordered regex rules → intent · alias tables → product / month / channel / coupon" />
          <Down label="lib/ai/handlers.ts" />
          <Box title="Handler" sub="decides which metrics it needs; phrases only what the numbers support" tone="red" />
          <Down label="lib/analytics/*" />
          <Box title="Analytics over the dataset" sub="totals · profit bridge · line-level product margins · cohorts · suspicious-order rules" />
          <Down />
          <Box title="AnalysisResult" sub="steps · headline · figures · table · actions · evidence order ids · caveats" tone="blue" />
        </div>
        <div className="flex flex-col justify-end gap-2">
          <span className="meta text-ink-soft">Optional · user&apos;s machine</span>
          <Box title="Ollama" sub="re-words the facts; temperature 0.2; no new numbers" tone="dashed" />
          <Box title="Number check" sub="figures not found in the facts are flagged red" tone="dashed" />
        </div>
      </div>
      <p className="meta mt-4 text-signal">No paid API · no keys · nothing leaves the browser unless you point it at your own Ollama</p>
    </div>
  );
}

function Box({ title, sub, tone = "ink" }: { title: string; sub: string; tone?: "ink" | "red" | "blue" | "dashed" }) {
  return (
    <div
      className={`border-2 p-3 ${tone === "red" ? "border-signal" : tone === "blue" ? "border-electric bg-electric/5" : tone === "dashed" ? "border-dashed border-ink/60" : "border-ink bg-cream"}`}
    >
      <span className={`display block text-[22px] leading-none ${tone === "red" ? "text-signal" : tone === "blue" ? "text-electric" : ""}`}>{title}</span>
      <span className="mt-1 block font-mono text-[10.5px] leading-snug text-ink-soft">{sub}</span>
    </div>
  );
}

function Down({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 py-1.5 pl-6">
      <span className="font-mono text-[14px]">↓</span>
      {label && <span className="meta text-ink-soft">{label}</span>}
    </div>
  );
}
