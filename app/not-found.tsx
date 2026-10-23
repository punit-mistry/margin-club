import type { Metadata } from "next";
import Link from "next/link";
import { CTALink, HandArrow, HandCircle, Note, Stamp } from "@/components/brand";
import { SiteFooter } from "@/components/landing/final-cta";
import { SiteNav } from "@/components/landing/site-nav";
import { NotFoundPath } from "@/components/not-found-path";

export const metadata: Metadata = {
  title: "404 — Evidence not found",
  description: "This page isn't in the books.",
};

const LEADS = [
  { href: "/", n: "01", title: "Back to the cover", note: "Your sales are up. So why are you broke?" },
  { href: "/investigation", n: "02", title: "Open Case #001", note: "The Discount Trap investigation workspace." },
  { href: "/case-study", n: "03", title: "Read the case study", note: "How MARGIN CLUB was designed and built." },
];

export default function NotFound() {
  return (
    <>
      <SiteNav />
      <main>
        <section className="relative overflow-hidden border-b border-ink">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink px-4 py-3 sm:px-8">
            <span className="meta flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 bg-signal" /> Error 404 · Evidence not found
            </span>
            <span className="meta text-ink-soft">Status: not in the ledger</span>
          </div>

          <div className="relative px-3 pt-6 sm:px-6">
            <h1 className="display text-[46vw] leading-[0.78] sm:text-[40vw]" aria-label="404">
              4
              <span className="relative inline-block text-signal">
                0
                <HandCircle className="-inset-x-[4vw] -inset-y-[2vw] h-[calc(100%+4vw)] w-[calc(100%+8vw)] text-ink [&_path]:[animation-delay:500ms]" />
              </span>
              4
            </h1>
            <div className="absolute top-[12%] right-[5%] hidden flex-col items-end gap-3 sm:flex">
              <Stamp rotate={8} animate className="text-[13px]">
                File missing
              </Stamp>
              <Stamp tone="ink" rotate={-4} animate className="text-[11px] [animation-delay:200ms]">
                Case not closed
              </Stamp>
            </div>
          </div>

          <div className="grid gap-8 border-t border-ink px-4 py-8 sm:px-8 lg:grid-cols-12">
            <div className="lg:col-span-6">
              <h2 className="display text-[14vw] leading-[0.84] sm:text-[8vw] lg:text-[5.6vw]">
                This page isn&apos;t <span className="text-signal">in the books.</span>
              </h2>
              <p className="serif-italic mt-4 text-[26px] leading-tight text-ink-soft">
                Revenue: zero. Profit: zero. At least the margin is consistent.
              </p>
            </div>

            <div className="relative lg:col-span-6">
              <dl className="border border-ink bg-cream font-mono text-[12px] shadow-[6px_6px_0_#161616]">
                {[
                  ["Requested", <NotFoundPath key="p" />],
                  ["Status", "404 · not in the ledger"],
                  ["Last seen", "never"],
                  ["Suspects", "a typo, an old link, or a page that was never filed"],
                ].map(([k, v], i) => (
                  <div key={i} className="grid grid-cols-[110px_1fr] gap-3 border-b border-ink/20 px-4 py-2.5 last:border-b-0">
                    <dt className="uppercase tracking-[0.08em] text-ink-soft">{k}</dt>
                    <dd className={`break-all ${i === 0 ? "font-bold text-signal" : ""}`}>{v}</dd>
                  </div>
                ))}
              </dl>
              <Note className="absolute -top-9 right-4 hidden text-[24px] sm:block" rotate={-4}>
                follow a real lead instead ↓
              </Note>
            </div>
          </div>
        </section>

        <section className="border-b border-ink">
          <div className="flex items-center justify-between border-b border-ink px-4 py-3 sm:px-8">
            <span className="meta">Open leads</span>
            <HandArrow variant="straight" className="h-5 w-16 text-signal" draw={false} />
          </div>
          <ol>
            {LEADS.map((l) => (
              <li key={l.href} className="border-b border-ink last:border-b-0">
                <Link
                  href={l.href}
                  className="group grid grid-cols-[44px_minmax(0,1fr)_auto] items-baseline gap-x-4 gap-y-1 px-4 py-5 transition-colors hover:bg-ink hover:text-cream sm:grid-cols-[64px_minmax(0,1fr)_auto] sm:px-8"
                >
                  <span className="meta text-signal">{l.n}</span>
                  <span className="display text-[34px] sm:text-[52px]">{l.title}</span>
                  <span aria-hidden className="text-[26px] transition-transform duration-300 group-hover:translate-x-2">→</span>
                  <span />
                  <span className="text-[15px] text-ink-soft group-hover:text-cream/80">{l.note}</span>
                </Link>
              </li>
            ))}
          </ol>
          <div className="px-4 py-8 sm:px-8">
            <CTALink href="/investigation" variant="red" size="lg">
              Investigate case #001
            </CTALink>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
