import Link from "next/link";
import { CTALink, HandArrow, Logo, Note } from "@/components/brand";

export function FinalCTA() {
  return (
    <section className="relative overflow-hidden border-b border-ink">
      <div className="px-3 pt-10 sm:px-6">
        <span className="meta block px-1">06 — Verdict pending</span>
        <h2 className="display mt-4 text-[24vw] leading-[0.78]">
          Close
          <br />
          <span className="pl-[12vw]">the case<span className="text-signal">.</span></span>
        </h2>
      </div>
      <div className="flex flex-col items-start gap-6 px-4 pt-8 pb-14 sm:flex-row sm:items-end sm:justify-between sm:px-8">
        <p className="max-w-[40ch] text-[18px] leading-snug">
          Case #001 is open. The exhibits are pinned, the investigator is waiting, and the books haven&apos;t been touched.
        </p>
        <div className="relative">
          <Note className="absolute -top-14 -left-24 hidden text-[24px] sm:block" rotate={-6}>
            start here
          </Note>
          <HandArrow variant="curve" className="absolute -top-10 -left-14 hidden h-10 w-16 rotate-[25deg] text-signal sm:block" draw={false} />
          <CTALink href="/investigation" variant="red" size="lg">
            Enter the case
          </CTALink>
        </div>
      </div>
    </section>
  );
}

export function SiteFooter() {
  return (
    <footer className="grid gap-8 px-4 py-10 sm:px-8 lg:grid-cols-12">
      <div className="lg:col-span-4">
        <span className="text-[26px]">
          <Logo />
        </span>
        <p className="meta mt-3 text-ink-soft">The Business Detective</p>
      </div>
      <p className="max-w-[60ch] text-[14px] leading-snug text-ink-soft lg:col-span-5">
        MARGIN CLUB is a fictional concept product designed and built by BombayCoder to explore creative direction, interactive storytelling and
        transparent analytics. Ordinary Objects, its customers and every figure on this site are generated demo data — no real business is
        depicted.
      </p>
      <nav className="flex flex-col gap-2 lg:col-span-3 lg:items-end" aria-label="Footer">
        <Link href="/investigation" className="meta hover:text-signal">Investigation workspace →</Link>
        <Link href="/case-study" className="meta hover:text-signal">BombayCoder case study →</Link>
        <Link href="/#how" className="meta hover:text-signal">How it works →</Link>
      </nav>
    </footer>
  );
}
