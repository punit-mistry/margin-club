"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { CTALink, Logo } from "@/components/brand";

const LINKS = [
  { href: "/#case", label: "The Case", n: "01" },
  { href: "/#investigations", label: "Investigations", n: "02" },
  { href: "/#how", label: "How It Works", n: "03" },
];

export function SiteNav() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 border-b border-ink bg-cream/95 backdrop-blur-[2px]">
      <div className="flex h-14 items-center justify-between gap-4 px-4 sm:px-8">
        <Link href="/" className="text-[19px]" onClick={() => setOpen(false)}>
          <Logo />
        </Link>
        <span className="meta hidden text-ink-soft xl:block">A BombayCoder experimental product · Vol. 01</span>
        <nav className="hidden items-center gap-7 md:flex" aria-label="Primary">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="group meta flex items-baseline gap-1.5 hover:text-signal">
              <span className="text-[9px] text-ink-soft group-hover:text-signal">{l.n}</span>
              <span className="relative">
                {l.label}
                <span className="absolute -bottom-1 left-0 h-px w-0 bg-signal transition-all duration-300 group-hover:w-full" />
              </span>
            </Link>
          ))}
          <CTALink href="/investigation" variant="ink">
            Enter the case
          </CTALink>
        </nav>
        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center border border-ink md:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>
      {open && (
        <nav className="border-t border-ink bg-cream md:hidden" aria-label="Mobile">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="flex items-baseline justify-between border-b border-ink/20 px-4 py-4"
            >
              <span className="display text-[40px]">{l.label}</span>
              <span className="meta">{l.n}</span>
            </Link>
          ))}
          <div className="p-4">
            <CTALink href="/investigation" variant="red" size="lg" className="w-full justify-between">
              Enter the case
            </CTALink>
          </div>
        </nav>
      )}
    </header>
  );
}
