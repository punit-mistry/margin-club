import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

/* ------------------------------------------------------------------ */
/* Logo                                                                */
/* ------------------------------------------------------------------ */

export function Logo({ compact = false, className = "" }: { compact?: boolean; className?: string }) {
  return (
    <span className={`inline-flex items-baseline gap-[0.18em] leading-none select-none ${className}`} aria-label="Margin Club">
      <span className="display text-[1.55em] tracking-tight">Margin</span>
      <span aria-hidden className="relative -top-[0.05em] inline-block h-[0.42em] w-[0.42em] rotate-12 bg-signal" />
      {!compact && <span className="display text-[1.55em] tracking-tight">Club</span>}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Stamps & labels                                                     */
/* ------------------------------------------------------------------ */

export function Stamp({
  children,
  tone = "red",
  rotate = -6,
  className = "",
  animate = false,
}: {
  children: ReactNode;
  tone?: "red" | "blue" | "ink";
  rotate?: number;
  className?: string;
  animate?: boolean;
}) {
  const color = tone === "red" ? "text-signal border-signal" : tone === "blue" ? "text-electric border-electric" : "text-ink border-ink";
  return (
    <span
      style={{ ["--stamp-rot" as string]: `${rotate}deg`, transform: `rotate(${rotate}deg)` }}
      className={`inline-block border-2 px-2 py-[3px] font-mono text-[10.5px] font-bold uppercase leading-none tracking-[0.14em] mix-blend-multiply [mask-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='40'><filter id='r'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/><feComponentTransfer><feFuncA type='discrete' tableValues='1 1 1 0.35 1'/></feComponentTransfer></filter><rect width='100%' height='100%' filter='url(%23r)'/></svg>")] ${color} ${animate ? "animate-stamp" : ""} ${className}`}
    >
      {children}
    </span>
  );
}

export function Meta({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`meta ${className}`}>{children}</span>;
}

/** Small numbered evidence tag: ① style but rectangular, monospace. */
export function EvidenceTag({ n, tone = "red", className = "" }: { n: string | number; tone?: "red" | "blue" | "ink"; className?: string }) {
  const c = tone === "red" ? "bg-signal text-cream" : tone === "blue" ? "bg-electric text-cream" : "bg-ink text-cream";
  return <span className={`inline-flex h-[18px] min-w-[18px] items-center justify-center px-1 font-mono text-[10px] font-bold leading-none ${c} ${className}`}>{n}</span>;
}

/* ------------------------------------------------------------------ */
/* Hand-drawn marks (SVG)                                              */
/* ------------------------------------------------------------------ */

const ARROWS = {
  curve: "M4 46 C 30 6, 70 4, 104 26 M 92 14 L 105 27 L 88 33",
  down: "M30 4 C 8 30, 14 58, 38 78 M 26 72 L 39 80 L 42 65",
  loop: "M4 30 C 30 2, 58 2, 56 22 C 54 40, 30 38, 40 22 C 52 4, 84 10, 104 34 M 92 30 L 105 35 L 101 21",
  straight: "M4 20 C 40 16, 70 24, 104 18 M 94 10 L 105 18 L 93 26",
} as const;

export function HandArrow({
  variant = "curve",
  className = "",
  draw = true,
  strokeWidth = 2.2,
}: {
  variant?: keyof typeof ARROWS;
  className?: string;
  draw?: boolean;
  strokeWidth?: number;
}) {
  const box = variant === "down" ? "0 0 50 84" : variant === "straight" ? "0 0 110 40" : "0 0 110 50";
  return (
    <svg viewBox={box} className={className} fill="none" aria-hidden>
      <path
        d={ARROWS[variant]}
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={draw ? 1 : 0}
        className={draw ? "animate-draw" : ""}
      />
    </svg>
  );
}

/** A scribbled ellipse that sits around its parent (parent must be relative). */
export function HandCircle({ className = "", draw = true, delay = 0 }: { className?: string; draw?: boolean; delay?: number }) {
  return (
    <svg viewBox="0 0 200 100" preserveAspectRatio="none" className={`pointer-events-none absolute ${className}`} fill="none" aria-hidden>
      <path
        d="M 112 8 C 60 2, 8 18, 6 50 C 4 84, 70 96, 120 92 C 170 88, 196 68, 194 44 C 192 18, 150 4, 96 10 C 70 13, 48 20, 40 26"
        stroke="currentColor"
        strokeWidth={2.4}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={draw ? 1 : 0}
        style={{ animationDelay: `${delay}ms` }}
        className={draw ? "animate-draw" : ""}
      />
    </svg>
  );
}

export function HandUnderline({ className = "", draw = true }: { className?: string; draw?: boolean }) {
  return (
    <svg viewBox="0 0 200 12" preserveAspectRatio="none" className={`pointer-events-none ${className}`} fill="none" aria-hidden>
      <path
        d="M2 8 C 40 3, 80 10, 120 5 S 180 4, 198 7"
        stroke="currentColor"
        strokeWidth={2.4}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={draw ? 1 : 0}
        className={draw ? "animate-draw" : ""}
      />
    </svg>
  );
}

export function Note({ children, tone = "red", className = "", rotate = -3 }: { children: ReactNode; tone?: "red" | "blue" | "ink"; className?: string; rotate?: number }) {
  const c = tone === "red" ? "text-signal" : tone === "blue" ? "text-electric" : "text-ink";
  return (
    <span className={`hand text-[22px] ${/hidden/.test(className) ? "" : "inline-block"} ${c} ${className}`} style={{ transform: `rotate(${rotate}deg)` }}>
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Buttons                                                             */
/* ------------------------------------------------------------------ */

type CTAProps = { children: ReactNode; variant?: "ink" | "red" | "outline" | "cream"; size?: "md" | "lg"; className?: string };

function ctaClasses({ variant = "ink", size = "md", className = "" }: Omit<CTAProps, "children">) {
  const v =
    variant === "ink"
      ? "bg-ink text-cream border-ink hover:bg-electric hover:border-electric"
      : variant === "red"
        ? "bg-signal text-cream border-signal hover:bg-ink hover:border-ink"
        : variant === "cream"
          ? "bg-cream text-ink border-cream hover:bg-signal hover:border-signal hover:text-cream"
          : "bg-transparent text-ink border-ink hover:bg-ink hover:text-cream";
  const s = size === "lg" ? "px-6 py-4 text-[13px]" : "px-4 py-2.5 text-[11.5px]";
  return `group/cta inline-flex items-center gap-3 border-[1.5px] font-mono font-bold uppercase tracking-[0.12em] transition-colors duration-200 ${v} ${s} ${className}`;
}

function Arrow() {
  return (
    <span aria-hidden className="inline-block transition-transform duration-300 ease-[var(--ease-editorial)] group-hover/cta:translate-x-1.5">
      →
    </span>
  );
}

export function CTALink({ href, children, arrow = true, ...rest }: CTAProps & { href: ComponentProps<typeof Link>["href"]; arrow?: boolean }) {
  return (
    <Link href={href} className={ctaClasses(rest)}>
      <span>{children}</span>
      {arrow && <Arrow />}
    </Link>
  );
}

export function CTAButton({
  children,
  arrow = false,
  onClick,
  type = "button",
  disabled,
  title,
  ...rest
}: CTAProps & { arrow?: boolean; onClick?: () => void; type?: "button" | "submit"; disabled?: boolean; title?: string }) {
  return (
    <button type={type} onClick={onClick} disabled={disabled} title={title} className={`${ctaClasses(rest)} disabled:cursor-not-allowed disabled:opacity-40`}>
      <span>{children}</span>
      {arrow && <Arrow />}
    </button>
  );
}

/** Square icon button used in the workspace chrome. */
export function IconButton({
  label,
  onClick,
  children,
  active = false,
  className = "",
}: {
  label: string;
  onClick?: () => void;
  children: ReactNode;
  active?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`inline-flex h-8 min-w-8 items-center justify-center gap-1.5 border border-ink px-2 transition-colors ${active ? "bg-ink text-cream" : "hover:bg-ink hover:text-cream"} ${className}`}
    >
      {children}
    </button>
  );
}
